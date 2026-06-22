"use client";

import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAFAFA] px-4 text-center text-[#111111] antialiased">
      <div className="w-16 h-16 rounded-xl bg-slate-100 border border-[#E5E7EB] flex items-center justify-center text-[#111111] mb-4">
        <FileQuestion className="w-8 h-8" />
      </div>
      
      <h1 className="text-xl font-bold text-[#111111] mb-2 tracking-tight">
        404 - 找不到頁面
      </h1>
      
      <p className="text-xs text-[#666666] max-w-sm mb-6 leading-relaxed">
        抱歉，您所尋找的頁面不存在。請確認網址是否正確，或返回首頁。
      </p>
      
      <Link
        href="/"
        className="flex items-center gap-1.5 bg-[#111111] hover:bg-[#222222] text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-sm"
      >
        <Home className="w-3.5 h-3.5" />
        返回首頁
      </Link>
    </div>
  );
}
