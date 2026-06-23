"use client";

import React, { useState, useEffect } from "react";
import { 
  Settings, 
  AlertCircle, 
  Check, 
  Loader2, 
  MapPin, 
  Compass, 
  Radio, 
  Key, 
  Copy, 
  AlertTriangle, 
  RefreshCw 
} from "lucide-react";

interface Workplace {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  allowedRadiusMeters: number;
  warningRadiusMeters: number;
  workplaceToken: string;
}

export default function WorkplacePage() {
  const [workplace, setWorkplace] = useState<Workplace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formLat, setFormLat] = useState("");
  const [formLon, setFormLon] = useState("");
  const [formAllowedRadius, setFormAllowedRadius] = useState("");
  const [formWarningRadius, setFormWarningRadius] = useState("");
  
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Token regenerate state
  const [tokenLoading, setTokenLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchWorkplace = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/workplace");
      const result = await res.json();
      if (res.ok && result.workplace) {
        setWorkplace(result.workplace);
        // Fill form
        setFormName(result.workplace.name);
        setFormAddress(result.workplace.address);
        setFormLat(result.workplace.latitude.toString());
        setFormLon(result.workplace.longitude.toString());
        setFormAllowedRadius(result.workplace.allowedRadiusMeters.toString());
        setFormWarningRadius(result.workplace.warningRadiusMeters.toString());
      } else {
        throw new Error(result.error || "無法取得工作定位設定資料");
      }
    } catch (err: any) {
      setError(err.message || "載入設定資料時發生錯誤");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkplace();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSuccess(null);
    setFormError(null);
    setFormLoading(true);

    try {
      const res = await fetch("/api/admin/workplace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          address: formAddress.trim(),
          latitude: parseFloat(formLat),
          longitude: parseFloat(formLon),
          allowedRadiusMeters: parseFloat(formAllowedRadius),
          warningRadiusMeters: parseFloat(formWarningRadius),
        }),
      });

      const text = await res.text();
      let result;
      try {
        result = text ? JSON.parse(text) : null;
      } catch {
        throw new Error(
          `Invalid response from server: ${text.slice(0, 200)}`
        );
      }

      if (!res.ok) {
        throw new Error(result?.error || "儲存設定失敗");
      }

      setFormSuccess("工作定位設定已成功儲存！");
      
      // Update local state directly to keep coordinates visible without full page reload
      if (result && result.workplace) {
        setWorkplace(result.workplace);
        setFormName(result.workplace.name);
        setFormAddress(result.workplace.address);
        setFormLat(result.workplace.latitude.toString());
        setFormLon(result.workplace.longitude.toString());
        setFormAllowedRadius(result.workplace.allowedRadiusMeters.toString());
        setFormWarningRadius(result.workplace.warningRadiusMeters.toString());
      }
    } catch (err: any) {
      setFormError(err.message || "更新設定時發生錯誤");
    } finally {
      setFormLoading(false);
    }
  };

  const handleCopyToken = () => {
    if (!workplace) return;
    navigator.clipboard.writeText(workplace.workplaceToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateToken = async () => {
    if (!confirm("⚠️ 警告：重新產生識別金鑰會使當前已列印張貼的打卡 QR Code 立即便失效。確定要重新產生嗎？")) {
      return;
    }

    setTokenLoading(true);
    try {
      const res = await fetch("/api/admin/workplace/regenerate-token", {
        method: "POST",
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "重產金鑰失敗");
      }

      alert("識別金鑰已成功重新產生！請記得重新下載或列印新的打卡 QR Code。");
      fetchWorkplace();
    } catch (err: any) {
      alert(err.message || "重產金鑰時發生錯誤");
    } finally {
      setTokenLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-[#666666] text-xs font-semibold">
        <Loader2 className="w-6 h-6 animate-spin text-[#111111] mr-2" />
        載入工作地定位設定中...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-[#E5E7EB] flex items-center justify-center text-[#111111]">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#111111] tracking-tight">
              工作地與打卡定位設定
            </h1>
            <p className="text-xs text-[#666666] mt-0.5">
              設定店家所在的 GPS 經緯度座標以及防作弊半徑，用於精確核對員工打卡位置。
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

      {formSuccess && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#F0FDF4] border border-emerald-200 text-[#166534] text-xs">
          <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{formSuccess}</p>
        </div>
      )}

      {formError && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#FEF2F2] border border-red-200 text-[#B91C1C] text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{formError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Form Panel */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="p-5 rounded-xl border border-[#E5E7EB] bg-white shadow-sm space-y-5 text-xs text-[#111111]">
            
            {/* General Info */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-[#111111] uppercase tracking-wider border-b border-[#E5E7EB] pb-2 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#111111]" />
                基礎位置設定
              </h2>
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#666666]">分店名稱</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="分店名稱"
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#666666]">分店地址</label>
                <input
                  type="text"
                  required
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="例如: 新北市三峽區國際一街..."
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                />
              </div>
            </div>

            {/* GPS Coordinates */}
            <div className="space-y-4 pt-2">
              <h2 className="text-xs font-bold text-[#111111] uppercase tracking-wider border-b border-[#E5E7EB] pb-2 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-[#111111]" />
                店家 GPS 經緯度座標
              </h2>
              <p className="text-xs text-[#666666] leading-normal">
                請輸入精確的十進位 GPS 座標。您可以在 Google 地圖中右鍵點選分店位置，即可複製經緯度。
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#666666]">緯度 (Latitude)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formLat}
                    onChange={(e) => setFormLat(e.target.value)}
                    placeholder="例如: 24.9376"
                    className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#666666]">經度 (Longitude)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formLon}
                    onChange={(e) => setFormLon(e.target.value)}
                    placeholder="例如: 121.3688"
                    className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                  />
                </div>
              </div>
            </div>

            {/* Radius Configuration */}
            <div className="space-y-4 pt-2">
              <h2 className="text-xs font-bold text-[#111111] uppercase tracking-wider border-b border-[#E5E7EB] pb-2 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-[#111111]" />
                打卡有效範圍限制
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#666666]">
                    允許打卡半徑 (公尺)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formAllowedRadius}
                    onChange={(e) => setFormAllowedRadius(e.target.value)}
                    placeholder="預設: 100"
                    className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                  />
                  <span className="text-[10px] text-[#888888] block leading-tight mt-0.5">
                    此範圍內打卡為正常 (NORMAL) 定位狀態。
                  </span>
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#666666]">
                    警告打卡半徑 (公尺)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formWarningRadius}
                    onChange={(e) => setFormWarningRadius(e.target.value)}
                    placeholder="預設: 300"
                    className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
                  />
                  <span className="text-[10px] text-[#888888] block leading-tight mt-0.5">
                    超過允許半徑但在此範圍內為異常警告 (SUSPICIOUS) ；超出此範圍則拒絕 (BLOCKED) 打卡。
                  </span>
                </div>
              </div>
            </div>

            {/* Save Buttons */}
            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                disabled={formLoading}
                className="px-5 py-2 rounded-lg font-bold text-xs text-white bg-[#111111] hover:bg-[#222222] transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                儲存設定
              </button>
            </div>

          </form>
        </div>

        {/* Right Info and Token Panel */}
        <div className="space-y-6">
          
          {/* Security Token Card */}
          {workplace && (
            <div className="p-5 rounded-xl border border-[#E5E7EB] bg-white shadow-sm space-y-5 text-xs">
              <div className="space-y-1">
                <h2 className="font-bold text-[#111111] flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-[#111111]" />
                  打卡安全識別金鑰
                </h2>
                <p className="text-[#666666] leading-normal">
                  此識別碼 (Workplace Token) 是驗證打卡網頁與店內 QR Code 完整性的金鑰。
                </p>
              </div>

              {/* Token Display Box */}
              <div className="p-2.5 rounded-lg bg-[#FAFAFA] border border-[#E5E7EB] font-mono text-xs flex items-center justify-between gap-3 text-[#111111]">
                <span className="truncate select-all" title={workplace.workplaceToken}>
                  {workplace.workplaceToken}
                </span>
                <button
                  onClick={handleCopyToken}
                  className="p-1.5 rounded border border-[#E5E7EB] bg-white hover:bg-[#F5F5F5] text-[#111111] transition-all cursor-pointer flex-shrink-0"
                  title="複製識別碼"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#166534]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Warning Alert */}
              <div className="p-3.5 rounded-lg bg-[#FEF2F2] border border-red-200 text-[#B91C1C] flex items-start gap-2.5">
                <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold">安全提醒</span>
                  <p className="opacity-90 leading-relaxed">
                    重新產生識別碼會使當前店內張貼的打卡 QR Code 與所有員工手中的打卡網址連結立即便失效。重產後，您必須重新產生並列印新的 QR Code 提供給店內使用。
                  </p>
                </div>
              </div>

              {/* Regenerate Button */}
              <div className="pt-1">
                <button
                  onClick={handleRegenerateToken}
                  disabled={tokenLoading}
                  className="w-full py-2 px-4 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {tokenLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  重新產生識別碼
                </button>
              </div>

            </div>
          )}

          {/* Location Description Info Card */}
          <div className="p-5 rounded-xl border border-[#E5E7EB] bg-white shadow-sm space-y-3 text-xs text-[#111111]">
            <h3 className="font-bold">定位規則運作說明</h3>
            <ul className="space-y-2 list-disc pl-4 leading-relaxed text-[#666666]">
              <li>
                <strong>允許範圍 (正常)</strong>: 員工打卡距離在允許半徑內，狀態標示為 <span className="text-[#166534] font-bold">店內範圍 (NORMAL)</span>。
              </li>
              <li>
                <strong>警告範圍 (異常)</strong>: 超出允許半徑但低於警告半徑，打卡仍然可以完成，但後台日誌會將打卡標示為 <span className="text-[#B45309] font-bold">異常位置 (SUSPICIOUS)</span>，供店長查核是否為 GPS 飄移或非正常排班定位。
              </li>
              <li>
                <strong>超出限制範圍 (阻擋)</strong>: 超出警告半徑外打卡，打卡程序會被系統自動 <span className="text-[#B91C1C] font-bold">直接攔截並阻擋 (BLOCKED)</span>。
              </li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
}
