"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { 
  LogOut, 
  User, 
  Users, 
  Calendar, 
  BarChart3, 
  ShieldAlert, 
  Settings, 
  QrCode, 
  Coins, 
  Menu, 
  X 
} from "lucide-react";
import Link from "next/link";

interface AdminNavbarProps {
  adminName: string;
  adminUsername: string;
}

export default function AdminNavbar({ adminName, adminUsername }: AdminNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close drawer on Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDrawerOpen(false);
      }
    };
    if (isDrawerOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDrawerOpen]);

  // Close drawer when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setIsDrawerOpen(false);
      }
    };
    if (isDrawerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDrawerOpen]);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
        setIsDrawerOpen(false);
        router.push("/admin/login");
        router.refresh();
      }
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const navItems = [
    { name: "儀表板", href: "/admin", icon: BarChart3 },
    { name: "員工管理", href: "/admin/employees", icon: Users },
    { name: "工作地設定", href: "/admin/workplace", icon: Settings },
    { name: "打卡 QR Code", href: "/admin/qr-code", icon: QrCode },
    { name: "出勤紀錄", href: "/admin/attendance", icon: Calendar },
    { name: "薪資報表", href: "/admin/payroll", icon: Coins },
    { name: "系統日誌", href: "/admin/logs", icon: ShieldAlert, disabled: true },
  ];

  const handleLinkClick = () => {
    setIsDrawerOpen(false);
  };

  return (
    <>
      {/* 1. DESKTOP SIDEBAR */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:left-0 bg-white border-r border-[#E5E7EB] z-30">
        {/* Brand/Header */}
        <div className="p-6 border-b border-[#E5E7EB] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#111111] flex items-center justify-center font-bold text-white text-base">
            八
          </div>
          <div>
            <Link href="/admin" className="font-bold text-base text-[#111111] hover:text-black transition-colors block leading-tight">
              八方雲集
            </Link>
            <span className="text-[10px] text-[#666666] font-semibold uppercase tracking-wider block">
              三峽國際店 ‧ 管理後台
            </span>
          </div>
        </div>

        {/* Nav Links */}
        <div className="flex-grow p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.disabled ? "#" : item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#F5F5F5] text-[#111111] font-semibold"
                    : "text-[#666666] hover:text-[#111111] hover:bg-[#FAFAFA]"
                } ${item.disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* User profile & Action */}
        <div className="p-4 border-t border-[#E5E7EB] space-y-3 bg-[#FAFAFA]">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-white border border-[#E5E7EB]">
            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[#666666]">
              <User className="w-4 h-4" />
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-xs font-semibold text-[#111111] leading-tight truncate">
                {adminName}
              </p>
              <p className="text-[10px] text-[#666666] leading-none truncate">
                @{adminUsername}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold border border-[#E5E7EB] bg-white hover:bg-[#F5F5F5] text-[#111111] transition-all cursor-pointer disabled:opacity-50"
            title="登出系統"
          >
            <LogOut className="w-4 h-4" />
            <span>登出</span>
          </button>
        </div>
      </aside>

      {/* 2. MOBILE HEADER */}
      <header className="md:hidden sticky top-0 z-40 bg-white border-b border-[#E5E7EB] h-14 flex items-center justify-between px-4 w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-[#111111] flex items-center justify-center font-bold text-white text-xs">
            八
          </div>
          <div>
            <Link href="/admin" className="font-bold text-xs text-[#111111] leading-tight block">
              八方雲集三峽國際店
            </Link>
            <span className="text-[9px] text-[#666666] leading-none block">
              管理後台
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsDrawerOpen(true)}
          aria-label="開啟導覽選單"
          className="p-1.5 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F5F5F5] text-[#111111] transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* 3. MOBILE DRAWER OVERLAY */}
      {isDrawerOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/40 z-50 transition-opacity animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setIsDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 4. MOBILE DRAWER CONTAINER */}
      <div
        ref={drawerRef}
        className={`md:hidden fixed inset-y-0 left-0 w-72 bg-white border-r border-[#E5E7EB] z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="行動版選單"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-[#111111] flex items-center justify-center font-bold text-white text-sm">
              八
            </div>
            <div>
              <span className="font-bold text-sm text-[#111111] block leading-tight">八方雲集</span>
              <span className="text-[9px] text-[#666666] block">管理後台</span>
            </div>
          </div>
          <button
            onClick={() => setIsDrawerOpen(false)}
            aria-label="關閉導覽選單"
            className="p-1.5 rounded-lg border border-[#E5E7EB] hover:bg-[#F5F5F5] text-[#666666] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Links */}
        <div className="flex-grow p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.disabled ? "#" : item.href}
                onClick={handleLinkClick}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#F5F5F5] text-[#111111] font-semibold"
                    : "text-[#666666] hover:text-[#111111] hover:bg-[#FAFAFA]"
                } ${item.disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Drawer Footer / User profile */}
        <div className="p-4 border-t border-[#E5E7EB] space-y-3 bg-[#FAFAFA]">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-white border border-[#E5E7EB]">
            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[#666666]">
              <User className="w-4 h-4" />
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-xs font-semibold text-[#111111] leading-tight truncate">
                {adminName}
              </p>
              <p className="text-[10px] text-[#666666] leading-none truncate">
                @{adminUsername}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg text-sm font-semibold border border-[#E5E7EB] bg-white hover:bg-[#F5F5F5] text-[#111111] transition-all cursor-pointer disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            <span>登出</span>
          </button>
        </div>
      </div>
    </>
  );
}
