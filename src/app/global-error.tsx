"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to Render/production logs console
    console.error("Global crash caught:", error);
  }, [error]);

  return (
    <html lang="zh-TW" className="h-full">
      <body className="min-h-full flex flex-col bg-[#0f172a] text-slate-100 items-center justify-center px-4 text-center">
        <div className="flex flex-col items-center justify-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-6 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
            <AlertCircle className="w-10 h-10" />
          </div>
          
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent mb-2">
            應用程式載入失敗
          </h1>
          
          <p className="text-sm text-slate-400 mb-8">
            抱歉，核心排版或基礎服務載入失敗。請檢查您的網路狀態，或聯絡店長處理。
          </p>
          
          <button
            onClick={() => reset()}
            className="flex items-center gap-2 bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 active:border-slate-700 text-xs font-bold text-slate-200 px-5 py-3 rounded-xl transition-all shadow-lg cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-red-500" />
            重試一次
          </button>
        </div>
      </body>
    </html>
  );
}
