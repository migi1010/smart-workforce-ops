"use client";

import React, { useState, useEffect } from "react";
import { 
  QrCode, 
  MapPin, 
  Radio, 
  Copy, 
  Check, 
  Download, 
  Printer, 
  Loader2, 
  AlertCircle,
  FileText
} from "lucide-react";
import QRCode from "qrcode";

interface WorkplaceQRData {
  name: string;
  address: string;
  workplaceToken: string;
  allowedRadiusMeters: number;
  warningRadiusMeters: number;
  clockUrl: string;
  fullClockUrl: string;
}

export default function QRCodePage() {
  const [data, setData] = useState<WorkplaceQRData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [qrDisplayUrl, setQrDisplayUrl] = useState<string>("");
  const [qrDownloadUrl, setQrDownloadUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  const fetchQRData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/qr-code");
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "無法載入 QR Code 資料");
      }
      setData(result.workplace);
      
      // Generate QR codes
      const url = result.workplace.fullClockUrl;
      const displayQr = await QRCode.toDataURL(url, { width: 350, margin: 2 });
      const downloadQr = await QRCode.toDataURL(url, { width: 1024, margin: 2 });
      
      setQrDisplayUrl(displayQr);
      setQrDownloadUrl(downloadQr);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "取得資料時發生錯誤");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQRData();
  }, []);

  const handleCopyUrl = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.fullClockUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500 mr-2" />
        載入打卡 QR Code 設定中...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-[fadeIn_0.3s_ease-out] no-print">
      
      {/* Global CSS override specifically for printing */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Force light background for ink savings */
          html, body {
            background-color: #ffffff !important;
            background-image: none !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Hide screen UI elements */
          nav, header, footer, button, .no-print {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            background: none !important;
          }
          .print-poster {
            display: flex !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            min-height: 100vh !important;
            width: 100% !important;
            align-items: center !important;
            justify-content: center !important;
            flex-direction: column !important;
            padding: 3rem !important;
            box-sizing: border-box !important;
          }
        }
      ` }} />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 md:p-8 rounded-2xl glass-card relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-2xl -z-10" />
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-amber-200 to-red-400 bg-clip-text text-transparent">
              打卡 QR Code 與海報管理
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              產生店家專屬的打卡 QR Code，您可以複製打卡連結、下載高解析度 QR Code，或直接列印打卡海報張貼於店內。
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Config Panel */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Workplace Info */}
            <div className="p-6 rounded-2xl glass-card space-y-6">
              <h2 className="text-base font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800/80 pb-2">
                <FileText className="w-4 h-4 text-amber-500" />
                工作場所定位參數資訊
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 block">分店名稱</span>
                  <span className="font-bold text-slate-200">{data.name}</span>
                </div>
                
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 block">打卡允許半徑 / 警告半徑</span>
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-amber-500/70" />
                    {data.allowedRadiusMeters} 米 / {data.warningRadiusMeters} 米
                  </span>
                </div>

                <div className="md:col-span-2 space-y-1">
                  <span className="text-xs text-slate-500 block">分店地址</span>
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-amber-500/70" />
                    {data.address}
                  </span>
                </div>

                <div className="md:col-span-2 space-y-2 pt-2 border-t border-slate-800/60">
                  <span className="text-xs text-slate-500 block">完整打卡網址 (生產環境連結)</span>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-900 font-mono text-xs flex items-center justify-between gap-3 text-slate-300">
                    <span className="truncate select-all" title={data.fullClockUrl}>
                      {data.fullClockUrl}
                    </span>
                    <button
                      onClick={handleCopyUrl}
                      className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:text-amber-500 hover:border-slate-700 transition-all cursor-pointer flex-shrink-0 flex items-center gap-1 text-[10px] font-semibold"
                      title="複製連結"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          已複製
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          複製
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Poster Preview */}
            <div className="p-6 rounded-2xl glass-card space-y-4">
              <h2 className="text-base font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800/80 pb-2">
                <Printer className="w-4 h-4 text-amber-500" />
                店內打卡海報預覽 (A4 紙張尺寸最適)
              </h2>
              <p className="text-xs text-slate-500">
                下方為店內列印海報的模擬外觀。點選「列印打卡海報」將自動隱藏管理後台，僅輸出此海報頁面。
              </p>
              
              {/* Screen Preview Frame */}
              <div className="border border-slate-800 rounded-2xl bg-white text-black p-8 max-w-md mx-auto shadow-2xl flex flex-col items-center justify-center text-center space-y-6">
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-slate-900">
                    {data.name} 員工打卡
                  </h3>
                  <p className="text-sm font-bold text-slate-600 mt-1">請掃描 QR Code 打卡</p>
                </div>

                {qrDisplayUrl ? (
                  <div className="p-2 border-2 border-slate-900 rounded-xl bg-white shadow-sm">
                    <img src={qrDisplayUrl} alt="打卡 QR Code 預覽" className="w-48 h-48 select-none" />
                  </div>
                ) : (
                  <div className="w-48 h-48 bg-slate-100 animate-pulse rounded-xl flex items-center justify-center text-xs text-slate-400">
                    產生中...
                  </div>
                )}

                <div className="space-y-1 text-xs text-slate-700 font-bold">
                  <p>店家名稱：{data.name}</p>
                  <p>打卡地址：{data.address}</p>
                </div>

                <div className="w-full border-t border-slate-200 pt-4 text-left space-y-1.5 text-xs text-slate-700 font-semibold max-w-[280px] mx-auto">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 flex-shrink-0" />
                    <span>請在店內完成打卡</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 flex-shrink-0" />
                    <span>請開啟手機定位</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 flex-shrink-0" />
                    <span>請勿代打卡</span>
                  </div>
                  <div className="flex items-start gap-2 text-[10px] text-red-600 font-bold leading-normal pt-1.5 border-t border-slate-100">
                    <span className="flex-shrink-0">⚠️</span>
                    <span>若無法打卡，請先確認定位權限是否開啟，再通知店長。</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Action Control Panel */}
          <div className="space-y-6">
            
            {/* Quick Actions Card */}
            <div className="p-6 rounded-2xl glass-card space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-xl -z-10" />
              
              <h2 className="text-base font-bold text-slate-200">打卡 QR Code 操作</h2>
              
              <div className="space-y-3">
                
                {/* Download Button */}
                {qrDownloadUrl && (
                  <a
                    href={qrDownloadUrl}
                    download={`${data.name}_打卡QRCode_1024px.png`}
                    className="w-full py-3 px-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-200 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <Download className="w-4 h-4 text-amber-500" />
                    下載高解析度 QR Code
                  </a>
                )}
                
                {/* Print Button */}
                <button
                  onClick={handlePrint}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10 active:scale-[0.98]"
                >
                  <Printer className="w-4 h-4" />
                  列印打卡海報
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-900 text-slate-400 text-xs leading-relaxed space-y-1.5">
                <span className="font-bold text-slate-300">列印說明</span>
                <p>1. 點選「列印打卡海報」會自動開啟瀏覽器列印對話框。</p>
                <p>2. 建議列印尺寸設定為 A4，方向設定為「直向」。</p>
                <p>3. 列印設定中請勾選「背景圖形」以獲得最佳顯示外觀。</p>
                <p>4. 產生的 QR Code 解析度高達 1024px，亦可用於大尺寸看板製作。</p>
              </div>
            </div>

            {/* Workplace Token Notice */}
            <div className="p-6 rounded-2xl glass-card space-y-4">
              <h3 className="text-sm font-bold text-slate-200">關於識別金鑰安全性</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                打卡連結中包含了工作場所的安全識別碼。該識別碼只會展示給已登入的後台管理員，不對外公開。
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                如果發現有員工取得該識別碼進行店外偽造定位打卡，您可以前往 <a href="/admin/workplace" className="text-amber-500 hover:underline font-bold">工作地設定</a> 重新產生新的安全識別金鑰。
              </p>
            </div>

          </div>

        </div>
      )}

      {/* ========================================== */}
      {/* PRINT-ONLY SECTION (Hidden on screen view) */}
      {/* ========================================== */}
      {data && (
        <div className="hidden print-poster">
          <div className="w-full max-w-2xl text-center space-y-8">
            
            {/* Poster Header */}
            <div className="space-y-2">
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-950" style={{ fontSize: "2.75rem" }}>
                {data.name} 員工打卡
              </h1>
              <p className="text-xl font-bold text-slate-700" style={{ fontSize: "1.25rem" }}>
                請掃描 QR Code 打卡
              </p>
            </div>

            {/* Centered High Density QR Code */}
            {qrDisplayUrl && (
              <div className="inline-block p-4 border-4 border-slate-900 rounded-3xl bg-white my-8 shadow-sm">
                <img 
                  src={qrDisplayUrl} 
                  alt="員工打卡 QR Code" 
                  className="w-80 h-80" 
                  style={{ width: "320px", height: "320px" }} 
                />
              </div>
            )}

            {/* Location Address Details */}
            <div className="space-y-2 text-base text-slate-800 font-bold" style={{ fontSize: "1.1rem" }}>
              <p>工作場所：{data.name}</p>
              <p>打卡範圍：店面中心點半徑 {data.allowedRadiusMeters} 公尺內</p>
              <p>地址：{data.address}</p>
            </div>

            {/* Divider */}
            <div className="w-48 h-1 bg-slate-900 mx-auto my-6" />

            {/* Reminders List */}
            <div className="max-w-md mx-auto text-left space-y-3.5 text-base text-slate-800 font-bold" style={{ fontSize: "1.1rem" }}>
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 flex-shrink-0" />
                <span>請在店內完成打卡</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 flex-shrink-0" />
                <span>請開啟手機定位</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 flex-shrink-0" />
                <span>請勿代打卡，系統將記錄打卡軌跡</span>
              </div>
              <div className="flex items-start gap-2.5 text-red-600 font-extrabold leading-normal pt-3 border-t border-slate-300 mt-4 text-sm" style={{ fontSize: "0.95rem" }}>
                <span className="flex-shrink-0">⚠️</span>
                <span>若無法打卡，請先確認定位權限是否開啟，再通知店長。</span>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
