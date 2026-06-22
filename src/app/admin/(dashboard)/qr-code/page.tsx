"use client";

import React, { useState, useEffect } from "react";
import { 
  QrCode, 
  AlertCircle, 
  Loader2, 
  Printer, 
  Download, 
  FileText, 
  Copy, 
  Check, 
  MapPin, 
  Radio 
} from "lucide-react";

interface WorkplaceData {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  allowedRadiusMeters: number;
  warningRadiusMeters: number;
  workplaceToken: string;
  fullClockUrl: string;
}

export default function QRCodePage() {
  const [data, setData] = useState<WorkplaceData | null>(null);
  const [qrDisplayUrl, setQrDisplayUrl] = useState<string | null>(null);
  const [qrDownloadUrl, setQrDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [copied, setCopied] = useState(false);

  const fetchWorkplaceData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/workplace/qr");
      const result = await res.json();
      if (res.ok && result.workplace) {
        setData(result.workplace);
        generateQRCodeUrls(result.workplace.fullClockUrl);
      } else {
        throw new Error(result.error || "無法載入工作場所 QR 資料");
      }
    } catch (err: any) {
      setError(err.message || "載入工作場所資料失敗");
    } finally {
      setLoading(false);
    }
  };

  const generateQRCodeUrls = (url: string) => {
    const displayUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`;
    const downloadUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1024x1024&data=${encodeURIComponent(url)}`;
    setQrDisplayUrl(displayUrl);
    setQrDownloadUrl(downloadUrl);
  };

  useEffect(() => {
    fetchWorkplaceData();
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
      <div className="flex items-center justify-center py-16 text-[#666666] text-xs font-semibold">
        <Loader2 className="w-6 h-6 animate-spin text-[#111111] mr-2" />
        載入打卡 QR Code 資料中...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Print styles override */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide everything in layout except the poster */
          body * {
            visibility: hidden;
          }
          .print-poster, .print-poster * {
            visibility: visible;
          }
          .print-poster {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            height: 100% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex-direction: column !important;
            padding: 3rem !important;
            box-sizing: border-box !important;
          }
        }
      ` }} />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-[#E5E7EB] flex items-center justify-center text-[#111111]">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111111] tracking-tight">
              打卡 QR Code 與海報管理
            </h1>
            <p className="text-xs text-[#666666] mt-0.5">
              產生店家專屬的打卡 QR Code，您可以複製打卡連結、下載高解析度 QR Code，或直接列印打卡海報張貼於店內。
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#FEF2F2] border border-red-200 text-[#B91C1C] text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Config Panel */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Workplace Info */}
            <div className="p-5 rounded-xl border border-[#E5E7EB] bg-white shadow-sm space-y-5">
              <h2 className="text-xs font-bold text-[#111111] uppercase tracking-wider border-b border-[#E5E7EB] pb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#111111]" />
                工作場所定位參數資訊
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#111111]">
                <div className="space-y-1">
                  <span className="text-xs text-[#666666] block">分店名稱</span>
                  <span className="font-bold">{data.name}</span>
                </div>
                
                <div className="space-y-1">
                  <span className="text-xs text-[#666666] block">打卡允許半徑 / 警告半徑</span>
                  <span className="font-bold flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-[#666666]" />
                    {data.allowedRadiusMeters} 米 / {data.warningRadiusMeters} 米
                  </span>
                </div>

                <div className="md:col-span-2 space-y-1">
                  <span className="text-xs text-[#666666] block">分店地址</span>
                  <span className="font-bold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#666666]" />
                    {data.address}
                  </span>
                </div>

                <div className="md:col-span-2 space-y-2 pt-2 border-t border-[#E5E7EB]">
                  <span className="text-xs text-[#666666] block">完整打卡網址 (生產環境連結)</span>
                  <div className="p-3 rounded-lg bg-[#FAFAFA] border border-[#E5E7EB] font-mono text-xs flex items-center justify-between gap-3 text-[#111111]">
                    <span className="truncate select-all" title={data.fullClockUrl}>
                      {data.fullClockUrl}
                    </span>
                    <button
                      onClick={handleCopyUrl}
                      className="p-1.5 rounded border border-[#E5E7EB] bg-white hover:bg-[#F5F5F5] text-[#111111] transition-all cursor-pointer flex-shrink-0 flex items-center gap-1 text-[10px] font-semibold"
                      title="複製連結"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-[#166534]" />
                          已複製
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          複製
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Poster Preview */}
            <div className="p-5 rounded-xl border border-[#E5E7EB] bg-white shadow-sm space-y-4">
              <h2 className="text-xs font-bold text-[#111111] uppercase tracking-wider border-b border-[#E5E7EB] pb-2 flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-[#111111]" />
                店內打卡海報預覽 (A4 紙張尺寸最適)
              </h2>
              <p className="text-xs text-[#666666]">
                下方為店內列印海報的模擬外觀。點選「列印打卡海報」將自動隱藏管理後台，僅輸出此海報頁面。
              </p>
              
              {/* Screen Preview Frame */}
              <div className="border border-[#E5E7EB] rounded-xl bg-white text-black p-8 max-w-sm mx-auto shadow-sm flex flex-col items-center justify-center text-center space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-[#111111]">
                    {data.name} 員工打卡
                  </h3>
                  <p className="text-xs font-semibold text-[#666666] mt-0.5">請掃描 QR Code 打卡</p>
                </div>

                {qrDisplayUrl ? (
                  <div className="p-1 border border-[#E5E7EB] rounded-lg bg-white">
                    <img src={qrDisplayUrl} alt="打卡 QR Code 預覽" className="w-40 h-40 select-none" />
                  </div>
                ) : (
                  <div className="w-40 h-40 bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-[10px] text-slate-400">
                    產生中...
                  </div>
                )}

                <div className="space-y-0.5 text-[10px] text-[#666666] font-semibold">
                  <p>店家名稱：{data.name}</p>
                  <p>打卡地址：{data.address}</p>
                </div>

                <div className="w-full border-t border-[#E5E7EB] pt-3 text-left space-y-1 text-[10px] text-[#666666] font-semibold max-w-[240px] mx-auto">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-900 flex-shrink-0" />
                    <span>請在店內完成打卡</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-900 flex-shrink-0" />
                    <span>請開啟手機定位</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-900 flex-shrink-0" />
                    <span>請勿代打卡，系統將進行審計</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-[9px] text-[#B91C1C] font-bold leading-normal pt-2 border-t border-[#E5E7EB] mt-1">
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
            <div className="p-5 rounded-xl border border-[#E5E7EB] bg-white shadow-sm space-y-4">
              <h2 className="text-xs font-bold text-[#111111] uppercase tracking-wider border-b border-[#E5E7EB] pb-2">
                打卡 QR Code 操作
              </h2>
              
              <div className="space-y-2.5">
                {/* Download Button */}
                {qrDownloadUrl && (
                  <a
                    href={qrDownloadUrl}
                    download={`${data.name}_打卡QRCode_1024px.png`}
                    className="w-full py-2.5 px-4 rounded-lg bg-white border border-[#111111] hover:bg-[#F5F5F5] text-[#111111] font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm text-center"
                  >
                    <Download className="w-4 h-4 text-[#111111]" />
                    下載高解析度 QR Code
                  </a>
                )}
                
                {/* Print Button */}
                <button
                  onClick={handlePrint}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#111111] hover:bg-[#222222] text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center"
                >
                  <Printer className="w-4 h-4" />
                  列印打卡海報
                </button>
              </div>

              <div className="p-3.5 rounded-lg bg-[#FAFAFA] border border-[#E5E7EB] text-[#666666] text-xs leading-relaxed space-y-1">
                <span className="font-bold text-[#111111]">列印說明</span>
                <p>1. 點選「列印打卡海報」會自動開啟瀏覽器列印對話框。</p>
                <p>2. 建議列印尺寸設定為 A4，方向設定為「直向」。</p>
                <p>3. 列印設定中請勾選「背景圖形」以獲得最佳顯示外觀。</p>
                <p>4. 產生的 QR Code 解析度高達 1024px，亦可用於大尺寸看板製作。</p>
              </div>
            </div>

            {/* Workplace Token Notice */}
            <div className="p-5 rounded-xl border border-[#E5E7EB] bg-white shadow-sm space-y-2 text-xs">
              <h3 className="font-bold text-[#111111]">關於識別金鑰安全性</h3>
              <p className="text-[#666666] leading-relaxed">
                打卡連結中包含了工作場所的安全識別碼。該識別碼只會展示給已登入的後台管理員，不對外公開。
              </p>
              <p className="text-[#666666] leading-relaxed">
                如果發現有員工取得該識別碼進行店外偽造定位打卡，您可以前往 <a href="/admin/workplace" className="text-blue-600 hover:underline font-bold">工作地設定</a> 重新產生新的安全識別金鑰。
              </p>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================
          PRINT-ONLY SECTION (Hidden on screen view)
         ======================================================== */}
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
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900 flex-shrink-0" />
                <span>請在店內完成打卡</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900 flex-shrink-0" />
                <span>請開啟手機定位</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900 flex-shrink-0" />
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
