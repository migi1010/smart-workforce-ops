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
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f172a] px-4 text-center">
      <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-6 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
        <AlertTriangle className="w-10 h-10" />
      </div>
      
      <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent mb-2">
        系統發生非預期錯誤
      </h1>
      
      <p className="text-sm text-slate-400 max-w-md mb-8">
        抱歉，系統運作時發生了非預期錯誤。這可能是暫時性的連線問題，您可以嘗試重新整理。
      </p>
      
      <button
        onClick={() => reset()}
        className="flex items-center gap-2 bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 active:border-slate-700 text-xs font-bold text-slate-200 px-5 py-3 rounded-xl transition-all shadow-lg cursor-pointer"
      >
        <RotateCcw className="w-4 h-4 text-red-500 animate-[spin_4s_linear_infinite]" />
        重新嘗試
      </button>
    </div>
  );
}
