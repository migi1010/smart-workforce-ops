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
  UserPlus,
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

  // Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    try {
      const response = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeCode: formCode.trim(),
          name: formName.trim(),
          phone: formPhone.trim() || null,
          hourlyRate: parseFloat(formRate),
          pin: formPin.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "新增失敗");
      }

      setIsCreateOpen(false);
      fetchEmployees();
    } catch (err: any) {
      setFormError(err.message || "新增員工時發生錯誤");
    } finally {
      setFormLoading(false);
    }
  };

  // Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    setFormError(null);
    setFormLoading(true);

    try {
      const response = await fetch(`/api/admin/employees?id=${selectedEmployee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          phone: formPhone.trim() || null,
          hourlyRate: parseFloat(formRate),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "更新失敗");
      }

      setIsEditOpen(false);
      fetchEmployees();
    } catch (err: any) {
      setFormError(err.message || "更新員工資料時發生錯誤");
    } finally {
      setFormLoading(false);
    }
  };

  // PIN Submit
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    setFormError(null);
    setFormLoading(true);

    try {
      const response = await fetch(`/api/admin/employees?id=${selectedEmployee.id}&action=pin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: formPin.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "密碼更新失敗");
      }

      setIsPinOpen(false);
      fetchEmployees();
    } catch (err: any) {
      setFormError(err.message || "更新密碼時發生錯誤");
    } finally {
      setFormLoading(false);
    }
  };

  // Toggle employee status
  const handleToggleStatus = async (emp: Employee) => {
    const actionName = emp.isActive ? "停用" : "啟用";
    if (!confirm(`確定要${actionName}員工「${emp.name}」的帳號嗎？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/employees?id=${emp.id}&action=status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: !emp.isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `${actionName}失敗`);
      }

      fetchEmployees();
    } catch (err: any) {
      alert(err.message || `進行${actionName}操作時發生錯誤`);
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
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-[#E5E7EB] flex items-center justify-center text-[#111111]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111111] tracking-tight">
              員工資料管理
            </h1>
            <p className="text-xs text-[#666666] mt-0.5">
              設定系統員工的識別工號、聯絡電話、時薪以及獨立的打卡密碼。
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs text-white bg-[#111111] hover:bg-[#222222] transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          新增員工
        </button>
      </div>

      {/* Filter and Table Container */}
      <div className="p-5 rounded-xl border border-[#E5E7EB] bg-white shadow-sm space-y-4">
        
        {/* Search Filter */}
        <div className="relative max-w-sm group">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 group-focus-within:text-[#111111] transition-colors">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜尋姓名、編號或電話..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#E5E7EB] bg-white text-xs text-[#111111] placeholder-slate-400 focus:outline-none focus:border-[#111111] transition-all"
          />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#FEF2F2] border border-red-200 text-[#B91C1C] text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="font-semibold">{error}</p>
          </div>
        )}

        {/* Employee Table */}
        <div className="overflow-x-auto rounded-lg border border-[#E5E7EB]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] text-[#666666] font-bold uppercase tracking-wider sticky top-0">
                <th className="py-2.5 px-4">員工工號</th>
                <th className="py-2.5 px-4">員工姓名</th>
                <th className="py-2.5 px-4">聯絡電話</th>
                <th className="py-2.5 px-4">時薪</th>
                <th className="py-2.5 px-4">狀態</th>
                <th className="py-2.5 px-4">建立日期</th>
                <th className="py-2.5 px-4 text-right">功能操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#666666]">
                    <div className="inline-flex items-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin text-[#111111]" />
                      載入員工資料中...
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#666666]">
                    沒有找到符合條件的員工
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr 
                    key={emp.id} 
                    className="hover:bg-[#F5F5F5] transition-colors text-[#111111]"
                  >
                    <td className="py-2.5 px-4 font-mono font-semibold text-[#111111]">{emp.employeeCode}</td>
                    <td className="py-2.5 px-4 font-bold">{emp.name}</td>
                    <td className="py-2.5 px-4 text-[#666666] font-medium">
                      {emp.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#666666]" />
                          {emp.phone}
                        </span>
                      ) : (
                        <span className="text-[#888888]">未提供</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-[#111111]">
                      NT$ {emp.hourlyRate} <span className="text-[10px] text-[#666666] font-normal">/ 小時</span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                        emp.isActive 
                          ? "bg-[#EFF6FF] text-[#1D4ED8] border-[#EFF6FF]" 
                          : "bg-[#F3F4F6] text-[#4B5563] border-[#F3F4F6]"
                      }`}>
                        {emp.isActive ? "啟用中" : "已停用"}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-[10px] text-[#666666] font-medium">
                      {formatDate(emp.createdAt)}
                    </td>
                    <td className="py-2 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        
                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEdit(emp)}
                          className="p-1.5 rounded border border-[#E5E7EB] bg-white hover:bg-[#F5F5F5] text-[#111111] transition-all cursor-pointer"
                          title="編輯資料"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        
                        {/* Change PIN Button */}
                        <button
                          onClick={() => handleOpenPin(emp)}
                          className="p-1.5 rounded border border-[#E5E7EB] bg-white hover:bg-[#F5F5F5] text-[#111111] transition-all cursor-pointer"
                          title="修改打卡密碼"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        
                        {/* Toggle Status Button */}
                        <button
                          onClick={() => handleToggleStatus(emp)}
                          className={`p-1.5 rounded border transition-all cursor-pointer ${
                            emp.isActive 
                              ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100" 
                              : "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-xl p-5 relative shadow-lg">
            <button 
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 text-[#666666] hover:text-[#111111] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="w-4 h-4 text-[#111111]" />
              <h2 className="text-sm font-bold text-[#111111]">新增員工帳號</h2>
            </div>
            
            {formError && (
              <div className="mb-3 p-2.5 rounded-lg bg-[#FEF2F2] border border-red-200 text-[#B91C1C] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p>{formError}</p>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#666666]">員工編號 (工號)</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="例如: A001"
                    className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#666666]">員工姓名</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="請輸入姓名"
                    className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#666666]">聯絡電話 (選填)</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="請輸入電話 (選填)"
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#666666]">設定時薪</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={formRate}
                    onChange={(e) => setFormRate(e.target.value)}
                    placeholder="每小時工資"
                    className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#666666]">4位數打卡 PIN</label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    value={formPin}
                    onChange={(e) => setFormPin(e.target.value)}
                    placeholder="純數字"
                    className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 py-2 rounded-lg border border-[#E5E7EB] bg-white text-[#666666] font-semibold hover:bg-[#F5F5F5] transition-all cursor-pointer text-center"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2 rounded-lg bg-[#111111] hover:bg-[#222222] text-white font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer text-center"
                >
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-xl p-5 relative shadow-lg">
            <button 
              onClick={() => setIsEditOpen(false)}
              className="absolute top-4 right-4 text-[#666666] hover:text-[#111111] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-4">
              <Edit2 className="w-4 h-4 text-[#111111]" />
              <h2 className="text-sm font-bold text-[#111111]">編輯員工資料 ({selectedEmployee.employeeCode})</h2>
            </div>
            
            {formError && (
              <div className="mb-3 p-2.5 rounded-lg bg-[#FEF2F2] border border-red-200 text-[#B91C1C] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p>{formError}</p>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#666666]">員工姓名</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="請輸入姓名"
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#666666]">聯絡電話 (選填)</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="請輸入電話 (選填)"
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#666666]">設定時薪</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={formRate}
                  onChange={(e) => setFormRate(e.target.value)}
                  placeholder="每小時工資"
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                />
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="flex-1 py-2 rounded-lg border border-[#E5E7EB] bg-white text-[#666666] font-semibold hover:bg-[#F5F5F5] transition-all cursor-pointer text-center"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2 rounded-lg bg-[#111111] hover:bg-[#222222] text-white font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer text-center"
                >
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-xl p-5 relative shadow-lg">
            <button 
              onClick={() => setIsPinOpen(false)}
              className="absolute top-4 right-4 text-[#666666] hover:text-[#111111] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-4 h-4 text-[#111111]" />
              <h2 className="text-sm font-bold text-[#111111]">變更打卡密碼</h2>
            </div>

            <p className="text-xs text-[#666666] mb-3">
              即將變更員工「{selectedEmployee.name}」的四位數打卡安全 PIN 碼。
            </p>
            
            {formError && (
              <div className="mb-3 p-2.5 rounded-lg bg-[#FEF2F2] border border-red-200 text-[#B91C1C] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p>{formError}</p>
              </div>
            )}

            <form onSubmit={handlePinSubmit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#666666]">新 4 位數打卡密碼 (PIN)</label>
                <input
                  type="password"
                  required
                  maxLength={4}
                  value={formPin}
                  onChange={(e) => setFormPin(e.target.value)}
                  placeholder="請輸入 4 位數純數字"
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                />
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsPinOpen(false)}
                  className="flex-1 py-2 rounded-lg border border-[#E5E7EB] bg-white text-[#666666] font-semibold hover:bg-[#F5F5F5] transition-all cursor-pointer text-center"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2 rounded-lg bg-[#111111] hover:bg-[#222222] text-white font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer text-center"
                >
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
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
