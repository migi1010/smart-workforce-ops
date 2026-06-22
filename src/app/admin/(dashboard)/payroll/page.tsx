"use client";

import React, { useState, useEffect } from "react";
import { 
  Coins, 
  Clock, 
  Users, 
  TrendingUp, 
  AlertCircle, 
  Filter, 
  Loader2, 
  FileText, 
  ChevronRight, 
  ArrowLeft
} from "lucide-react";

interface Employee {
  id: string;
  name: string;
  employeeCode: string;
}

interface PayrollRow {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  hourlyRate: number;
  totalDays: number;
  totalHours: number;
  monthlySalary: number;
}

interface PayrollSummary {
  totalPayrollCost: number;
  totalHours: number;
  employeeCount: number;
  averageSalary: number;
}

interface DailyRecordBreakdown {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter params
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1);
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>("");

  // Calculated Results
  const [payrollList, setPayrollList] = useState<PayrollRow[]>([]);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);

  // Daily Breakdown state
  const [dailyRecords, setDailyRecords] = useState<DailyRecordBreakdown[]>([]);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  // Export states
  const [exportingAll, setExportingAll] = useState(false);
  const [exportingSingle, setExportingSingle] = useState(false);

  const years = [2024, 2025, 2026, 2027, 2028];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // Fetch employees on mount
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

  // Fetch Payroll Statistics
  const calculatePayroll = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        year: filterYear.toString(),
        month: filterMonth.toString(),
      });
      if (filterEmployeeId) {
        queryParams.set("employeeId", filterEmployeeId);
      }

      const res = await fetch(`/api/admin/payroll?${queryParams.toString()}`);
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "薪資計算失敗");
      }

      setPayrollList(result.payrollList || []);
      setSummary(result.summary || null);
    } catch (err: any) {
      setError(err.message || "薪資計算時發生錯誤");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Daily Breakdown for selected employee
  const fetchDailyBreakdown = async (empId: string) => {
    setBreakdownLoading(true);
    try {
      const res = await fetch(`/api/admin/payroll/breakdown?employeeId=${empId}&year=${filterYear}&month=${filterMonth}`);
      const result = await res.json();
      if (res.ok) {
        setDailyRecords(result.dailyRecords || []);
      } else {
        throw new Error(result.error || "無法取得明細");
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setBreakdownLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    calculatePayroll();
    // Reset breakdown when filters change
    if (filterEmployeeId) {
      fetchDailyBreakdown(filterEmployeeId);
    } else {
      setDailyRecords([]);
    }
  }, [filterYear, filterMonth, filterEmployeeId]);

  const handleRowClick = (empId: string) => {
    setFilterEmployeeId(empId);
  };

  // Export to Excel handler
  const handleExport = async (isSingle: boolean) => {
    if (isSingle) {
      setExportingSingle(true);
    } else {
      setExportingAll(true);
    }

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
        const errData = await res.json();
        throw new Error(errData.error || "Excel 匯出失敗");
      }

      // Convert response into blob
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      const fileName = isSingle && selectedEmployeeName
        ? `八方雲集三峽店_薪資單_${selectedEmployeeName}_${filterYear}年${filterMonth}月.xlsx`
        : `八方雲集三峽店_全員薪資報表_${filterYear}年${filterMonth}月.xlsx`;
      
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || "Excel 匯出時發生錯誤");
    } finally {
      setExportingSingle(false);
      setExportingAll(false);
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
    return twDate.toISOString().slice(11, 16);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "NORMAL":
        return "bg-[#F0FDF4] text-[#166534] border border-[#F0FDF4]";
      case "LATE":
      case "EARLY_LEAVE":
        return "bg-[#FFFBEB] text-[#B45309] border border-[#FFFBEB]";
      case "ABSENT":
        return "bg-[#FEF2F2] text-[#B91C1C] border border-[#FEF2F2]";
      case "LEAVE":
        return "bg-[#EFF6FF] text-[#1D4ED8] border border-[#EFF6FF]";
      default:
        return "bg-[#F3F4F6] text-[#4B5563] border border-[#F3F4F6]";
    }
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

  // Find currently selected employee object
  const selectedEmployeeName = employees.find(e => e.id === filterEmployeeId)?.name;

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-[#E5E7EB] flex items-center justify-center text-[#111111]">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111111] tracking-tight">
              薪資發放與月報表
            </h1>
            <p className="text-xs text-[#666666] mt-0.5">
              依據員工時薪與核定工時自動進行薪資結算，檢視單月總人事費用，並核對每日詳細打卡紀錄。
            </p>
          </div>
        </div>
      </div>

      {/* Filters Form */}
      <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-sm space-y-3">
        <h2 className="text-xs font-bold text-[#666666] tracking-wider flex items-center gap-1.5 uppercase">
          <Filter className="w-3.5 h-3.5 text-[#111111]" />
          薪資統計期間與篩選
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          
          {/* Year Switcher */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#666666]">年份 (Year)</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(parseInt(e.target.value, 10))}
              className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-[#111111] font-semibold"
            >
              {years.map(y => (
                <option key={y} value={y}>{y} 年</option>
              ))}
            </select>
          </div>

          {/* Month Switcher */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#666666]">月份 (Month)</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(parseInt(e.target.value, 10))}
              className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-[#111111] font-semibold"
            >
              {months.map(m => (
                <option key={m} value={m}>{m} 月</option>
              ))}
            </select>
          </div>

          {/* Employee Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#666666]">員工選擇 (Employee)</label>
            <select
              value={filterEmployeeId}
              onChange={(e) => setFilterEmployeeId(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-[#111111] font-semibold"
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
        <div className="flex flex-col sm:flex-row justify-end gap-2.5 pt-3 border-t border-[#E5E7EB]">
          <button
            onClick={() => handleExport(false)}
            disabled={loading || exportingAll || exportingSingle}
            className="flex items-center justify-center gap-1.5 bg-white hover:bg-[#F5F5F5] border border-[#111111] disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold text-[#111111] px-4 py-2 rounded-lg transition-all cursor-pointer"
          >
            {exportingAll ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#111111]" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            匯出全員薪資 Excel
          </button>
          
          <button
            onClick={() => handleExport(true)}
            disabled={loading || exportingAll || exportingSingle || !filterEmployeeId}
            className="flex items-center justify-center gap-1.5 bg-[#111111] hover:bg-[#222222] text-white disabled:opacity-30 disabled:pointer-events-none text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer"
          >
            {exportingSingle ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            匯出選定員工 Excel
          </button>
        </div>
      </div>

      {/* Summary Cards Grid */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Payroll cost */}
          <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#666666] uppercase tracking-wider">本月總人事薪資</span>
              <Coins className="w-4 h-4 text-[#111111]" />
            </div>
            <div className="mt-2">
              <p className="text-xl font-bold text-[#111111] font-mono">
                NT$ {summary.totalPayrollCost.toLocaleString()}
              </p>
              <p className="text-[9px] text-[#888888] mt-0.5">合計發放人事薪資總額</p>
            </div>
          </div>

          {/* Card 2: Total Hours */}
          <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#666666] uppercase tracking-wider">本月核定總工時</span>
              <Clock className="w-4 h-4 text-[#111111]" />
            </div>
            <div className="mt-2">
              <p className="text-xl font-bold text-[#111111] font-mono">
                {summary.totalHours.toFixed(2)} <span className="text-[10px] font-normal text-[#666666]">小時</span>
              </p>
              <p className="text-[9px] text-[#888888] mt-0.5">累計支付薪資的總工時數</p>
            </div>
          </div>

          {/* Card 3: Employee Count */}
          <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#666666] uppercase tracking-wider">統計發放人數</span>
              <Users className="w-4 h-4 text-[#111111]" />
            </div>
            <div className="mt-2">
              <p className="text-xl font-bold text-[#111111] font-mono">
                {summary.employeeCount} <span className="text-[10px] font-normal text-[#666666]">人</span>
              </p>
              <p className="text-[9px] text-[#888888] mt-0.5">本月計薪範圍內的員工人數</p>
            </div>
          </div>

          {/* Card 4: Average Salary */}
          <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#666666] uppercase tracking-wider">本月平均薪資</span>
              <TrendingUp className="w-4 h-4 text-[#111111]" />
            </div>
            <div className="mt-2">
              <p className="text-xl font-bold text-[#111111] font-mono">
                NT$ {summary.averageSalary.toLocaleString()}
              </p>
              <p className="text-[9px] text-[#888888] mt-0.5">人事總薪資 / 計薪員工人數</p>
            </div>
          </div>

        </div>
      )}

      {/* Main Content Layout */}
      {error && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#FEF2F2] border border-red-200 text-[#B91C1C] text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[#666666] text-xs font-semibold">
          <Loader2 className="w-6 h-6 animate-spin text-[#111111] mr-2" />
          計算發放薪資與彙整數據中...
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Left/Main Column: Payroll Table */}
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-[#E5E7EB] bg-white">
                <h2 className="text-xs font-bold text-[#111111] flex items-center gap-1.5 uppercase">
                  <Coins className="w-3.5 h-3.5 text-[#111111]" />
                  薪資結算清單 (依本月薪水高低排序)
                </h2>
              </div>
              
              {payrollList.length === 0 ? (
                <p className="text-xs text-[#666666] py-12 text-center">本月暫無可計薪之出勤紀錄</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] text-[#666666] font-bold uppercase tracking-wider sticky top-0">
                        <th className="py-2.5 px-4">員工編號</th>
                        <th className="py-2.5 px-4">員工姓名</th>
                        <th className="py-2.5 px-4 text-right">員工時薪</th>
                        <th className="py-2.5 px-4 text-right">出勤天數</th>
                        <th className="py-2.5 px-4 text-right">本月總工時</th>
                        <th className="py-2.5 px-4 text-right">本月薪資 (NTD)</th>
                        <th className="py-2.5 px-4 text-right">明細</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {payrollList.map((row) => (
                        <tr 
                          key={row.employeeId} 
                          onClick={() => handleRowClick(row.employeeId)}
                          className={`hover:bg-[#F5F5F5] transition-colors text-[#111111] cursor-pointer group ${
                            filterEmployeeId === row.employeeId ? "bg-[#FAFAFA]" : ""
                          }`}
                        >
                          <td className="py-2.5 px-4 font-mono font-semibold text-[#666666]">{row.employeeCode}</td>
                          <td className="py-2.5 px-4 font-bold">{row.employeeName}</td>
                          <td className="py-2.5 px-4 text-right font-mono">NT$ {row.hourlyRate}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-semibold text-[#666666]">{row.totalDays} 天</td>
                          <td className="py-2.5 px-4 text-right font-mono font-semibold text-[#666666]">{row.totalHours.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-[#1D4ED8]">
                            NT$ {row.monthlySalary.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#111111] group-hover:translate-x-0.5 transition-all inline" />
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
            <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm p-4">
              <h2 className="text-xs font-bold text-[#111111] uppercase tracking-wider border-b border-[#E5E7EB] pb-2 mb-3 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#111111]" />
                出勤工時明細日報表
              </h2>
              
              {!filterEmployeeId ? (
                <div className="text-center py-12 px-4 text-[#666666] space-y-2">
                  <AlertCircle className="w-8 h-8 text-[#888888] mx-auto" />
                  <p className="text-xs font-semibold">請點選左側員工列，或在上方選擇單一員工</p>
                  <p className="text-[10px] text-[#888888]">選擇後將顯示該名員工在此月份的每日打卡與核定工時明細。</p>
                </div>
              ) : breakdownLoading ? (
                <div className="flex items-center justify-center py-12 text-[#666666] text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-[#111111] mr-1.5" />
                  載入員工出勤明細中...
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Selected Header */}
                  <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#FAFAFA] border border-[#E5E7EB] text-xs">
                    <div>
                      <span className="text-[9px] text-[#666666] font-semibold block">正在檢視明細</span>
                      <span className="font-bold text-[#111111]">{selectedEmployeeName} 的出勤日誌</span>
                    </div>
                    <button
                      onClick={() => setFilterEmployeeId("")}
                      className="text-[10px] font-bold text-[#666666] hover:text-[#111111] flex items-center gap-0.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      清除明細
                    </button>
                  </div>

                  {/* List Daily Breakdown */}
                  {dailyRecords.length === 0 ? (
                    <p className="text-xs text-[#666666] py-12 text-center">本月查無任何打卡與出勤紀錄</p>
                  ) : (
                    <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                      {dailyRecords.map((rec) => (
                        <div key={rec.id} className="p-3 rounded-lg bg-[#FAFAFA] border border-[#E5E7EB] text-xs space-y-2">
                          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-1.5">
                            <span className="font-bold text-[#666666] font-mono">{formatTaiwanDate(rec.date)}</span>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${getStatusBadgeClass(rec.status)}`}>
                              {getStatusText(rec.status)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-1.5 text-[10px] text-[#666666] font-mono">
                            <div>上班：{formatTaiwanTime(rec.clockInTime)}</div>
                            <div>下班：{formatTaiwanTime(rec.clockOutTime)}</div>
                            <div className="col-span-2 font-bold text-[#111111] pt-1 border-t border-[#F5F5F5] flex justify-between">
                              <span>工時計算</span>
                              <span className="font-extrabold text-blue-600">
                                {rec.totalHours !== null ? `${rec.totalHours.toFixed(2)} 小時` : "0.00"}
                              </span>
                            </div>
                            {rec.note && (
                              <div className="col-span-2 text-[#888888] font-sans leading-normal italic mt-1 pt-1 border-t border-dashed border-[#E5E7EB]">
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
