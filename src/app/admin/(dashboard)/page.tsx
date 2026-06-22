import React from "react";
import { db } from "@/lib/db";
import { 
  Users, 
  Clock, 
  Shield, 
  Plus, 
  QrCode, 
  History,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  HelpCircle
} from "lucide-react";
import Link from "next/link";
import { getTaiwanBusinessDate, getTaiwanDayRange } from "@/lib/date";

export default async function AdminDashboardPage() {
  const todayBusinessDate = getTaiwanBusinessDate();
  const { start, end } = getTaiwanDayRange();

  // 1. Fetch live metrics
  const adminCount = await db.user.count();
  const logCount = await db.auditLog.count();
  
  const activeEmployeesCount = await db.employee.count({
    where: { isActive: true }
  });

  const clockedInToday = await db.attendanceRecord.count({
    where: {
      date: todayBusinessDate,
      clockInTime: { not: null }
    }
  });

  const clockedOutToday = await db.attendanceRecord.count({
    where: {
      date: todayBusinessDate,
      clockOutTime: { not: null }
    }
  });

  const currentlyWorking = await db.attendanceRecord.count({
    where: {
      date: todayBusinessDate,
      clockInTime: { not: null },
      clockOutTime: null
    }
  });

  const suspiciousEventsToday = await db.clockEvent.count({
    where: {
      timestamp: {
        gte: start,
        lte: end
      },
      locationStatus: "SUSPICIOUS"
    }
  });

  const missingClockOut = currentlyWorking; // 尚未下班打卡

  // 2. Fetch today's attendance records with employee names
  const todayRecords = await db.attendanceRecord.findMany({
    where: {
      date: todayBusinessDate,
    },
    include: {
      employee: {
        select: {
          name: true,
          employeeCode: true,
        }
      }
    },
    orderBy: {
      clockInTime: "desc",
    }
  });

  // 3. Fetch recent system logs
  const recentLogs = await db.auditLog.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      admin: {
        select: {
          name: true,
          username: true,
        }
      }
    }
  });

  // Format date helper
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Taipei"
    }).format(date);
  };

  const formatTimeOnly = (date: Date | null) => {
    if (!date) return "--:--";
    return new Intl.DateTimeFormat("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Taipei"
    }).format(date);
  };

  return (
    <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
      
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 md:p-8 rounded-2xl glass-card relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-2xl -z-10" />
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-amber-200 to-red-400 bg-clip-text text-transparent">
            系統控制台
          </h1>
          <p className="text-sm text-slate-400 mt-2 font-medium">
            歡迎使用三峽八方雲集國際店後台管理系統。在這裡，您可以管理員工出勤、班表和薪水。
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/workplace"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900 transition-all shadow-md"
          >
            <QrCode className="w-4 h-4 text-amber-500" />
            工作場所設定
          </Link>
          <Link
            href="/admin/employees"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500 transition-all shadow-md shadow-amber-500/10"
          >
            <Plus className="w-4 h-4" />
            新增員工
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        
        {/* Metric 1: Active Employees */}
        <div className="p-6 rounded-2xl glass-card hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 tracking-wider">在職員工數</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-100">{activeEmployeesCount}</p>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">系統已啟用的員工帳戶</p>
        </div>

        {/* Metric 2: Clocked In Today */}
        <div className="p-6 rounded-2xl glass-card hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 tracking-wider">今日已上班</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-100">{clockedInToday}</p>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">今日有上班打卡記錄的員工</p>
        </div>

        {/* Metric 3: Clocked Out Today */}
        <div className="p-6 rounded-2xl glass-card hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 tracking-wider">今日已下班</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-100">{clockedOutToday}</p>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">今日有下班打卡記錄的員工</p>
        </div>

        {/* Metric 4: Currently Working */}
        <div className="p-6 rounded-2xl glass-card hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 tracking-wider">目前上班中</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-100">{currentlyWorking}</p>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">已上班但尚未下班的人數</p>
        </div>

        {/* Metric 5: Suspicious Events */}
        <div className="p-6 rounded-2xl glass-card hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 tracking-wider">今日異常定位打卡</span>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-100">{suspiciousEventsToday}</p>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">超出一般範圍 (SUSPICIOUS) 記錄</p>
        </div>

        {/* Metric 6: Missing Clock Out */}
        <div className="p-6 rounded-2xl glass-card hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 tracking-wider">尚未下班打卡</span>
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400">
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-100">{missingClockOut}</p>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">「尚未下班打卡」統計（非錯誤）</p>
        </div>

        {/* Metric 7: Admin Count */}
        <div className="p-6 rounded-2xl glass-card hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 tracking-wider">管理員總數</span>
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-100">{adminCount}</p>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">後台帳號安全控制中</p>
        </div>

        {/* Metric 8: Logs Count */}
        <div className="p-6 rounded-2xl glass-card hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 tracking-wider">安全日誌記錄</span>
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
              <History className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-100">{logCount}</p>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">系統操作審計追蹤</p>
        </div>

      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns - Today's Attendance Overview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl glass-card">
            <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              今日出勤概覽 ({formatDate(todayBusinessDate).split(" ")[0]})
            </h2>
            {todayRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/20 text-center">
                <AlertTriangle className="w-10 h-10 text-slate-600 mb-3" />
                <p className="text-sm font-semibold text-slate-400">
                  今日暫無打卡紀錄
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  當員工使用打卡系統進行上班或下班打卡後，出勤記錄將會即時顯示在此處。
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">員工資訊</th>
                      <th className="py-3 px-4">上班打卡</th>
                      <th className="py-3 px-4">下班打卡</th>
                      <th className="py-3 px-4 text-right">工時 (小時)</th>
                      <th className="py-3 px-4 text-center">狀態</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {todayRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-900/20 transition-colors text-slate-300">
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-200 block">{record.employee.name}</span>
                          <span className="text-[10px] text-slate-500 block">工號: {record.employee.employeeCode}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          {formatTimeOnly(record.clockInTime)}
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          {formatTimeOnly(record.clockOutTime)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-right font-bold text-slate-100">
                          {record.totalHours !== null ? record.totalHours.toFixed(2) : "-"}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            record.clockOutTime 
                              ? "bg-emerald-500/10 text-emerald-400" 
                              : "bg-amber-500/10 text-amber-400"
                          }`}>
                            {record.clockOutTime ? "已下班" : "上班中"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Audit Logs */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl glass-card">
            <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-red-500" />
              近期系統操作紀錄
            </h2>
            {recentLogs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">暫無系統操作日誌</p>
            ) : (
              <div className="space-y-3.5">
                {recentLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-xl bg-slate-950/40 border border-slate-900 text-xs">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.action.includes("SUCCESS") || log.action.includes("CREATED")
                          ? "bg-emerald-500/10 text-emerald-400" 
                          : log.action.includes("FAILED") 
                          ? "bg-red-500/10 text-red-400" 
                          : "bg-slate-800 text-slate-300"
                      }`}>
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-500">{formatDate(log.createdAt)}</span>
                    </div>
                    <p className="text-slate-300 font-medium">{log.details}</p>
                    <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-slate-900/50 text-[10px] text-slate-500">
                      <span>IP: {log.ipAddress}</span>
                      {log.admin && <span>• 執行者: {log.admin.name} (@{log.admin.username})</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
