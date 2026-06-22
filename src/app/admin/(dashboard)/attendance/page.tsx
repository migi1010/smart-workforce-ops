"use client";

import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Users, 
  Clock, 
  Search, 
  Plus, 
  Edit3, 
  Info, 
  X, 
  AlertCircle, 
  Filter, 
  CheckCircle2, 
  MapPin, 
  Loader2,
  RefreshCw,
  HelpCircle,
  Laptop
} from "lucide-react";

interface Employee {
  id: string;
  name: string;
  employeeCode: string;
}

interface ClockEvent {
  id: string;
  eventType: "CLOCK_IN" | "CLOCK_OUT";
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  distanceMeters: number | null;
  locationStatus: "NORMAL" | "SUSPICIOUS" | "BLOCKED" | "LOCATION_DENIED";
  ipAddress: string | null;
  userAgent: string | null;
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employee: {
    name: string;
    employeeCode: string;
  };
  date: string;
  clockInTime: string | null;
  clockOutTime: string | null;
  totalMinutes: number | null;
  totalHours: number | null;
  status: "NORMAL" | "LATE" | "EARLY_LEAVE" | "ABSENT" | "LEAVE";
  note: string | null;
  editedByBoss: boolean;
  clockEvents: ClockEvent[];
  summaryLocationStatus: string;
}

// Convert UTC ISO to local Taiwan string YYYY-MM-DDTHH:MM for datetime-local inputs
const toDatetimeLocalString = (dateString: string | null) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  // Add 8 hours for Taiwan offset
  const twDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return twDate.toISOString().slice(0, 16);
};

