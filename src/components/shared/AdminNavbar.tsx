"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, User, Shield, Users, Calendar, BarChart3, ShieldAlert, Clock, Settings, QrCode, Coins } from "lucide-react";
import Link from "next/link";

interface AdminNavbarProps {
  adminName: string;
  adminUsername: string;
}

export default function AdminNavbar({ adminName, adminUsername }: AdminNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
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

  return (
    <nav className="border-b border-slate-800 bg-[#0b0f19] px-6 py-4 sticky top-0 z-50 backdrop-blur-md bg-opacity-80">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center font-bold text-black text-lg shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            八
          </div>
          <div>
            <Link href="/admin" className="font-extrabold text-lg text-slate-100 hover:text-amber-400 transition-colors block leading-tight">
              八方雲集
            </Link>
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
              三峽國際店 ‧ 管理後台
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.disabled ? "#" : item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-amber-500/10 text-amber-500 border border-amber-500/25"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                } ${item.disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* User profile & Action */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
            <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-slate-200 leading-tight">
                {adminName}
              </p>
              <p className="text-[10px] text-slate-500 leading-none">
                @{adminUsername}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-red-400 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            title="登出系統"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">登出</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
