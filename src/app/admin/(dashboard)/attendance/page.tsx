"use client";

import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Search, 
  Plus, 
  Edit3, 
  Info, 
  X, 
  AlertCircle, 
  Filter, 
  Loader2,
  RefreshCw,
  HelpCircle,
  MapPin,
  CheckCircle2
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

  const getLocationBadgeClass = (status: string) => {
    switch (status) {
      case "NORMAL":
        return "bg-[#F0FDF4] text-[#166534] border border-[#F0FDF4]";
      case "SUSPICIOUS":
        return "bg-[#FFFBEB] text-[#B45309] border border-[#FFFBEB]";
      case "BLOCKED":
        return "bg-[#FEF2F2] text-[#B91C1C] border border-[#FEF2F2]";
      default:
        return "bg-[#F3F4F6] text-[#4B5563] border border-[#F3F4F6]";
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
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-[#E5E7EB] flex items-center justify-center text-[#111111]">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111111] tracking-tight">
              出勤管理中心
            </h1>
            <p className="text-xs text-[#666666] mt-0.5">
              檢視員工打卡紀錄、GPS 位置稽核、異常定位事件，並在需要時進行人工補登或出勤時間修正。
            </p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#111111] hover:bg-[#222222] transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            手動補登出勤
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-sm space-y-3">
        <h2 className="text-xs font-bold text-[#666666] tracking-wider flex items-center gap-1.5 uppercase">
          <Filter className="w-3.5 h-3.5 text-[#111111]" />
          篩選過濾條件
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          
          {/* Date Picker */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#666666]">日期</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
            />
          </div>

          {/* Employee Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#666666]">員工</label>
            <select
              value={filterEmployeeId}
              onChange={(e) => setFilterEmployeeId(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-[#111111] font-semibold"
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
            <label className="text-[10px] font-bold text-[#666666]">出勤狀態</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-[#111111] font-semibold"
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
            <label className="text-[10px] font-bold text-[#666666]">定位狀態</label>
            <select
              value={filterLocationStatus}
              onChange={(e) => setFilterLocationStatus(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-[#111111] font-semibold"
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
              className="text-[10px] font-bold text-[#666666] hover:text-[#111111] flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              重設篩選條件
            </button>
          </div>
        )}
      </div>

      {/* Main Records Board */}
      {loading ? (
        <div className="p-12 text-center border border-[#E5E7EB] rounded-xl bg-white text-[#666666]">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#111111]" />
          <p className="text-xs font-semibold mt-3">載入出勤資料中...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-dashed border-[#E5E7EB] bg-[#FAFAFA] text-[#666666]">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-[#888888]" />
          <p className="text-xs font-semibold">找不到符合條件的出勤紀錄</p>
          <p className="text-[10px] text-[#888888] mt-0.5">請嘗試修改篩選條件，或進行手動補登。</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] text-[#666666] font-bold uppercase tracking-wider sticky top-0">
                  <th className="py-2.5 px-4">日期</th>
                  <th className="py-2.5 px-4">員工編號</th>
                  <th className="py-2.5 px-4">員工姓名</th>
                  <th className="py-2.5 px-4">上班時間</th>
                  <th className="py-2.5 px-4">下班時間</th>
                  <th className="py-2.5 px-4 text-right">工時 (小時)</th>
                  <th className="py-2.5 px-4 text-center">出勤狀態</th>
                  <th className="py-2.5 px-4 text-center">定位狀態</th>
                  <th className="py-2.5 px-4 text-center">修改狀態</th>
                  <th className="py-2.5 px-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {records.map((record) => (
                  <tr 
                    key={record.id} 
                    onClick={() => openDrawer(record)}
                    className="hover:bg-[#F5F5F5] transition-colors text-[#111111] cursor-pointer group"
                  >
                    <td className="py-2.5 px-4 font-semibold font-mono">
                      {formatTaiwanDate(record.date)}
                    </td>
                    <td className="py-2.5 px-4 font-semibold font-mono text-[#666666]">
                      {record.employee.employeeCode}
                    </td>
                    <td className="py-2.5 px-4 font-bold">
                      {record.employee.name}
                    </td>
                    <td className="py-2.5 px-4 font-mono">
                      {formatTaiwanTime(record.clockInTime)}
                    </td>
                    <td className="py-2.5 px-4 font-mono">
                      {formatTaiwanTime(record.clockOutTime)}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-right">
                      {record.totalHours !== null ? record.totalHours.toFixed(2) : "-"}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadgeClass(record.status)}`}>
                        {getStatusText(record.status)}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${getLocationBadgeClass(record.summaryLocationStatus)}`}>
                        {getLocationText(record.summaryLocationStatus)}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {record.editedByBoss ? (
                        <span className="text-[10px] font-semibold text-[#B45309] bg-[#FFFBEB] border border-[#FFFBEB] px-1.5 py-0.5 rounded">
                          已變更
                        </span>
                      ) : (
                        <span className="text-[#888888]">-</span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={(e) => openEditModal(record, e)}
                          className="p-1.5 rounded border border-[#E5E7EB] bg-white hover:bg-[#F5F5F5] text-[#111111] transition-all cursor-pointer"
                          title="修改出勤時間與狀態"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openDrawer(record)}
                          className="p-1.5 rounded border border-[#E5E7EB] bg-white hover:bg-[#F5F5F5] text-[#111111] transition-all cursor-pointer"
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

      {/* ========================================================
          1. DETAIL DRAWER (Slide-out Panel)
         ======================================================== */}
      {isDrawerOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsDrawerOpen(false)} />
          
          <div className="absolute inset-y-0 right-0 max-w-xl w-full bg-white border-l border-[#E5E7EB] shadow-lg flex flex-col h-full animate-[slideInRight_0.25s_ease-out]">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#111111]">出勤詳細資料與軌跡</h3>
                <p className="text-[10px] text-[#666666] mt-0.5">
                  員工：{selectedRecord.employee.name} (工號: {selectedRecord.employee.employeeCode}) ‧ 日期: {formatTaiwanDate(selectedRecord.date)}
                </p>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded border border-[#E5E7EB] hover:bg-[#F5F5F5] text-[#666666] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-grow overflow-y-auto p-5 space-y-5 text-xs text-[#111111]">
              
              {/* Daily Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg bg-[#FAFAFA] border border-[#E5E7EB] text-xs">
                  <span className="text-[10px] text-[#666666] block font-semibold mb-1">今日核定上班</span>
                  <span className="text-xs font-bold">{formatTaiwanTime(selectedRecord.clockInTime)}</span>
                </div>
                <div className="p-3.5 rounded-lg bg-[#FAFAFA] border border-[#E5E7EB] text-xs">
                  <span className="text-[10px] text-[#666666] block font-semibold mb-1">今日核定下班</span>
                  <span className="text-xs font-bold">{formatTaiwanTime(selectedRecord.clockOutTime)}</span>
                </div>
                <div className="p-3.5 rounded-lg bg-[#FAFAFA] border border-[#E5E7EB] text-xs">
                  <span className="text-[10px] text-[#666666] block font-semibold mb-1">出勤狀態統計</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadgeClass(selectedRecord.status)}`}>
                    {getStatusText(selectedRecord.status)}
                  </span>
                </div>
                <div className="p-3.5 rounded-lg bg-[#FAFAFA] border border-[#E5E7EB] text-xs">
                  <span className="text-[10px] text-[#666666] block font-semibold mb-1">核定總工時</span>
                  <span className="text-xs font-mono font-bold text-blue-600">
                    {selectedRecord.totalHours !== null ? `${selectedRecord.totalHours.toFixed(2)} 小時` : "尚未下班"}
                  </span>
                </div>
              </div>

              {/* Note / Memo */}
              <div className="p-3.5 rounded-lg bg-[#FAFAFA] border border-[#E5E7EB]">
                <span className="text-[10px] text-[#666666] block font-semibold mb-1">備註 / 異動說明</span>
                <p className="text-xs font-medium italic text-[#111111]">
                  {selectedRecord.note ? selectedRecord.note : "無任何系統異動備註。"}
                </p>
              </div>

              {/* GPS Track timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider border-b border-[#E5E7EB] pb-1">
                  打卡定位稽核軌跡
                </h4>
                
                {selectedRecord.clockEvents.length === 0 ? (
                  <p className="text-xs text-[#666666] py-2">無打卡事件紀錄</p>
                ) : (
                  <div className="space-y-3">
                    {selectedRecord.clockEvents.map((evt, idx) => (
                      <div key={evt.id} className="p-3.5 rounded-lg border border-[#E5E7EB] bg-white space-y-2 relative">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                            evt.eventType === "CLOCK_IN" 
                              ? "bg-[#EFF6FF] text-[#1D4ED8] border-[#EFF6FF]" 
                              : "bg-[#F3F4F6] text-[#4B5563] border-[#F3F4F6]"
                          }`}>
                            {evt.eventType === "CLOCK_IN" ? "上班簽到" : "下班簽退"}
                          </span>
                          <span className="text-[10px] text-[#888888] font-mono">
                            {new Date(evt.timestamp).toLocaleString("zh-TW")}
                          </span>
                        </div>

                        {/* Location Details */}
                        <div className="grid grid-cols-2 gap-2 text-[10px] text-[#666666] pt-1">
                          <div>
                            <span className="block font-semibold">GPS 位置</span>
                            {evt.latitude !== null && evt.longitude !== null ? (
                              <span className="font-mono text-[#111111]">
                                {evt.latitude.toFixed(4)}, {evt.longitude.toFixed(4)}
                              </span>
                            ) : (
                              <span className="text-red-500 font-semibold">拒絕定位</span>
                            )}
                          </div>
                          <div>
                            <span className="block font-semibold">場所距離</span>
                            <span className="font-mono text-[#111111]">
                              {evt.distanceMeters !== null ? `${Math.round(evt.distanceMeters)} 公尺` : "無法核對"}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="block font-semibold">定位結果狀態</span>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${getLocationBadgeClass(evt.locationStatus)}`}>
                              {evt.locationStatus === "NORMAL" ? "店內範圍 (NORMAL)" : evt.locationStatus === "SUSPICIOUS" ? "異常位置 (SUSPICIOUS)" : evt.locationStatus === "BLOCKED" ? "超出阻擋 (BLOCKED)" : "拒絕定位"}
                            </span>
                          </div>
                        </div>

                        {/* IP and User Agent */}
                        <div className="text-[9px] text-[#888888] pt-1.5 border-t border-[#F5F5F5] flex flex-col gap-0.5">
                          <span>IP 位址: {evt.ipAddress || "未知"}</span>
                          <span className="truncate">瀏覽器代理: {evt.userAgent || "未知"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#E5E7EB] bg-[#FAFAFA] flex gap-2">
              <button 
                onClick={() => {
                  setIsDrawerOpen(false);
                  openEditModal(selectedRecord, { stopPropagation: () => {} } as any);
                }}
                className="flex-grow py-2 rounded-lg bg-[#111111] hover:bg-[#222222] text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                修改此筆出勤時間
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 2. EDIT MODAL (Dialog) */}
      {/* ========================================== */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-xl p-5 relative shadow-lg">
            <button 
              onClick={() => setEditingRecord(null)}
              className="absolute top-4 right-4 text-[#666666] hover:text-[#111111] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-2 mb-4">
              <Edit3 className="w-4 h-4 text-[#111111]" />
              <h2 className="text-sm font-bold text-[#111111]">修改出勤紀錄</h2>
            </div>

            <p className="text-[10px] text-[#666666] mb-3">
              正在修改「{editingRecord.employee.name}」於 {formatTaiwanDate(editingRecord.date)} 的出勤紀錄。
            </p>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              
              {/* Clock In */}
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#666666]">
                  <input
                    type="checkbox"
                    checked={editHasIn}
                    onChange={(e) => setEditHasIn(e.target.checked)}
                    className="rounded border-[#E5E7EB] text-[#111111] focus:ring-0 cursor-pointer"
                  />
                  啟用上班時間打卡
                </label>
                {editHasIn && (
                  <input
                    type="datetime-local"
                    required
                    value={editClockIn}
                    onChange={(e) => setEditClockIn(e.target.value)}
                    className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                  />
                )}
              </div>

              {/* Clock Out */}
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#666666]">
                  <input
                    type="checkbox"
                    checked={editHasOut}
                    onChange={(e) => setEditHasOut(e.target.checked)}
                    className="rounded border-[#E5E7EB] text-[#111111] focus:ring-0 cursor-pointer"
                  />
                  啟用下班時間打卡
                </label>
                {editHasOut && (
                  <input
                    type="datetime-local"
                    required
                    value={editClockOut}
                    onChange={(e) => setEditClockOut(e.target.value)}
                    className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                  />
                )}
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#666666]">核定出勤狀態</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-[#111111] font-semibold"
                >
                  <option value="NORMAL">正常 (NORMAL)</option>
                  <option value="LATE">遲到 (LATE)</option>
                  <option value="EARLY_LEAVE">早退 (EARLY_LEAVE)</option>
                  <option value="ABSENT">缺勤 (ABSENT)</option>
                  <option value="LEAVE">請假 (LEAVE)</option>
                </select>
              </div>

              {/* Note */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#666666]">店長備註/異動說明</label>
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="請輸入此筆出勤異動的詳細原因，以供稽核安全查閱。"
                  className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-[#111111] placeholder:text-slate-400 leading-normal h-16 resize-none"
                />
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="flex-1 py-2 rounded-lg border border-[#E5E7EB] bg-white text-[#666666] font-semibold hover:bg-[#F5F5F5] transition-all cursor-pointer text-center"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-grow py-2 rounded-lg bg-[#111111] hover:bg-[#222222] text-white font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer text-center"
                >
                  {editSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  確認修改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 3. CREATE MODAL (補登出勤) */}
      {/* ========================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-xl p-5 relative shadow-lg">
            <button 
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 text-[#666666] hover:text-[#111111] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-2 mb-4">
              <Plus className="w-4 h-4 text-[#111111]" />
              <h2 className="text-sm font-bold text-[#111111]">手動新增出勤補登</h2>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              
              {/* Employee */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#666666]">選擇補登員工</label>
                <select
                  required
                  value={createEmployeeId}
                  onChange={(e) => setCreateEmployeeId(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-[#111111] font-semibold"
                >
                  <option value="">-- 請選擇員工 --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#666666]">選擇補登日期</label>
                <input
                  type="date"
                  required
                  value={createDate}
                  onChange={(e) => setCreateDate(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                />
              </div>

              {/* Clock In */}
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#666666]">
                  <input
                    type="checkbox"
                    checked={createHasIn}
                    onChange={(e) => setCreateHasIn(e.target.checked)}
                    className="rounded border-[#E5E7EB] text-[#111111] focus:ring-0 cursor-pointer"
                  />
                  補登上班打卡時間
                </label>
                {createHasIn && (
                  <input
                    type="time"
                    required
                    step="1"
                    value={createClockIn}
                    onChange={(e) => setCreateClockIn(e.target.value)}
                    className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-[#111111] font-mono"
                  />
                )}
              </div>

              {/* Clock Out */}
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#666666]">
                  <input
                    type="checkbox"
                    checked={createHasOut}
                    onChange={(e) => setCreateHasOut(e.target.checked)}
                    className="rounded border-[#E5E7EB] text-[#111111] focus:ring-0 cursor-pointer"
                  />
                  補登下班打卡時間
                </label>
                {createHasOut && (
                  <input
                    type="time"
                    required
                    step="1"
                    value={createClockOut}
                    onChange={(e) => setCreateClockOut(e.target.value)}
                    className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-[#111111] font-mono"
                  />
                )}
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#666666]">核定出勤狀態</label>
                <select
                  value={createStatus}
                  onChange={(e) => setCreateStatus(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-[#111111] font-semibold"
                >
                  <option value="NORMAL">正常 (NORMAL)</option>
                  <option value="LATE">遲到 (LATE)</option>
                  <option value="EARLY_LEAVE">早退 (EARLY_LEAVE)</option>
                  <option value="ABSENT">缺勤 (ABSENT)</option>
                  <option value="LEAVE">請假 (LEAVE)</option>
                </select>
              </div>

              {/* Note */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#666666]">補登原因說明</label>
                <textarea
                  value={createNote}
                  onChange={(e) => setCreateNote(e.target.value)}
                  placeholder="請說明此筆人工新增補登的具體事由（如：忘記帶打卡手機、員工遲到由主管代行等）"
                  className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-[#111111] placeholder:text-slate-400 leading-normal h-16 resize-none"
                />
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2 rounded-lg border border-[#E5E7EB] bg-white text-[#666666] font-semibold hover:bg-[#F5F5F5] transition-all cursor-pointer text-center"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="flex-grow py-2 rounded-lg bg-[#111111] hover:bg-[#222222] text-white font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer text-center"
                >
                  {createSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  確認補登
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
