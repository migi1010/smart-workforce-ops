"use client";

import React, { useState, useEffect } from "react";
import { 
  Clock, 
  Users, 
  ShieldAlert, 
  Navigation, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowLeft,
  Lock
} from "lucide-react";
import Link from "next/link";

interface Employee {
  id: string;
  name: string;
  employeeCode: string;
}

interface Workplace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  allowedRadiusMeters: number;
  warningRadiusMeters: number;
}

export default function ClockPage() {
  const [time, setTime] = useState<Date | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [workplace, setWorkplace] = useState<Workplace | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // Selection / inputs
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [pin, setPin] = useState<string>("");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"IDLE" | "REQUESTING" | "SUCCESS" | "ERROR">("IDLE");
  
  // App states
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<any | null>(null);

  // Live Clock Interval
  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Token and GPS on Mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    
    if (tokenParam) {
      setToken(tokenParam);
      loadWorkplaceData(tokenParam);
    } else {
      setError("未提供工作場所 Token。請掃描合法的 QR Code 進入打卡頁面。");
      setLoading(false);
    }

    requestGPSLocation();
  }, []);

  const loadWorkplaceData = async (tokenParam: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/clock/workplace?token=${tokenParam}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "無法載入工作場所資料");
      }
      const data = await res.json();
      setWorkplace(data.workplace);
      setEmployees(data.employees);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "工作場所資料載入失敗");
    } finally {
      setLoading(false);
    }
  };

  const requestGPSLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus("ERROR");
      return;
    }

    setGpsStatus("REQUESTING");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setGpsStatus("SUCCESS");
      },
      (err) => {
        console.error("GPS error:", err);
        setGpsStatus("ERROR");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Submit Clock In/Out
  const handleClockSubmit = async (eventType: "CLOCK_IN" | "CLOCK_OUT") => {
    if (!token) return;
    if (!selectedEmployeeId) {
      alert("請選擇您的姓名");
      return;
    }
    if (pin.length !== 4) {
      alert("請輸入四位數個人安全密碼");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSubmitResult(null);

      const res = await fetch("/api/clock/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workplaceToken: token,
          employeeId: selectedEmployeeId,
          pin,
          eventType,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "打卡失敗");
      }

      setSubmitResult(data.feedback);
      setPin(""); // Clear pin after success
    } catch (err: any) {
      console.error(err);
      setError(err.message || "連線逾時，請重試");
    } finally {
      setSubmitting(false);
    }
  };

  // Format date: e.g., 2026年06月22日 星期一
  const formatDate = (date: Date) => {
    const days = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dayName = days[date.getDay()];
    return `${year}年${month}月${day}日 ${dayName}`;
  };

  const formatTime = (date: Date) => {
    return date.toTimeString().split(" ")[0];
  };

  if (loading) {
    return (
      <main className="flex-grow flex flex-col items-center justify-center min-h-screen px-4 bg-[#070b16] text-slate-100">
        <div className="space-y-4 text-center">
          <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto" />
          <p className="text-slate-400 font-semibold">讀取打卡系統中，請稍候...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-grow flex flex-col items-center justify-center min-h-screen px-4 py-8 relative overflow-hidden bg-[#070b16]">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/4 left-1/10 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl animate-pulse-slow -z-10" />
      <div className="absolute bottom-1/4 right-1/10 w-96 h-96 bg-red-600/5 rounded-full blur-3xl animate-pulse-slow -z-10" />

      {/* Main Container */}
      <div className="w-full max-w-xl text-center space-y-6 z-10">
        
        {/* Branding Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/5 text-amber-500 text-xs font-semibold tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            官方出勤打卡通道
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-amber-400 via-amber-200 to-red-400 bg-clip-text text-transparent leading-tight">
            {workplace ? workplace.name : "三峽八方雲集國際店"}
          </h1>
          <p className="text-slate-400 font-medium text-xs sm:text-sm">
            員工自主定位打卡系統
          </p>
        </div>

        {/* Live Digital Clock Panel */}
        <div className="glass-card rounded-3xl p-6 shadow-2xl border border-slate-800 relative group overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-amber-300 to-red-500" />
          <div className="space-y-1">
            <p className="text-slate-400 text-xs sm:text-sm font-semibold tracking-wider">
              {time ? formatDate(time) : "載入中..."}
            </p>
            <h2 className="text-4xl sm:text-5xl font-mono font-black text-slate-100 tracking-tight select-none">
              {time ? formatTime(time) : "00:00:00"}
            </h2>
          </div>
        </div>

        {/* Feedback Section (Success/Error Message Card) */}
        {submitResult && (
          <div className="glass-card border border-emerald-500/40 bg-emerald-500/5 rounded-2xl p-5 text-left space-y-3 animate-[slideIn_0.2s_ease-out]">
            <div className="flex items-center gap-2.5 text-emerald-400">
              <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
              <h3 className="font-extrabold text-base">打卡成功！</h3>
            </div>
            <div className="text-sm text-slate-300 space-y-1 border-t border-slate-800/80 pt-2 grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs text-slate-500 block">打卡員工</span>
                <span className="font-bold text-slate-200">{submitResult.employeeName}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">打卡類別</span>
                <span className={`font-bold ${submitResult.eventType === "CLOCK_IN" ? "text-amber-400" : "text-indigo-400"}`}>
                  {submitResult.eventType === "CLOCK_IN" ? "上班打卡 ⊙" : "下班打卡 ⊙"}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-slate-500 block">打卡時間</span>
                <span className="font-mono text-slate-200">{new Date(submitResult.timestamp).toLocaleString("zh-TW")}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">定位狀態</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                  submitResult.locationStatus === "NORMAL" 
                    ? "bg-emerald-500/10 text-emerald-400" 
                    : "bg-amber-500/10 text-amber-400"
                }`}>
                  {submitResult.locationStatus === "NORMAL" ? "範圍內 (NORMAL)" : "範圍外 (SUSPICIOUS)"}
                </span>
              </div>
              {submitResult.eventType === "CLOCK_OUT" && (
                <div>
                  <span className="text-xs text-slate-500 block">今日累計工時</span>
                  <span className="font-bold text-slate-100">{submitResult.totalHours.toFixed(2)} 小時</span>
                </div>
              )}
            </div>
            <button 
              onClick={() => setSubmitResult(null)}
              className="w-full mt-2 py-2 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-xs font-semibold text-slate-300 transition-colors"
            >
              關閉提示
            </button>
          </div>
        )}

        {error && (
          <div className="glass-card border border-red-500/40 bg-red-500/5 rounded-2xl p-5 text-left space-y-2.5 animate-[slideIn_0.2s_ease-out]">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <h3 className="font-extrabold text-sm">打卡異常提示</h3>
            </div>
            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              {error}
            </p>
          </div>
        )}

        {/* Input Form Panel */}
        {!submitResult && (
          <div className="glass-card rounded-2xl p-6 border border-slate-800 text-left space-y-6">
            
            {/* Step 1: Select Employee */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-500" />
                步驟一：選擇您的姓名
              </label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all font-semibold"
              >
                <option value="">-- 請選擇您的姓名 --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employeeCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Input PIN */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-amber-500" />
                步驟二：輸入打卡密碼 (4 位數 PIN)
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="請輸入 4 位打卡密碼"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all tracking-[0.25em] font-black font-mono text-center"
              />
            </div>

            {/* Step 3: Geolocation Info */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-amber-500" />
                  步驟三：GPS 定位狀態
                </span>
                <button
                  type="button"
                  onClick={requestGPSLocation}
                  className="text-[10px] text-amber-500 hover:underline font-bold"
                >
                  重新取得定位
                </button>
              </label>
              
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <MapPin className={`w-4 h-4 ${
                    gpsStatus === "SUCCESS" 
                      ? "text-emerald-400" 
                      : gpsStatus === "REQUESTING" 
                      ? "text-amber-500 animate-pulse" 
                      : "text-red-400"
                  }`} />
                  <div>
                    {gpsStatus === "IDLE" && <span className="text-slate-500 font-semibold">尚未要求定位</span>}
                    {gpsStatus === "REQUESTING" && <span className="text-amber-500 font-semibold">取得 GPS 定位中...</span>}
                    {gpsStatus === "SUCCESS" && coords && (
                      <span className="text-emerald-400 font-semibold font-mono">
                        經度: {coords.longitude.toFixed(4)}, 緯度: {coords.latitude.toFixed(4)}
                      </span>
                    )}
                    {gpsStatus === "ERROR" && <span className="text-red-400 font-semibold">定位讀取失敗，請確認 GPS 開啟</span>}
                  </div>
                </div>
                <div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    gpsStatus === "SUCCESS"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : gpsStatus === "REQUESTING"
                      ? "bg-amber-500/10 text-amber-500"
                      : "bg-red-500/10 text-red-400"
                  }`}>
                    {gpsStatus === "SUCCESS" ? "已就緒" : gpsStatus === "REQUESTING" ? "獲取中" : "錯誤"}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleClockSubmit("CLOCK_IN")}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border border-amber-500/30 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10 focus:outline-none focus:ring-1 focus:ring-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "上班打卡 (CLOCK IN)"
                )}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleClockSubmit("CLOCK_OUT")}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-amber-500/5"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                ) : (
                  "下班打卡 (CLOCK OUT)"
                )}
              </button>
            </div>

          </div>
        )}

        {/* Footer Notes & Admin Access */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-900 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-slate-600 flex-shrink-0" />
            <span>請確保手機開啟 GPS 定位，並在店內有效距離內進行打卡。</span>
          </div>
          <Link
            href="/admin/login"
            className="text-slate-400 hover:text-amber-500 hover:underline transition-all font-semibold flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            管理員登入
          </Link>
        </div>

      </div>
    </main>
  );
}
