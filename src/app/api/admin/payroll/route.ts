import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionAdmin } from "@/lib/auth";
import { getTaiwanMonthRange } from "@/lib/date";
import { 
  calculateEmployeeMonthlyHours, 
  calculateEmployeeMonthlySalary, 
  calculateWorkedDays, 
  calculatePayrollSummary 
} from "@/lib/payroll";

export async function GET(request: NextRequest) {
  try {
    const admin = await getSessionAdmin();
    if (!admin) {
      return NextResponse.json({ error: "未授權訪問" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");
    const employeeId = searchParams.get("employeeId") || undefined;

    if (!yearParam || !monthParam) {
      return NextResponse.json({ error: "缺少年份或月份參數" }, { status: 400 });
    }

    const year = parseInt(yearParam, 10);
    const month = parseInt(monthParam, 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "無效的年份或月份參數" }, { status: 400 });
    }

    // Calculate month boundary in Taiwan timezone
    const { start, end } = getTaiwanMonthRange(year, month);

    // Fetch list of employees (all if not filtered, or only the selected one)
    const employeesList = await db.employee.findMany({
      where: employeeId ? { id: employeeId } : {},
      select: {
        id: true,
        name: true,
        employeeCode: true,
        hourlyRate: true,
        isActive: true,
      },
    });

    const calculatedEmployees = await Promise.all(
      employeesList.map(async (emp) => {
        // Fetch all attendance records in the month boundary
        const records = await db.attendanceRecord.findMany({
          where: {
            employeeId: emp.id,
            date: {
              gte: start,
              lte: end,
            },
          },
          orderBy: {
            date: "asc",
          },
        });

        const totalHours = calculateEmployeeMonthlyHours(records);
        const monthlySalary = calculateEmployeeMonthlySalary(totalHours, emp.hourlyRate);
        const totalDays = calculateWorkedDays(records);

        return {
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          employeeName: emp.name,
          hourlyRate: emp.hourlyRate,
          totalDays,
          totalHours,
          monthlySalary,
          records,
        };
      })
    );

    // Sort employees by monthlySalary descending (highest salary first)
    calculatedEmployees.sort((a, b) => b.monthlySalary - a.monthlySalary);

    // Calculate centralized payroll summary
    const summary = calculatePayrollSummary(calculatedEmployees);

    // Build the employee payload
    const employeesPayload = calculatedEmployees.map((emp) => ({
      employeeId: emp.employeeId,
      employeeCode: emp.employeeCode,
      employeeName: emp.employeeName,
      hourlyRate: emp.hourlyRate,
      totalDays: emp.totalDays,
      totalHours: emp.totalHours,
      monthlySalary: emp.monthlySalary,
    }));

    // If an employeeId is specified, return their daily records breakdown
    let dailyRecordsPayload: any[] = [];
    if (employeeId && calculatedEmployees.length > 0) {
      dailyRecordsPayload = calculatedEmployees[0].records.map((r) => ({
        id: r.id,
        date: r.date.toISOString(),
        clockInTime: r.clockInTime ? r.clockInTime.toISOString() : null,
        clockOutTime: r.clockOutTime ? r.clockOutTime.toISOString() : null,
        totalHours: r.totalHours,
        status: r.status,
        note: r.note,
      }));
    }

    return NextResponse.json({
      summary,
      employees: employeesPayload,
      dailyRecords: dailyRecordsPayload,
    });
  } catch (error) {
    console.error("GET Admin Payroll API Error:", error);
    return NextResponse.json({ error: "伺服器內部錯誤" }, { status: 500 });
  }
}