// Convert YYYY-MM-DDTHH:MM in Taiwan time back to UTC ISO string
const fromDatetimeLocalString = (localString: string) => {
  if (!localString) return null;
  const [datePart, timePart] = localString.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const utcTime = Date.UTC(year, month - 1, day, hour, minute, 0, 0) - 8 * 60 * 60 * 1000;
  return new Date(utcTime).toISOString();
};

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [filterDate, setFilterDate] = useState<string>("");
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterLocationStatus, setFilterLocationStatus] = useState<string>("");

  // Drawer & Modals state
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editClockIn, setEditClockIn] = useState<string>("");
  const [editClockOut, setEditClockOut] = useState<string>("");
  const [editStatus, setEditStatus] = useState<string>("NORMAL");
  const [editNote, setEditNote] = useState<string>("");
  const [editHasIn, setEditHasIn] = useState<boolean>(true);
  const [editHasOut, setEditHasOut] = useState<boolean>(true);
  const [editSubmitting, setEditSubmitting] = useState<boolean>(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createEmployeeId, setCreateEmployeeId] = useState<string>("");
  const [createDate, setCreateDate] = useState<string>("");
  const [createClockIn, setCreateClockIn] = useState<string>("");
  const [createClockOut, setCreateClockOut] = useState<string>("");
  const [createStatus, setCreateStatus] = useState<string>("NORMAL");
  const [createNote, setCreateNote] = useState<string>("");
  const [createHasIn, setCreateHasIn] = useState<boolean>(false);
  const [createHasOut, setCreateHasOut] = useState<boolean>(false);
  const [createSubmitting, setCreateSubmitting] = useState<boolean>(false);

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

  const fetchAttendance = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (filterDate) queryParams.set("date", filterDate);
      if (filterEmployeeId) queryParams.set("employeeId", filterEmployeeId);
      if (filterStatus) queryParams.set("status", filterStatus);
      if (filterLocationStatus) queryParams.set("locationStatus", filterLocationStatus);

      const res = await fetch(`/api/admin/attendance?${queryParams.toString()}`);
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "無法取得出勤紀錄");
      }
      setRecords(result.attendanceRecords || []);
    } catch (err: any) {
      setError(err.message || "載入出勤資料時發生錯誤");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [filterDate, filterEmployeeId, filterStatus, filterLocationStatus]);

  const openDrawer = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setIsDrawerOpen(true);
  };

  const openEditModal = (record: AttendanceRecord, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering drawer open
    setEditingRecord(record);
    setEditClockIn(toDatetimeLocalString(record.clockInTime));
    setEditClockOut(toDatetimeLocalString(record.clockOutTime));
    setEditHasIn(!!record.clockInTime);
    setEditHasOut(!!record.clockOutTime);
    setEditStatus(record.status);
    setEditNote(record.note || "");
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    setEditSubmitting(true);
    try {
      const payload = {
        clockInTime: editHasIn && editClockIn ? fromDatetimeLocalString(editClockIn) : null,
        clockOutTime: editHasOut && editClockOut ? fromDatetimeLocalString(editClockOut) : null,
        status: editStatus,
        note: editNote.trim() || null,
      };

      const res = await fetch(`/api/admin/attendance/${editingRecord.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "更新出勤紀錄失敗");
      }

      setEditingRecord(null);
      fetchAttendance();
      // If drawer is open with this record, update it or close drawer
      if (selectedRecord && selectedRecord.id === editingRecord.id) {
        setIsDrawerOpen(false);
      }
      alert("出勤紀錄已成功更新！");
    } catch (err: any) {
      alert(err.message || "操作失敗");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEmployeeId) {
      alert("請選擇員工");
      return;
    }
    if (!createDate) {
      alert("請選擇日期");
      return;
    }

    setCreateSubmitting(true);
    try {
      // Use chosen date with midnight Taiwan time to initialize timestamps if times are enabled
      const formattedClockIn = createHasIn && createClockIn ? fromDatetimeLocalString(`${createDate}T${createClockIn}`) : null;
      const formattedClockOut = createHasOut && createClockOut ? fromDatetimeLocalString(`${createDate}T${createClockOut}`) : null;

      const payload = {
        employeeId: createEmployeeId,
        date: new Date(createDate).toISOString(),
        clockInTime: formattedClockIn,
        clockOutTime: formattedClockOut,
        status: createStatus,
        note: createNote.trim() || null,
      };

      const res = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "建立出勤紀錄失敗");
      }

      setIsCreateModalOpen(false);
      // Reset form
      setCreateEmployeeId("");
      setCreateDate("");
      setCreateClockIn("");
      setCreateClockOut("");
      setCreateStatus("NORMAL");
      setCreateNote("");
      setCreateHasIn(false);
      setCreateHasOut(false);
      
      fetchAttendance();
      alert("出勤紀錄已手動補登成功！");
    } catch (err: any) {
      alert(err.message || "操作失敗");
    } finally {
      setCreateSubmitting(false);
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
    return twDate.toISOString().slice(11, 19);
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

  const getLocationBadgeClass = (status: string) => {
    switch (status) {
      case "NORMAL":
        return "bg-emerald-500/10 text-emerald-400";
      case "SUSPICIOUS":
        return "bg-amber-500/10 text-amber-400";
      case "BLOCKED":
        return "bg-red-500/10 text-red-400";
      case "LOCATION_DENIED":
        return "bg-slate-800 text-slate-400";
      default:
        return "bg-slate-900 text-slate-500";
    }
  };

  const getLocationText = (status: string) => {
    switch (status) {
      case "NORMAL": return "店內範圍";
      case "SUSPICIOUS": return "異常位置";
      case "BLOCKED": return "超出阻擋";
      case "LOCATION_DENIED": return "定位拒絕";
      default: return "無定位資料";
    }
  };

  return (
    <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 md:p-8 rounded-2xl glass-card relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-2xl -z-10" />
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-amber-200 to-red-400 bg-clip-text text-transparent">
              出勤管理中心
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              檢視員工打卡紀錄、GPS 位置稽核、異常定位事件，並在需要時進行人工補登或出勤時間修正。
            </p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500 transition-all shadow-md shadow-amber-500/10 active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            手動補登出勤
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-4">
        <h2 className="text-xs font-bold text-slate-400 tracking-wider flex items-center gap-1.5 uppercase">
          <Filter className="w-4 h-4 text-amber-500" />
          篩選過濾條件
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Date Picker */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500">日期</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Employee Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500">員工</label>
            <select
              value={filterEmployeeId}
              onChange={(e) => setFilterEmployeeId(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500/50"
            >
              <option value="">全部員工</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employeeCode})
                </option>
              ))}
            </select>
          </div>

          {/* Attendance Status */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500">出勤狀態</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500/50"
            >
              <option value="">全部狀態</option>
              <option value="NORMAL">正常</option>
              <option value="LATE">遲到</option>
              <option value="EARLY_LEAVE">早退</option>
              <option value="ABSENT">缺勤</option>
              <option value="LEAVE">請假</option>
            </select>
          </div>

          {/* Location Status */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500">定位狀態</label>
            <select
              value={filterLocationStatus}
              onChange={(e) => setFilterLocationStatus(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500/50"
            >
              <option value="">全部定位</option>
              <option value="NORMAL">店內範圍 (NORMAL)</option>
              <option value="SUSPICIOUS">異常位置 (SUSPICIOUS)</option>
              <option value="BLOCKED">超出阻擋 (BLOCKED)</option>
              <option value="LOCATION_DENIED">定位拒絕 (LOCATION_DENIED)</option>
            </select>
          </div>

        </div>

        {/* Clear Filters Helper */}
        {(filterDate || filterEmployeeId || filterStatus || filterLocationStatus) && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                setFilterDate("");
                setFilterEmployeeId("");
                setFilterStatus("");
                setFilterLocationStatus("");
              }}
              className="text-[10px] font-bold text-slate-500 hover:text-amber-500 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              清除所有篩選條件
            </button>
          </div>
        )}
      </div>

      {/* Attendance Data Table */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500 font-semibold">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mr-2.5" />
          讀取排班與打卡數據中...
        </div>
      ) : records.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/20 text-slate-500">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-slate-700" />
          <p className="text-sm font-semibold">找不到符合條件的出勤紀錄</p>
          <p className="text-xs text-slate-600 mt-1">請嘗試修改篩選條件，或進行手動補登。</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-4 px-5">日期</th>
                  <th className="py-4 px-5">員工編號</th>
                  <th className="py-4 px-5">員工姓名</th>
                  <th className="py-4 px-5">上班時間</th>
                  <th className="py-4 px-5">下班時間</th>
                  <th className="py-4 px-5 text-right">工時 (小時)</th>
                  <th className="py-4 px-5 text-center">出勤狀態</th>
                  <th className="py-4 px-5 text-center">定位狀態</th>
                  <th className="py-4 px-5 text-center">店長修改</th>
                  <th className="py-4 px-5 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {records.map((record) => (
                  <tr 
                    key={record.id} 
                    onClick={() => openDrawer(record)}
                    className="hover:bg-slate-900/20 transition-colors text-slate-300 cursor-pointer group"
                  >
                    <td className="py-3.5 px-5 font-semibold font-mono">
                      {formatTaiwanDate(record.date)}
                    </td>
                    <td className="py-3.5 px-5 font-semibold font-mono text-slate-400">
                      {record.employee.employeeCode}
                    </td>
                    <td className="py-3.5 px-5 font-bold text-slate-200">
                      {record.employee.name}
                    </td>
                    <td className="py-3.5 px-5 font-mono">
                      {formatTaiwanTime(record.clockInTime)}
                    </td>
                    <td className="py-3.5 px-5 font-mono">
                      {formatTaiwanTime(record.clockOutTime)}
                    </td>
                    <td className="py-3.5 px-5 font-mono font-bold text-right text-slate-100">
                      {record.totalHours !== null ? record.totalHours.toFixed(2) : "-"}
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadgeClass(record.status)}`}>
                        {getStatusText(record.status)}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${getLocationBadgeClass(record.summaryLocationStatus)}`}>
                        {getLocationText(record.summaryLocationStatus)}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      {record.editedByBoss ? (
                        <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                          已編輯
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => openEditModal(record, e)}
                          className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:text-amber-500 hover:border-slate-700 transition-all cursor-pointer"
                          title="修改出勤時間與狀態"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openDrawer(record)}
                          className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:text-amber-500 hover:border-slate-700 transition-all cursor-pointer"
                          title="檢視詳細 GPS 與打卡日誌"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 1. DETAIL DRAWER (Slide-out Panel) */}
      {/* ========================================== */}
      {isDrawerOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)} />
          
          <div className="absolute inset-y-0 right-0 max-w-xl w-full bg-[#0b0f19] border-l border-slate-800 shadow-2xl flex flex-col h-full animate-[slideInRight_0.25s_ease-out]">
            
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-100">出勤詳細資料與軌跡</h3>
                <p className="text-xs text-slate-500 mt-1">
                  員工：{selectedRecord.employee.name} (工號: {selectedRecord.employee.employeeCode}) ‧ 日期: {formatTaiwanDate(selectedRecord.date)}
                </p>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:text-amber-500 hover:border-slate-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6">
              
              {/* Daily Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-900 text-xs">
                  <span className="text-[10px] text-slate-500 block font-semibold mb-1">今日核定上班</span>
                  <span className="text-sm font-bold text-slate-200">{formatTaiwanTime(selectedRecord.clockInTime)}</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-900 text-xs">
                  <span className="text-[10px] text-slate-500 block font-semibold mb-1">今日核定下班</span>
                  <span className="text-sm font-bold text-slate-200">{formatTaiwanTime(selectedRecord.clockOutTime)}</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-900 text-xs">
                  <span className="text-[10px] text-slate-500 block font-semibold mb-1">總累計工時</span>
                  <span className="text-sm font-bold text-slate-100">
                    {selectedRecord.totalHours !== null ? `${selectedRecord.totalHours.toFixed(2)} 小時` : "無"}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-900 text-xs">
                  <span className="text-[10px] text-slate-500 block font-semibold mb-1">出勤審核狀態</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold mt-0.5 ${getStatusBadgeClass(selectedRecord.status)}`}>
                    {getStatusText(selectedRecord.status)}
                  </span>
                </div>
              </div>

              {/* Boss Note Box */}
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-900 text-xs space-y-2">
                <span className="text-[10px] text-slate-500 block font-bold">店長審核備註</span>
                <p className="text-slate-300 font-medium leading-relaxed italic">
                  {selectedRecord.note || "暫無審核備註。"}
                </p>
                {selectedRecord.editedByBoss && (
                  <span className="inline-flex text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded mt-1.5">
                    ⚠️ 此紀錄已被店長手動修正
                  </span>
                )}
              </div>

              {/* Raw Clocking Events Flow */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-500" />
                  打卡軌跡歷史 ({selectedRecord.clockEvents.length} 次事件)
                </h4>
                
                {selectedRecord.clockEvents.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">今日無任何電子打卡事件紀錄（可能為店長手動補登）</p>
                ) : (
                  <div className="space-y-3">
                    {selectedRecord.clockEvents.map((evt, idx) => (
                      <div key={evt.id} className="p-4 rounded-xl bg-slate-950/60 border border-slate-900 text-xs space-y-2.5 relative">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-900 pb-1.5">
                          <span className={`font-bold ${evt.eventType === "CLOCK_IN" ? "text-amber-400" : "text-indigo-400"}`}>
                            # {idx + 1} {evt.eventType === "CLOCK_IN" ? "上班打卡 ⊙" : "下班打卡 ⊙"}
                          </span>
                          <span className="text-slate-500 font-mono">{new Date(evt.timestamp).toLocaleString("zh-TW")}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] text-slate-400">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            <span>定位狀態：</span>
                            <span className={`font-bold ${getLocationBadgeClass(evt.locationStatus)}`}>
                              {getLocationText(evt.locationStatus)}
                            </span>
                          </div>
                          <div>
                            <span>距離店心：</span>
                            <span className="font-bold text-slate-200">
                              {evt.distanceMeters !== null ? `${evt.distanceMeters.toFixed(1)} 米` : "未知"}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span>GPS 座標：</span>
                            <span className="font-mono text-slate-300">
                              {evt.latitude !== null && evt.longitude !== null 
                                ? `${evt.latitude.toFixed(5)}, ${evt.longitude.toFixed(5)}` 
                                : "拒絕讀取"}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span>IP 位址：</span>
                            <span className="font-mono text-slate-300">{evt.ipAddress || "未知"}</span>
                          </div>
                          <div className="col-span-2 flex items-start gap-1">
                            <Laptop className="w-3.5 h-3.5 text-slate-600 flex-shrink-0 mt-0.5" />
                            <span className="truncate" title={evt.userAgent || "未知"}>
                              瀏覽器：{evt.userAgent || "未知"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/20 flex gap-3">
              <button
                onClick={(e) => {
                  setIsDrawerOpen(false);
                  openEditModal(selectedRecord, e);
                }}
                className="flex-grow py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-xs hover:from-amber-400 hover:to-amber-500 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-500/10 active:scale-[0.98]"
              >
                <Edit3 className="w-3.5 h-3.5" />
                修改此筆出勤紀錄
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 2. EDIT MODAL */}
      {/* ========================================== */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingRecord(null)} />
          
          <div className="relative w-full max-w-lg bg-[#0b0f19] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-[scaleIn_0.2s_ease-out] z-10 text-left">
            
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100">修改出勤紀錄</h3>
              <button onClick={() => setEditingRecord(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-5 text-sm">
              <p className="text-xs text-slate-400 font-semibold bg-slate-950/40 p-3 rounded-xl border border-slate-900">
                修改員工：<span className="text-slate-200 font-bold">{editingRecord.employee.name}</span> (工號: {editingRecord.employee.employeeCode})<br />
                出勤日期：<span className="text-slate-200 font-bold font-mono">{formatTaiwanDate(editingRecord.date)}</span>
              </p>

              {/* Clock In */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-400">上班打卡時間</label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editHasIn}
                      onChange={(e) => setEditHasIn(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-0"
                    />
                    設有上班時間
                  </label>
                </div>
                {editHasIn && (
                  <input
                    type="datetime-local"
                    required
                    value={editClockIn}
                    onChange={(e) => setEditClockIn(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                )}
              </div>

              {/* Clock Out */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-400">下班打卡時間</label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editHasOut}
                      onChange={(e) => setEditHasOut(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-0"
                    />
                    設有下班時間
                  </label>
                </div>
                {editHasOut && (
                  <input
                    type="datetime-local"
                    required
                    value={editClockOut}
                    onChange={(e) => setEditClockOut(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                )}
              </div>

              {/* Attendance Status */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400">出勤狀態審核</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
                >
                  <option value="NORMAL">正常 (NORMAL)</option>
                  <option value="LATE">遲到 (LATE)</option>
                  <option value="EARLY_LEAVE">早退 (EARLY_LEAVE)</option>
                  <option value="ABSENT">缺勤 (ABSENT)</option>
                  <option value="LEAVE">請假 (LEAVE)</option>
                </select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400">修正原因與備註</label>
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="請輸入修改的原因（例如：員工忘記打卡，店長手動補正）"
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50 placeholder:text-slate-700 leading-normal"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-xs font-bold text-slate-300 transition-all cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-xs hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {editSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  確認更新
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 3. CREATE / MANUAL COMPLEMENT MODAL */}
      {/* ========================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)} />
          
          <div className="relative w-full max-w-lg bg-[#0b0f19] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-[scaleIn_0.2s_ease-out] z-10 text-left">
            
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100">手動補登出勤紀錄</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-5 text-sm">
              
              {/* Select Employee */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400">選擇補登員工</label>
                <select
                  required
                  value={createEmployeeId}
                  onChange={(e) => setCreateEmployeeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
                >
                  <option value="">-- 請選擇員工 --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Date */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400">補登日期</label>
                <input
                  type="date"
                  required
                  value={createDate}
                  onChange={(e) => setCreateDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Clock In Time */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-400">補登上班時間 (CLOCK IN)</label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createHasIn}
                      onChange={(e) => setCreateHasIn(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-0"
                    />
                    補登此時間
                  </label>
                </div>
                {createHasIn && (
                  <input
                    type="time"
                    step="1"
                    required
                    value={createClockIn}
                    onChange={(e) => setCreateClockIn(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50 font-mono"
                  />
                )}
              </div>

              {/* Clock Out Time */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-400">補登下班時間 (CLOCK OUT)</label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createHasOut}
                      onChange={(e) => setCreateHasOut(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-0"
                    />
                    補登此時間
                  </label>
                </div>
                {createHasOut && (
                  <input
                    type="time"
                    step="1"
                    required
                    value={createClockOut}
                    onChange={(e) => setCreateClockOut(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50 font-mono"
                  />
                )}
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400">核定出勤狀態</label>
                <select
                  value={createStatus}
                  onChange={(e) => setCreateStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
                >
                  <option value="NORMAL">正常 (NORMAL)</option>
                  <option value="LATE">遲到 (LATE)</option>
                  <option value="EARLY_LEAVE">早退 (EARLY_LEAVE)</option>
                  <option value="ABSENT">缺勤 (ABSENT)</option>
                  <option value="LEAVE">請假 (LEAVE)</option>
                </select>
              </div>

              {/* Note */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400">補登原因與備註</label>
                <textarea
                  value={createNote}
                  onChange={(e) => setCreateNote(e.target.value)}
                  placeholder="請輸入手動補登的原因與註記資訊"
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50 placeholder:text-slate-700 leading-normal"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-xs font-bold text-slate-300 transition-all cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-xs hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {createSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  手動補登建立
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
