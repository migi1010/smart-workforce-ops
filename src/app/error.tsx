"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to Render/production logs console
    console.error("Application error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAFAFA] px-4 text-center text-[#111111] antialiased">
      <div className="w-16 h-16 rounded-xl bg-[#FEF2F2] border border-[#FEF2F2] flex items-center justify-center text-[#B91C1C] mb-4">
        <AlertTriangle className="w-8 h-8" />
      </div>
      
      <h1 className="text-xl font-bold text-[#111111] mb-2 tracking-tight">
        系統發生非預期錯誤
      </h1>
      
      <p className="text-xs text-[#666666] max-w-sm mb-6 leading-relaxed">
        抱歉，系統運作時發生了非預期錯誤。這可能是暫時性的連線問題，您可以嘗試重新整理或點擊下方重試。
      </p>
      
      <button
        onClick={() => reset()}
        className="flex items-center gap-1.5 bg-[#111111] hover:bg-[#222222] text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-sm cursor-pointer"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        重新嘗試
      </button>
    </div>
  );
}
