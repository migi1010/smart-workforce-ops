import React from "react";
import { db } from "@/lib/db";
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  MapPin, 
  CheckCircle2, 
  UserX,
  DollarSign,
  TrendingUp,
  History,
  ShieldAlert,
  Settings,
  Plus,
  QrCode
} from "lucide-react";
import Link from "next/link";
import { getTaiwanBusinessDate, getTaiwanDayRange } from "@/lib/date";

export const revalidate = 0; // Disable static caching so it loads live data on every refresh

export default async function AdminDashboardPage() {
  const todayBusinessDate = getTaiwanBusinessDate();
  const { start, end } = getTaiwanDayRange();

  // 1. Fetch live metrics
  const activeEmployees = await db.employee.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      employeeCode: true,
      hourlyRate: true
    }
  });
  const activeCount = activeEmployees.length;

  // Clocked in today
  const todayRecords = await db.attendanceRecord.findMany({
    where: {
      date: todayBusinessDate,
    },
    include: {
      employee: {
        select: {
          name: true,
          employeeCode: true,
          hourlyRate: true
        }
      }
    },
    orderBy: {
      clockInTime: "desc",
    }
  });

  const clockedInTodayCount = todayRecords.filter(r => r.clockInTime !== null).length;
  const clockedOutTodayCount = todayRecords.filter(r => r.clockOutTime !== null).length;
  
  // Currently working (clocked in but not clocked out today)
  const currentlyWorkingRecords = todayRecords.filter(r => r.clockInTime !== null && r.clockOutTime === null);
  const currentlyWorkingCount = currentlyWorkingRecords.length;

  // Absent today: Active employees who haven't clocked in today
  const clockedInEmpIds = todayRecords.filter(r => r.clockInTime !== null).map(r => r.employeeId);
  const absentEmployees = activeEmployees.filter(e => !clockedInEmpIds.includes(e.id));
  const absentCount = absentEmployees.length;

  // Suspicious events today
  const suspiciousEventsCount = await db.clockEvent.count({
    where: {
      timestamp: {
        gte: start,
        lte: end
      },
      locationStatus: { in: ["SUSPICIOUS", "BLOCKED", "LOCATION_DENIED"] }
    }
  });

  // Missing clock-outs: prior day records that are not clocked out
  const missingClockOutRecords = await db.attendanceRecord.findMany({
    where: {
      clockInTime: { not: null },
      clockOutTime: null,
      date: { lt: todayBusinessDate }
    },
    include: {
      employee: {
        select: {
          name: true,
          employeeCode: true
        }
      }
    },
    orderBy: {
      clockInTime: "desc"
    }
  });
  const missingClockOutCount = missingClockOutRecords.length;

  // Calculate worked hours and payroll exposure today (accumulating in real-time)
  let todayWorkedHours = 0;
  let todayPayrollCost = 0;
  
  todayRecords.forEach(r => {
    let hours = 0;
    if (r.clockOutTime && r.clockInTime) {
      hours = r.totalHours || 0;
    } else if (r.clockInTime) {
      const elapsedMs = new Date().getTime() - new Date(r.clockInTime).getTime();
      hours = Math.max(0, elapsedMs / (1000 * 60 * 60));
    }
    todayWorkedHours += hours;
    todayPayrollCost += hours * (r.employee?.hourlyRate || 0);
  });

  // Get suspicious events detailed list for today
  const suspiciousEvents = await db.clockEvent.findMany({
    where: {
      timestamp: {
        gte: start,
        lte: end
      },
      locationStatus: { in: ["SUSPICIOUS", "BLOCKED", "LOCATION_DENIED"] }
    },
    include: {
      employee: {
        select: {
          name: true,
          employeeCode: true
        }
      }
    },
    orderBy: {
      timestamp: "desc"
    }
  });

  // Fetch chronological timeline logs (today's events)
  const todayEvents = await db.clockEvent.findMany({
    where: {
      timestamp: {
        gte: start,
        lte: end
      }
    },
    include: {
      employee: {
        select: {
          name: true,
          employeeCode: true
        }
      }
    },
    orderBy: {
      timestamp: "desc"
    }
  });

  // Fetch latest clock-in location status to associate with currently working staff
  const latestClockEvents = await db.clockEvent.findMany({
    where: {
      timestamp: {
        gte: start,
        lte: end
      },
      eventType: "CLOCK_IN"
    },
    select: {
      employeeId: true,
      locationStatus: true
    }
  });
  const gpsStatusMap = new Map(latestClockEvents.map(e => [e.employeeId, e.locationStatus]));

  // Formatting helpers
  const formatTimeOnly = (date: Date | null) => {
    if (!date) return "--:--";
    return new Intl.DateTimeFormat("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Taipei"
    }).format(new Date(date));
  };

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m} 分`;
    return `${h} 小時 ${m} 分`;
  };

  const getGpsBadgeClass = (status: string | undefined) => {
    if (status === "NORMAL") return "bg-[#F0FDF4] text-[#166534]";
    if (status === "SUSPICIOUS") return "bg-[#FFFBEB] text-[#B45309]";
    if (status === "BLOCKED") return "bg-[#FEF2F2] text-[#B91C1C]";
    return "bg-[#F3F4F6] text-[#4B5563]";
  };

  const getGpsLabel = (status: string | undefined) => {
    if (status === "NORMAL") return "正常";
    if (status === "SUSPICIOUS") return "異常";
    if (status === "BLOCKED") return "阻擋";
    return "未取得";
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight">
            營運控制中心
          </h1>
          <p className="text-xs text-[#666666] mt-1 font-medium">
            即時監控 workforce 狀態、出勤異常與當日薪資支出。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/workplace"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-[#E5E7EB] bg-white text-[#111111] hover:bg-[#F5F5F5] transition-all shadow-sm"
          >
            <QrCode className="w-3.5 h-3.5" />
            打卡場所
          </Link>
          <Link
            href="/admin/employees"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#111111] text-white hover:bg-[#222222] transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            新增員工
          </Link>
        </div>
      </div>

      {/* 2. Top KPI Snapshot Row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* KPI 1: Active Employees */}
        <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#666666] uppercase tracking-wider">在職員工</span>
            <Users className="w-4 h-4 text-[#666666]" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-[#111111]">{activeCount}</p>
            <p className="text-[9px] text-[#888888] mt-0.5">系統啟用的總人數</p>
          </div>
        </div>

        {/* KPI 2: Currently Working */}
        <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#666666] uppercase tracking-wider">目前上班</span>
            <Clock className="w-4 h-4 text-[#166534]" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-[#166534]">{currentlyWorkingCount}</p>
            <p className="text-[9px] text-[#888888] mt-0.5">已簽到且未簽退人數</p>
          </div>
        </div>

        {/* KPI 3: Missing Clock Outs */}
        <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#666666] uppercase tracking-wider">遺失簽退</span>
            <AlertTriangle className="w-4 h-4 text-[#B91C1C]" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-[#B91C1C]">{missingClockOutCount}</p>
            <p className="text-[9px] text-[#888888] mt-0.5">前日未簽退異常累計</p>
          </div>
        </div>

        {/* KPI 4: Suspicious GPS */}
        <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#666666] uppercase tracking-wider">異常打卡</span>
            <MapPin className="w-4 h-4 text-[#B45309]" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-[#B45309]">{suspiciousEventsCount}</p>
            <p className="text-[9px] text-[#888888] mt-0.5">今日超出範圍定位紀錄</p>
          </div>
        </div>

        {/* KPI 5: Today Worked Hours */}
        <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#666666] uppercase tracking-wider">今日總工時</span>
            <TrendingUp className="w-4 h-4 text-[#111111]" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-[#111111]">{todayWorkedHours.toFixed(1)} hr</p>
            <p className="text-[9px] text-[#888888] mt-0.5">今日已累積工時時數</p>
          </div>
        </div>

        {/* KPI 6: Estimated Payroll Today */}
        <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#666666] uppercase tracking-wider">今日薪資支出</span>
            <DollarSign className="w-4 h-4 text-[#1D4ED8]" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-[#1D4ED8]">NT$ {Math.round(todayPayrollCost).toLocaleString()}</p>
            <p className="text-[9px] text-[#888888] mt-0.5">以時薪估計之當日累計支出</p>
          </div>
        </div>

      </div>

      {/* 3. Main Dashboard Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Workforce Status Board (span 2) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Currently Working Board */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-white">
              <h2 className="text-sm font-bold text-[#111111] flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                即時上班人員 ({currentlyWorkingRecords.length})
              </h2>
            </div>
            {currentlyWorkingRecords.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#666666] bg-[#FAFAFA]">
                目前無人上班中。員工上班打卡後會即時顯示在此。
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] text-[#666666] font-bold uppercase tracking-wider sticky top-0">
                      <th className="py-2.5 px-4">姓名</th>
                      <th className="py-2.5 px-4">工號</th>
                      <th className="py-2.5 px-4">上班打卡</th>
                      <th className="py-2.5 px-4">工作時數</th>
                      <th className="py-2.5 px-4 text-center">GPS狀態</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {currentlyWorkingRecords.map((r) => {
                      const elapsedMs = new Date().getTime() - new Date(r.clockInTime!).getTime();
                      const elapsedHours = Math.max(0, elapsedMs / (1000 * 60 * 60));
                      const gpsStatus = gpsStatusMap.get(r.employeeId);

                      return (
                        <tr key={r.id} className="hover:bg-[#F5F5F5] transition-colors text-[#111111]">
                          <td className="py-2.5 px-4 font-semibold">{r.employee.name}</td>
                          <td className="py-2.5 px-4 text-[#666666]">{r.employee.employeeCode}</td>
                          <td className="py-2.5 px-4 font-mono">{formatTimeOnly(r.clockInTime)}</td>
                          <td className="py-2.5 px-4 font-medium text-blue-600">{formatDuration(elapsedHours)}</td>
                          <td className="py-2.5 px-4 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${getGpsBadgeClass(gpsStatus)}`}>
                              {getGpsLabel(gpsStatus)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Missing Clock Out Board */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-white">
              <h2 className="text-sm font-bold text-[#111111] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#B91C1C]" />
                經理追蹤：未下班打卡異常 ({missingClockOutRecords.length})
              </h2>
            </div>
            {missingClockOutRecords.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#666666] bg-[#FAFAFA]">
                目前無未簽退異常紀錄。
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] text-[#666666] font-bold uppercase tracking-wider sticky top-0">
                      <th className="py-2.5 px-4">姓名</th>
                      <th className="py-2.5 px-4">打卡日期</th>
                      <th className="py-2.5 px-4">上班打卡</th>
                      <th className="py-2.5 px-4">未簽退時間</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {missingClockOutRecords.map((r) => {
                      const elapsedMs = new Date().getTime() - new Date(r.clockInTime!).getTime();
                      const elapsedHours = Math.max(0, elapsedMs / (1000 * 60 * 60));

                      return (
                        <tr key={r.id} className="hover:bg-[#F5F5F5] transition-colors text-[#111111]">
                          <td className="py-2.5 px-4 font-semibold text-[#B91C1C]">{r.employee.name}</td>
                          <td className="py-2.5 px-4 font-mono text-[#666666]">
                            {new Date(r.date).toLocaleDateString("zh-TW")}
                          </td>
                          <td className="py-2.5 px-4 font-mono">{formatTimeOnly(r.clockInTime)}</td>
                          <td className="py-2.5 px-4 font-mono font-medium text-[#B91C1C]">
                            已漏簽退 {Math.floor(elapsedHours)} 小時
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Suspicious Activity Board */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-white">
              <h2 className="text-sm font-bold text-[#111111] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#B45309]" />
                今日異常定位打卡 ({suspiciousEvents.length})
              </h2>
            </div>
            {suspiciousEvents.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#666666] bg-[#FAFAFA]">
                今日無定位異常事件。
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] text-[#666666] font-bold uppercase tracking-wider sticky top-0">
                      <th className="py-2.5 px-4">姓名</th>
                      <th className="py-2.5 px-4">打卡時間</th>
                      <th className="py-2.5 px-4">事件類型</th>
                      <th className="py-2.5 px-4">超出距離</th>
                      <th className="py-2.5 px-4 text-center">狀態</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {suspiciousEvents.map((evt) => (
                      <tr key={evt.id} className="hover:bg-[#F5F5F5] transition-colors text-[#111111]">
                        <td className="py-2.5 px-4 font-semibold">{evt.employee.name}</td>
                        <td className="py-2.5 px-4 font-mono">{formatTimeOnly(evt.timestamp)}</td>
                        <td className="py-2.5 px-4 font-medium">
                          {evt.eventType === "CLOCK_IN" ? "上班" : "下班"}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[#B45309]">
                          {evt.distanceMeters ? `${Math.round(evt.distanceMeters)} 米` : "--"}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${getGpsBadgeClass(evt.locationStatus)}`}>
                            {evt.locationStatus === "SUSPICIOUS" ? "異常" : evt.locationStatus === "BLOCKED" ? "阻擋" : "拒絕定位"}
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

        {/* Right Side: Snapshots & Operations Summary */}
        <div className="space-y-6">
          
          {/* Operations Snapshot Card */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm p-4">
            <h2 className="text-xs font-bold text-[#111111] uppercase tracking-wider border-b border-[#E5E7EB] pb-2 mb-3">
              今日營運摘要 (Workforce Snapshot)
            </h2>
            <div className="space-y-2.5 text-xs text-[#111111]">
              <div className="flex items-center justify-between py-1 border-b border-[#F5F5F5]">
                <span className="text-[#666666]">在職員工總數</span>
                <span className="font-semibold">{activeCount} 人</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F5F5F5]">
                <span className="text-[#666666]">目前在崗人數</span>
                <span className="font-semibold text-emerald-600">{currentlyWorkingCount} 人</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F5F5F5]">
                <span className="text-[#666666]">今日未到假勤</span>
                <span className="font-semibold text-amber-600">{absentCount} 人</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F5F5F5]">
                <span className="text-[#666666]">今日已下班人數</span>
                <span className="font-semibold text-blue-600">{clockedOutTodayCount} 人</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F5F5F5]">
                <span className="text-[#666666]">定位異常事件</span>
                <span className="font-semibold text-red-600">{suspiciousEventsCount} 件</span>
              </div>
              <div className="flex items-center justify-between py-1 mt-2 bg-[#FAFAFA] p-2 rounded">
                <span className="text-[#111111] font-bold">估計薪資曝光 (今天)</span>
                <span className="font-bold text-[#1D4ED8] font-mono">NT$ {Math.round(todayPayrollCost).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Chronological Feed Card */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm p-4">
            <h2 className="text-xs font-bold text-[#111111] uppercase tracking-wider border-b border-[#E5E7EB] pb-2 mb-3 flex items-center gap-1.5">
              <History className="w-4 h-4 text-[#666666]" />
              今日即時打卡動態 feed
            </h2>
            {todayEvents.length === 0 ? (
              <p className="text-xs text-[#666666] text-center py-6">今日暫無打卡動態</p>
            ) : (
              <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
                {todayEvents.map((evt) => (
                  <div key={evt.id} className="text-xs border-l-2 border-[#111111] pl-2.5 py-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#111111]">{evt.employee.name}</span>
                      <span className="text-[10px] text-[#888888] font-mono">{formatTimeOnly(evt.timestamp)}</span>
                    </div>
                    <p className="text-[11px] text-[#666666] mt-0.5">
                      執行了 <span className="font-semibold text-[#111111]">{evt.eventType === "CLOCK_IN" ? "上班打卡" : "下班打卡"}</span>
                      {evt.locationStatus !== "NORMAL" && (
                        <span className="text-[#B45309] font-bold ml-1">(異常定位: {Math.round(evt.distanceMeters || 0)}米)</span>
                      )}
                    </p>
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
