"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, AlertCircle, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "登入失敗，請稍後再試");
      }

      // Redirect to admin dashboard
      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "帳號或密碼輸入錯誤");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-grow flex items-center justify-center min-h-screen px-4 py-12 bg-[#FAFAFA] text-[#111111]">
      {/* Login Container */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8 relative z-10 shadow-sm">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 border border-slate-200 text-[#111111] mb-4">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#111111]">
            三峽八方雲集國際店
          </h1>
          <p className="text-sm text-[#666666] mt-2 font-medium">
            系統管理後台
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm animate-[fadeIn_0.2s_ease-out]">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">登入失敗</span>
              <p className="mt-0.5 opacity-90">{error}</p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Username Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#666666] tracking-wider uppercase block">
              管理者帳號
            </label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 group-focus-within:text-[#111111] transition-colors">
                <User className="w-5 h-5" />
              </span>
              <input
                type="text"
                required
                disabled={loading}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="請輸入帳號"
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-slate-200 bg-white text-[#111111] placeholder-slate-400 focus:outline-none focus:border-[#111111] transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#666666] tracking-wider uppercase block">
              管理者密碼
            </label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 group-focus-within:text-[#111111] transition-colors">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type="password"
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="請輸入密碼"
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-slate-200 bg-white text-[#111111] placeholder-slate-400 focus:outline-none focus:border-[#111111] transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-lg font-bold text-white bg-[#111111] hover:bg-[#222222] focus:outline-none transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                正在登入...
              </>
            ) : (
              "登入系統"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
