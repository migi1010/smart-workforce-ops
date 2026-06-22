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
    console.error("Global crash caught:", error);
  }, [error]);

  return (
    <html lang="zh-TW" className="h-full">
      <body className="min-h-full flex flex-col bg-[#FAFAFA] text-[#111111] items-center justify-center px-4 text-center antialiased">
        <div className="flex flex-col items-center justify-center max-w-sm">
          <div className="w-16 h-16 rounded-xl bg-[#FEF2F2] border border-[#FEF2F2] flex items-center justify-center text-[#B91C1C] mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          
          <h1 className="text-xl font-bold text-[#111111] mb-2 tracking-tight">
            應用程式載入失敗
          </h1>
          
          <p className="text-xs text-[#666666] mb-6 leading-relaxed">
            抱歉，核心排版或基礎服務載入失敗。請檢查您的網路狀態，或聯絡店長處理。
          </p>
          
          <button
            onClick={() => reset()}
            className="flex items-center gap-1.5 bg-[#111111] hover:bg-[#222222] text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-sm cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重試一次
          </button>
        </div>
      </body>
    </html>
  );
}
