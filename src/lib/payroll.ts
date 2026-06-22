/**
 * Centralized service for payroll and monthly salary calculations.
 */

export interface MinimalAttendanceRecord {
  clockInTime: Date | null;
  clockOutTime: Date | null;
  totalHours: number | null;
  status: "NORMAL" | "LATE" | "EARLY_LEAVE" | "ABSENT" | "LEAVE";
}

/**
 * Filter helper to determine if an attendance record qualifies as a paid working record.
 * Paid statuses: NORMAL, LATE, EARLY_LEAVE.
 * Must have clockInTime, clockOutTime, and totalHours populated.
 */
export function isPaidWorkRecord(record: MinimalAttendanceRecord): boolean {
  return (
    record.clockInTime !== null &&
    record.clockOutTime !== null &&
    record.totalHours !== null &&
    ["NORMAL", "LATE", "EARLY_LEAVE"].includes(record.status)
  );
}

/**
 * Calculates the total paid hours from a list of attendance records for an employee.
 * Excludes ABSENT and LEAVE.
 */
export function calculateEmployeeMonthlyHours(records: MinimalAttendanceRecord[]): number {
  const total = records
    .filter(isPaidWorkRecord)
    .reduce((sum, record) => sum + (record.totalHours || 0), 0);
  
  // Round to 2 decimal places to avoid float precision issues
  return Math.round(total * 100) / 100;
}

/**
 * Calculates the monthly salary NTD (rounded to integer) from paid hours and hourly rate.
 */
export function calculateEmployeeMonthlySalary(totalHours: number, hourlyRate: number): number {
  return Math.round(totalHours * hourlyRate);
}

/**
 * Calculates the total number of worked days (where employee successfully clocked in/out and status is paid).
 */
export function calculateWorkedDays(records: MinimalAttendanceRecord[]): number {
  return records.filter(isPaidWorkRecord).length;
}

export interface EmployeeSalaryCalculation {
  totalHours: number;
  monthlySalary: number;
}

export interface PayrollSummary {
  totalPayrollCost: number;
  totalHours: number;
  employeeCount: number;
  averageSalary: number;
}

/**
 * Computes the centralized payroll summary for all active calculated employee records.
 */
export function calculatePayrollSummary(calculations: EmployeeSalaryCalculation[]): PayrollSummary {
  const employeeCount = calculations.length;
  if (employeeCount === 0) {
    return {
      totalPayrollCost: 0,
      totalHours: 0,
      employeeCount: 0,
      averageSalary: 0,
    };
  }

  const totalPayrollCost = calculations.reduce((sum, calc) => sum + calc.monthlySalary, 0);
  const totalHours = calculations.reduce((sum, calc) => sum + calc.totalHours, 0);
  const averageSalary = Math.round(totalPayrollCost / employeeCount);

  return {
    totalPayrollCost,
    totalHours: Math.round(totalHours * 100) / 100,
    employeeCount,
    averageSalary,
  };
}
