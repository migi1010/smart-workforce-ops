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
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    // Taiwan calendar boundaries in UTC
    const { start, end } = getTaiwanMonthRange(year, month);

    // Fetch employees list
    const employeesList = await db.employee.findMany({
      where: employeeId ? { id: employeeId } : {},
      select: {
        id: true,
        name: true,
        employeeCode: true,
        hourlyRate: true,
      },
    });

    const calculatedEmployees = await Promise.all(
      employeesList.map(async (emp) => {
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

    // Sort: highest salary first
    calculatedEmployees.sort((a, b) => b.monthlySalary - a.monthlySalary);

    // Centralized calculations
    const summary = calculatePayrollSummary(calculatedEmployees);

    // -------------------------------------------------------------
    // SHEET 1: 薪資總表
    // -------------------------------------------------------------
    const sheet1Headers = ["員工編號", "員工姓名", "時薪 (NTD)", "出勤天數", "本月總工時", "本月薪資 (NTD)"];
    const sheet1Rows = calculatedEmployees.map((emp) => [
      emp.employeeCode,
      emp.employeeName,
      emp.hourlyRate,
      emp.totalDays,
      emp.totalHours,
      emp.monthlySalary,
    ]);
    const ws1 = XLSX.utils.aoa_to_sheet([sheet1Headers, ...sheet1Rows]);
    ws1["!cols"] = [
      { wch: 12 }, // 員工編號
      { wch: 15 }, // 員工姓名
      { wch: 12 }, // 時薪 (NTD)
      { wch: 10 }, // 出勤天數
      { wch: 12 }, // 本月總工時
      { wch: 15 }, // 本月薪資 (NTD)
    ];

    // -------------------------------------------------------------
    // SHEET 2: 出勤明細
    // -------------------------------------------------------------
    const sheet2Headers = ["日期", "員工編號", "員工姓名", "上班時間", "下班時間", "工時 (小時)", "出勤狀態", "備註"];
    const sheet2Rows: any[][] = [];

    calculatedEmployees.forEach((emp) => {
      emp.records.forEach((r) => {
        // Date format: YYYY-MM-DD
        const dateStr = r.date.toISOString().split("T")[0];

        // Format clock times in Taiwan local timezone (+8h)
        const formatTimeStr = (dt: Date | null) => {
          if (!dt) return "未打卡";
          const twDate = new Date(dt.getTime() + 8 * 60 * 60 * 1000);
          return twDate.toISOString().slice(11, 16); // HH:mm
        };

        const getStatusText = (status: string) => {
          switch (status) {
            case "NORMAL": return "正常";
            case "LATE": return "遲到";
            case "EARLY_LEAVE": return "早退";
            case "ABSENT": return "缺勤";
            case "LEAVE": return "請假";
            default: return status;
          }
        };

        sheet2Rows.push([
          dateStr,
          emp.employeeCode,
          emp.employeeName,
          formatTimeStr(r.clockInTime),
          formatTimeStr(r.clockOutTime),
          r.totalHours !== null ? Number(r.totalHours.toFixed(2)) : 0,
          getStatusText(r.status),
          r.note || "",
        ]);
      });
    });
    const ws2 = XLSX.utils.aoa_to_sheet([sheet2Headers, ...sheet2Rows]);
    ws2["!cols"] = [
      { wch: 12 }, // 日期
      { wch: 12 }, // 員工編號
      { wch: 15 }, // 員工姓名
      { wch: 12 }, // 上班時間
      { wch: 12 }, // 下班時間
      { wch: 12 }, // 工時 (小時)
      { wch: 12 }, // 出勤狀態
      { wch: 25 }, // 備註
    ];

    // -------------------------------------------------------------
    // SHEET 3: 摘要
    // -------------------------------------------------------------
    const exportTimeStr = new Date(new Date().getTime() + 8 * 60 * 60 * 1000)
      .toISOString()
      .replace("T", " ")
      .slice(0, 19);

    const sheet3Rows = [
      ["項目", "數值"],
      ["年份", `${year} 年`],
      ["月份", `${month} 月`],
      ["本月總薪資 (NTD)", summary.totalPayrollCost],
      ["總工時 (小時)", summary.totalHours],
      ["員工人數", summary.employeeCount],
      ["平均薪資 (NTD)", summary.averageSalary],
      ["匯出時間 (台北時間)", exportTimeStr],
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(sheet3Rows);
    ws3["!cols"] = [
      { wch: 25 }, // 項目
      { wch: 25 }, // 數值
    ];

    // -------------------------------------------------------------
    // Pack Workbook
    // -------------------------------------------------------------
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, "薪資總表");
    XLSX.utils.book_append_sheet(wb, ws2, "出勤明細");
    XLSX.utils.book_append_sheet(wb, ws3, "摘要");

    // Write binary buffer
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // Determine filename
    const filename = employeeId && employeesList.length > 0
      ? `三峽八方雲集國際店_薪資報表_${employeesList[0].name}_${year}_${String(month).padStart(2, "0")}.xlsx`
      : `三峽八方雲集國際店_薪資報表_${year}_${String(month).padStart(2, "0")}.xlsx`;

    // Construct headers with URL encoding to support Chinese filenames safely
    const headers = new Headers();
    headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    headers.set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    return new NextResponse(buf, { status: 200, headers });
  } catch (error) {
    console.error("GET Admin Payroll Export API Error:", error);
    return NextResponse.json({ error: "伺服器內部錯誤" }, { status: 500 });
  }
}
