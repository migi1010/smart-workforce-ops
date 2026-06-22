"use client";

import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Users, 
  Clock, 
  Coins, 
  AlertCircle, 
  Filter, 
  Loader2, 
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  FileText
} from "lucide-react";

interface Employee {
  id: string;
  name: string;
  employeeCode: string;
}

interface PayrollSummary {
  totalPayrollCost: number;
  totalHours: number;
  employeeCount: number;
  averageSalary: number;
}

interface EmployeePayroll {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  hourlyRate: number;
  totalDays: number;
  totalHours: number;
  monthlySalary: number;
}

interface DailyRecord {
  id: string;
  date: string;
  clockInTime: string | null;
  clockOutTime: string | null;
  totalHours: number | null;
  status: "NORMAL" | "LATE" | "EARLY_LEAVE" | "ABSENT" | "LEAVE";
  note: string | null;
}

export default function PayrollPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [payrollList, setPayrollList] = useState<EmployeePayroll[]>([]);
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [breakdownLoading, setBreakdownLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [exportingAll, setExportingAll] = useState<boolean>(false);
  const [exportingSingle, setExportingSingle] = useState<boolean>(false);

  // Filter States
  const [filterYear, setFilterYear] = useState<number>(2026);
  const [filterMonth, setFilterMonth] = useState<number>(6);
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>(""); // empty represents All Employees

  // Year choices
  const years = [2024, 2025, 2026, 2027, 2028];
  // Month choices
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // Initialize filters with current Taiwan local calendar date on mount
  useEffect(() => {
    const now = new Date();
    // Shift by +8 hours for Taiwan offset
    const twDate = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    setFilterYear(twDate.getUTCFullYear());
    setFilterMonth(twDate.getUTCMonth() + 1);
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/admin/employees");
      const result = await res.json();
      if (res.ok) {
        setEmployees(result.employees || []);
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const fetchPayroll = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        year: filterYear.toString(),
        month: filterMonth.toString(),
      });
      // Do not append employeeId to main request if it is empty, to fetch all
      if (filterEmployeeId) {
        queryParams.set("employeeId", filterEmployeeId);
      }

      const res = await fetch(`/api/admin/payroll?${queryParams.toString()}`);
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "無法取得薪資報表");
      }

      setSummary(result.summary);
      setPayrollList(result.employees || []);
      
      // If a specific employee is selected, update dailyRecords immediately
      if (filterEmployeeId) {
        setDailyRecords(result.dailyRecords || []);
      } else {
        setDailyRecords([]); // Clear breakdown if All is selected
      }
    } catch (err: any) {
      setError(err.message || "載入薪資報表時發生錯誤");
    } finally {
      setLoading(false);
    }
  };

  // Fetch breakdown manually when an employee row is clicked (in All Employees view)
  const fetchEmployeeBreakdown = async (empId: string) => {
    setBreakdownLoading(true);
    try {
      const queryParams = new URLSearchParams({
        year: filterYear.toString(),
        month: filterMonth.toString(),
        employeeId: empId,
      });
      const res = await fetch(`/api/admin/payroll?${queryParams.toString()}`);
      const result = await res.json();
      if (res.ok) {
        setDailyRecords(result.dailyRecords || []);
      }
    } catch (err) {
      console.error("Error fetching employee breakdown:", err);
    } finally {
      setBreakdownLoading(false);
    }
  };

  const handleExport = async (isSingle: boolean) => {
    if (isSingle) {
      setExportingSingle(true);
    } else {
      setExportingAll(true);
    }
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        year: filterYear.toString(),
        month: filterMonth.toString(),
      });
      if (isSingle && filterEmployeeId) {
        queryParams.set("employeeId", filterEmployeeId);
      }

      const res = await fetch(`/api/admin/payroll/export?${queryParams.toString()}`);
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        throw new Error(result.error || "匯出 Excel 失敗");
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = isSingle && selectedEmployeeName
        ? `三峽八方雲集國際店_薪資報表_${selectedEmployeeName}_${filterYear}_${String(filterMonth).padStart(2, "0")}.xlsx`
        : `三峽八方雲集國際店_薪資報表_${filterYear}_${String(filterMonth).padStart(2, "0")}.xlsx`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = decodeURIComponent(filenameMatch[1]);
        } else {
          const legacyMatch = contentDisposition.match(/filename="?([^";]+)"?/);
          if (legacyMatch && legacyMatch[1]) {
            filename = legacyMatch[1];
          }
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "匯出 Excel 時發生錯誤");
    } finally {
      if (isSingle) {
        setExportingSingle(false);
      } else {
        setExportingAll(false);
      }
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Fetch main payroll table when year/month/employee filter changes
  useEffect(() => {
    fetchPayroll();
  }, [filterYear, filterMonth, filterEmployeeId]);

  const handleRowClick = (empId: string) => {
    // If not currently filtering by a single employee, fetch their breakdown on row click
    if (!filterEmployeeId) {
      setFilterEmployeeId(empId);
    }
  };

  const formatTaiwanDate = (dateString: string) => {
    const d = new Date(dateString);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const date = String(d.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${date}`;
  };

  const formatTaiwanTime = (dateString: string | null) => {
    if (!dateString) return "未打卡";
    const date = new Date(dateString);
    const twDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    return twDate.toISOString().slice(11, 16); // e.g. "09:00"
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

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "NORMAL":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25";
      case "LATE":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/25";
      case "EARLY_LEAVE":
        return "bg-orange-500/10 text-orange-400 border border-orange-500/25";
      case "ABSENT":
        return "bg-red-500/10 text-red-400 border border-red-500/25";
      case "LEAVE":
        return "bg-blue-500/10 text-blue-400 border border-blue-500/25";
      default:
        return "bg-slate-800 text-slate-400 border border-slate-700";
    }
  };

  // Find currently selected employee object
  const selectedEmployeeName = employees.find(e => e.id === filterEmployeeId)?.name;

  return (
    <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 md:p-8 rounded-2xl glass-card relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-2xl -z-10" />
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-amber-200 to-red-400 bg-clip-text text-transparent">
              薪資發放與月報表
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              依據員工時薪與核定工時自動進行薪資結算，檢視單月總人事費用，並核對每日詳細打卡紀錄。
            </p>
          </div>
        </div>
      </div>

      {/* Filters Form */}
      <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-4">
        <h2 className="text-xs font-bold text-slate-400 tracking-wider flex items-center gap-1.5 uppercase">
          <Filter className="w-4 h-4 text-amber-500" />
          薪資統計期間與篩選
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Year Switcher */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500">年份 (Year)</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(parseInt(e.target.value, 10))}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500/50 font-bold"
            >
              {years.map(y => (
                <option key={y} value={y}>{y} 年</option>
              ))}
            </select>
          </div>

          {/* Month Switcher */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500">月份 (Month)</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(parseInt(e.target.value, 10))}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500/50 font-bold"
            >
              {months.map(m => (
                <option key={m} value={m}>{m} 月</option>
              ))}
            </select>
          </div>

          {/* Employee Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500">員工選擇 (Employee)</label>
            <select
              value={filterEmployeeId}
              onChange={(e) => setFilterEmployeeId(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500/50 font-bold"
            >
              <option value="">全部員工 (All Employees)</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employeeCode})
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Export Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-800/60">
          <button
            onClick={() => handleExport(false)}
            disabled={loading || exportingAll || exportingSingle}
            className="flex items-center justify-center gap-2 bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 active:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold text-slate-200 px-4 py-2.5 rounded-xl transition-all"
          >
            {exportingAll ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
            ) : (
              <FileText className="w-4 h-4 text-amber-500" />
            )}
            匯出全員薪資 Excel
          </button>
          
          <button
            onClick={() => handleExport(true)}
            disabled={loading || exportingAll || exportingSingle || !filterEmployeeId}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 border border-amber-500/30 hover:border-amber-500/40 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold text-amber-400 px-4 py-2.5 rounded-xl transition-all"
          >
            {exportingSingle ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
            ) : (
              <FileText className="w-4 h-4 text-amber-500" />
            )}
            匯出選定員工 Excel
          </button>
        </div>
      </div>

      {/* Summary Cards Grid */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Total Payroll cost */}
          <div className="p-6 rounded-2xl glass-card border border-slate-800/80">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-400 tracking-wider">本月總人事薪資</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Coins className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-100 font-mono">
              NT$ {summary.totalPayrollCost.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-500 mt-1 font-medium">合計發放人事薪資總額</p>
          </div>

          {/* Card 2: Total Hours */}
          <div className="p-6 rounded-2xl glass-card border border-slate-800/80">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-400 tracking-wider">本月核定總工時</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-100 font-mono">
              {summary.totalHours.toFixed(2)} <span className="text-xs text-slate-400 font-bold">小時</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-1 font-medium">累計支付薪資的總工時數</p>
          </div>

          {/* Card 3: Employee Count */}
          <div className="p-6 rounded-2xl glass-card border border-slate-800/80">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-400 tracking-wider">統計發放員工人數</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-100 font-mono">
              {summary.employeeCount} <span className="text-xs text-slate-400 font-bold">人</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-1 font-medium">本月計薪範圍內的員工人數</p>
          </div>

          {/* Card 4: Average Salary */}
          <div className="p-6 rounded-2xl glass-card border border-slate-800/80">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-400 tracking-wider">本月平均薪資</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-100 font-mono">
              NT$ {summary.averageSalary.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-500 mt-1 font-medium">人事總薪資 / 計薪員工人數</p>
          </div>

        </div>
      )}

      {/* Main Content Layout */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500 font-semibold">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mr-2.5" />
          計算發放薪資與彙整數據中...
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Left/Main Column: Payroll Table */}
          <div className="xl:col-span-2 space-y-6">
            <div className="p-6 rounded-2xl glass-card border border-slate-800/80 overflow-hidden shadow-2xl">
              <h2 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                <Coins className="w-4 h-4 text-amber-500" />
                薪資結算清單 (依本月薪水高低排序)
              </h2>
              
              {payrollList.length === 0 ? (
                <p className="text-xs text-slate-500 py-12 text-center">本月暫無可計薪之出勤紀錄</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-3.5 px-4">員工編號</th>
                        <th className="py-3.5 px-4">員工姓名</th>
                        <th className="py-3.5 px-4 text-right">員工時薪</th>
                        <th className="py-3.5 px-4 text-right">出勤天數</th>
                        <th className="py-3.5 px-4 text-right">本月總工時</th>
                        <th className="py-3.5 px-4 text-right">本月薪資 (NTD)</th>
                        <th className="py-3.5 px-4 text-right">明細</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {payrollList.map((row) => (
                        <tr 
                          key={row.employeeId} 
                          onClick={() => handleRowClick(row.employeeId)}
                          className={`hover:bg-slate-900/20 transition-colors text-slate-300 cursor-pointer group ${
                            filterEmployeeId === row.employeeId ? "bg-slate-900/40 border border-amber-500/20" : ""
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-semibold text-slate-400">{row.employeeCode}</td>
                          <td className="py-3 px-4 font-bold text-slate-200">{row.employeeName}</td>
                          <td className="py-3 px-4 text-right font-mono">NT$ {row.hourlyRate}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-300">{row.totalDays} 天</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-300">{row.totalHours.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-mono font-black text-slate-100 group-hover:text-amber-400 transition-colors">
                            NT$ {row.monthlySalary.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all inline" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Daily Breakdown */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl glass-card border border-slate-800/80">
              <h2 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                <FileText className="w-4 h-4 text-amber-500" />
                出勤工時明細日報表
              </h2>
              
              {!filterEmployeeId ? (
                <div className="text-center py-16 px-4 text-slate-500 space-y-2">
                  <AlertCircle className="w-8 h-8 text-slate-700 mx-auto" />
                  <p className="text-xs font-semibold">請點選左側員工列，或在上方選擇單一員工</p>
                  <p className="text-[10px] text-slate-600">選擇後將顯示該名員工在此月份的每日打卡與核定工時明細。</p>
                </div>
              ) : breakdownLoading ? (
                <div className="flex items-center justify-center py-16 text-slate-500 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-500 mr-2" />
                  載入員工出勤明細中...
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Selected Header */}
                  <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-950/40 border border-slate-900">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">正在檢視明細</span>
                      <span className="text-xs font-bold text-slate-200">{selectedEmployeeName} 的出勤日誌</span>
                    </div>
                    <button
                      onClick={() => setFilterEmployeeId("")}
                      className="text-[10px] font-bold text-slate-500 hover:text-amber-500 flex items-center gap-0.5"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      返回全部
                    </button>
                  </div>

                  {/* List Daily Breakdown */}
                  {dailyRecords.length === 0 ? (
                    <p className="text-xs text-slate-500 py-12 text-center">本月查無任何打卡與出勤紀錄</p>
                  ) : (
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                      {dailyRecords.map((rec) => (
                        <div key={rec.id} className="p-3 rounded-xl bg-slate-950/50 border border-slate-900 text-xs space-y-2">
                          <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                            <span className="font-bold text-slate-300 font-mono">{formatTaiwanDate(rec.date)}</span>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${getStatusBadgeClass(rec.status)}`}>
                              {getStatusText(rec.status)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-mono">
                            <div>上班：{formatTaiwanTime(rec.clockInTime)}</div>
                            <div>下班：{formatTaiwanTime(rec.clockOutTime)}</div>
                            <div className="col-span-2 font-bold text-slate-300">
                              當日核計工時：
                              <span className="text-slate-100 font-extrabold text-xs">
                                {rec.totalHours !== null ? `${rec.totalHours.toFixed(2)} 小時` : "0.00"}
                              </span>
                            </div>
                            {rec.note && (
                              <div className="col-span-2 text-slate-500 font-sans leading-normal italic">
                                備註：{rec.note}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
