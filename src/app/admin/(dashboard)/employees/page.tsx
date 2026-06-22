"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Key, 
  UserCheck, 
  UserX, 
  Loader2, 
  AlertCircle,
  Phone,
  DollarSign,
  UserPlus,
  Calendar,
  X
} from "lucide-react";

interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  phone: string | null;
  hourlyRate: number;
  isActive: boolean;
  createdAt: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPinOpen, setIsPinOpen] = useState(false);
  
  // Active employee for edit/PIN change
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Form states
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRate, setFormRate] = useState("");
  const [formPin, setFormPin] = useState("");
  
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Fetch employees
  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/employees");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "無法取得員工清單");
      }
      setEmployees(data.employees || []);
    } catch (err: any) {
      setError(err.message || "取得員工資料時發生錯誤");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Format date: e.g., 2026/06/22
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormCode("");
    setFormName("");
    setFormPhone("");
    setFormRate("");
    setFormPin("");
    setFormError(null);
    setIsCreateOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (emp: Employee) => {
    setSelectedEmployee(emp);
    setFormName(emp.name);
    setFormPhone(emp.phone || "");
    setFormRate(emp.hourlyRate.toString());
    setFormError(null);
    setIsEditOpen(true);
  };

  // Open PIN Modal
  const handleOpenPin = (emp: Employee) => {
    setSelectedEmployee(emp);
    setFormPin("");
    setFormError(null);
    setIsPinOpen(true);
  };

  // Handle Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    const rate = parseFloat(formRate);
    if (isNaN(rate) || rate < 0) {
      setFormError("時薪必須為大於或等於 0 的數字");
      setFormLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeCode: formCode.toUpperCase().trim(),
          name: formName.trim(),
          phone: formPhone.trim() || null,
          hourlyRate: rate,
          pin: formPin.trim()
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "新增員工失敗");
      }

      setIsCreateOpen(false);
      fetchEmployees();
    } catch (err: any) {
      setFormError(err.message || "發生未知錯誤");
    } finally {
      setFormLoading(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    setFormError(null);
    setFormLoading(true);

    const rate = parseFloat(formRate);
    if (isNaN(rate) || rate < 0) {
      setFormError("時薪必須為大於或等於 0 的數字");
      setFormLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/admin/employees/${selectedEmployee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          phone: formPhone.trim() || null,
          hourlyRate: rate,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "更新員工資料失敗");
      }

      setIsEditOpen(false);
      fetchEmployees();
    } catch (err: any) {
      setFormError(err.message || "發生未知錯誤");
    } finally {
      setFormLoading(false);
    }
  };

  // Handle PIN Submit
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    setFormError(null);
    setFormLoading(true);

    try {
      const response = await fetch(`/api/admin/employees/${selectedEmployee.id}/pin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: formPin.trim()
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "密碼變更失敗");
      }

      setIsPinOpen(false);
      alert("員工打卡密碼已變更成功！");
    } catch (err: any) {
      setFormError(err.message || "發生未知錯誤");
    } finally {
      setFormLoading(false);
    }
  };

  // Toggle Active Status
  const handleToggleStatus = async (emp: Employee) => {
    const actionText = emp.isActive ? "停用" : "啟用";
    if (!confirm(`確定要${actionText}員工「${emp.name}」的打卡權限嗎？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/employees/${emp.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: !emp.isActive
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `操作失敗`);
      }

      fetchEmployees();
    } catch (err: any) {
      alert(err.message || "狀態更新失敗");
    }
  };

  // Filtered employees
  const filteredEmployees = employees.filter((emp) => {
    const search = searchTerm.toLowerCase().trim();
    return (
      emp.name.toLowerCase().includes(search) ||
      emp.employeeCode.toLowerCase().includes(search) ||
      (emp.phone && emp.phone.includes(search))
    );
  });

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl glass-card relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-2xl -z-10" />
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-amber-200 to-red-400 bg-clip-text text-transparent">
              員工資料管理
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              設定系統員工的識別工號、聯絡電話、時薪以及獨立的打卡密碼。
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer shadow-lg shadow-amber-500/10 active:scale-[0.98] flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          新增員工
        </button>
      </div>

      {/* Filter and Table Container */}
      <div className="p-6 rounded-2xl glass-card space-y-4">
        
        {/* Search Filter */}
        <div className="relative max-w-sm group">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500 group-focus-within:text-amber-500 transition-colors">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜尋姓名、編號或電話..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/50 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/70 transition-all"
          />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Employee Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/20">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 font-semibold text-xs tracking-wider">
                <th className="py-4 px-5">員工工號</th>
                <th className="py-4 px-5">員工姓名</th>
                <th className="py-4 px-5">聯絡電話</th>
                <th className="py-4 px-5">時薪</th>
                <th className="py-4 px-5">狀態</th>
                <th className="py-4 px-5">建立日期</th>
                <th className="py-4 px-5 text-right">功能操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                      載入員工資料中...
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    沒有找到符合條件的員工
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr 
                    key={emp.id} 
                    className="border-b border-slate-900 hover:bg-slate-900/20 transition-colors text-slate-300"
                  >
                    <td className="py-4 px-5 font-mono font-bold text-amber-500">{emp.employeeCode}</td>
                    <td className="py-4 px-5 font-bold text-slate-100">{emp.name}</td>
                    <td className="py-4 px-5 text-slate-400 font-medium">
                      {emp.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          {emp.phone}
                        </span>
                      ) : (
                        <span className="text-slate-600">未提供</span>
                      )}
                    </td>
                    <td className="py-4 px-5 font-semibold text-slate-200">
                      ${emp.hourlyRate} <span className="text-[10px] text-slate-500">/ 小時</span>
                    </td>
                    <td className="py-4 px-5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        emp.isActive 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${emp.isActive ? "bg-emerald-400" : "bg-red-400"}`} />
                        {emp.isActive ? "啟用中" : "已停用"}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-xs text-slate-500 font-medium">
                      {formatDate(emp.createdAt)}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        
                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEdit(emp)}
                          className="p-2 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all cursor-pointer"
                          title="編輯資料"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        
                        {/* Change PIN Button */}
                        <button
                          onClick={() => handleOpenPin(emp)}
                          className="p-2 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all cursor-pointer"
                          title="修改打卡密碼"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        
                        {/* Toggle Status Button */}
                        <button
                          onClick={() => handleToggleStatus(emp)}
                          className={`p-2 rounded-lg border transition-all cursor-pointer ${
                            emp.isActive 
                              ? "border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/15" 
                              : "border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/15"
                          }`}
                          title={emp.isActive ? "停用此員工" : "啟用此員工"}
                        >
                          {emp.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </button>

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================
          CREATE EMPLOYEE MODAL
         ======================================================== */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md glass-card rounded-2xl p-6 relative">
            <button 
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 mb-6">
              <UserPlus className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-slate-100">新增員工帳號</h2>
            </div>
            
            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p>{formError}</p>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">員工編號 (工號)</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="例如: A001"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900 text-sm text-slate-200 focus:outline-none focus:border-amber-500/70"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">員工姓名</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="請輸入姓名"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900 text-sm text-slate-200 focus:outline-none focus:border-amber-500/70"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">聯絡電話 (選填)</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="請輸入電話 (選填)"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900 text-sm text-slate-200 focus:outline-none focus:border-amber-500/70"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">設定時薪</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={formRate}
                    onChange={(e) => setFormRate(e.target.value)}
                    placeholder="每小時工資"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900 text-sm text-slate-200 focus:outline-none focus:border-amber-500/70"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">4位數打卡 PIN</label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    value={formPin}
                    onChange={(e) => setFormPin(e.target.value)}
                    placeholder="純數字"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900 text-sm text-slate-200 focus:outline-none focus:border-amber-500/70"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 py-2.5 border border-slate-800 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900 font-semibold text-sm transition-all"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2.5 rounded-xl text-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 font-bold text-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  確認新增
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          EDIT EMPLOYEE DETAILS MODAL
         ======================================================== */}
      {isEditOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md glass-card rounded-2xl p-6 relative">
            <button 
              onClick={() => setIsEditOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 mb-6">
              <Edit2 className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-slate-100">編輯員工資料 ({selectedEmployee.employeeCode})</h2>
            </div>
            
            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p>{formError}</p>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">員工姓名</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="請輸入姓名"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900 text-sm text-slate-200 focus:outline-none focus:border-amber-500/70"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">聯絡電話 (選填)</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="請輸入電話 (選填)"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900 text-sm text-slate-200 focus:outline-none focus:border-amber-500/70"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">設定時薪</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={formRate}
                  onChange={(e) => setFormRate(e.target.value)}
                  placeholder="每小時工資"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900 text-sm text-slate-200 focus:outline-none focus:border-amber-500/70"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="flex-1 py-2.5 border border-slate-800 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900 font-semibold text-sm transition-all"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2.5 rounded-xl text-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 font-bold text-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  確認變更
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          CHANGE EMPLOYEE PIN MODAL
         ======================================================== */}
      {isPinOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md glass-card rounded-2xl p-6 relative">
            <button 
              onClick={() => setIsPinOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 mb-6">
              <Key className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-slate-100">變更打卡密碼</h2>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              即將變更員工「{selectedEmployee.name}」的四位數打卡安全 PIN 碼。
            </p>
            
            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p>{formError}</p>
              </div>
            )}

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">新 4 位數打卡密碼 (PIN)</label>
                <input
                  type="password"
                  required
                  maxLength={4}
                  value={formPin}
                  onChange={(e) => setFormPin(e.target.value)}
                  placeholder="請輸入 4 位數純數字"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900 text-sm text-slate-200 focus:outline-none focus:border-amber-500/70"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsPinOpen(false)}
                  className="flex-1 py-2.5 border border-slate-800 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900 font-semibold text-sm transition-all"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2.5 rounded-xl text-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 font-bold text-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  確認變更
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
