"use client";

import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f172a] px-4 text-center">
      <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-6 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
        <FileQuestion className="w-10 h-10" />
      </div>
      
      <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-amber-200 to-red-400 bg-clip-text text-transparent mb-2">
        404 - 找不到頁面
      </h1>
      
      <p className="text-sm text-slate-400 max-w-md mb-8">
        抱歉，您所尋找的頁面不存在。請確認網址是否正確，或返回首頁。
      </p>
      
      <Link
        href="/"
        className="flex items-center gap-2 bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 active:border-slate-700 text-xs font-bold text-slate-200 px-5 py-3 rounded-xl transition-all shadow-lg"
      >
        <Home className="w-4 h-4 text-amber-500" />
        返回首頁
      </Link>
    </div>
  );
}
