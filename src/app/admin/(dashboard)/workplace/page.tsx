"use client";

import React, { useState, useEffect } from "react";
import { 
  Settings, 
  MapPin, 
  Compass, 
  Radio, 
  Key, 
  Loader2, 
  AlertTriangle, 
  Check, 
  Copy,
  RefreshCw,
  AlertCircle
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
  isActive: boolean;
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

  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Token state
  const [copied, setCopied] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(false);

  const fetchWorkplace = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/workplace");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "無法取得工作地設定");
      }
      const wp = data.workplace;
      setWorkplace(wp);
      
      // Populate form
      setFormName(wp.name);
      setFormAddress(wp.address);
      setFormLat(wp.latitude.toString());
      setFormLon(wp.longitude.toString());
      setFormAllowedRadius(wp.allowedRadiusMeters.toString());
      setFormWarningRadius(wp.warningRadiusMeters.toString());
    } catch (err: any) {
      setError(err.message || "取得資料時發生錯誤");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkplace();
  }, []);

  // Copy token to clipboard
  const handleCopyToken = () => {
    if (!workplace) return;
    navigator.clipboard.writeText(workplace.workplaceToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Regenerate token
  const handleRegenerateToken = async () => {
    if (!confirm("⚠️ 警告：重新產生識別碼會立即使舊的打卡 QR Code 與打卡連結失效！員工將無法使用舊連結打卡。確定要繼續嗎？")) {
      return;
    }

    setTokenLoading(true);
    try {
      const response = await fetch("/api/admin/workplace/regenerate-token", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "重新產生識別碼失敗");
      }
      
      setWorkplace(data.workplace);
      alert("打卡安全識別碼已更新成功！請記得重新下載或列印新的打卡 QR Code。");
    } catch (err: any) {
      alert(err.message || "操作失敗");
    } finally {
      setTokenLoading(false);
    }
  };

  // Submit form updates
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setFormLoading(true);

    const lat = parseFloat(formLat);
    const lon = parseFloat(formLon);
    const allowed = parseFloat(formAllowedRadius);
    const warning = parseFloat(formWarningRadius);

    // Coordinate validation
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setFormError("緯度必須介於 -90 至 90 度之間");
      setFormLoading(false);
      return;
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      setFormError("經度必須介於 -180 至 180 度之間");
      setFormLoading(false);
      return;
    }

    // Radius validation
    if (isNaN(allowed) || allowed <= 0) {
      setFormError("允許打卡半徑必須大於 0 米");
      setFormLoading(false);
      return;
    }
    if (isNaN(warning) || warning <= allowed) {
      setFormError("警告打卡半徑必須大於允許打卡半徑");
      setFormLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/workplace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          address: formAddress.trim(),
          latitude: lat,
          longitude: lon,
          allowedRadiusMeters: allowed,
          warningRadiusMeters: warning,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "更新設定失敗");
      }

      setWorkplace(data.workplace);
      setFormSuccess("工作地與定位設定已成功更新！");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setFormError(err.message || "發生未知錯誤");
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500 mr-2" />
        載入工作地定位設定中...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
      
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 md:p-8 rounded-2xl glass-card relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-2xl -z-10" />
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-amber-200 to-red-400 bg-clip-text text-transparent">
              工作地與打卡定位設定
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              設定店家所在的 GPS 經緯度座標以及防作弊半徑，用於精確核對員工打卡位置。
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

      {formSuccess && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm animate-[fadeIn_0.2s_ease-out]">
          <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{formSuccess}</p>
        </div>
      )}

      {formError && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-[fadeIn_0.2s_ease-out]">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{formError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Form Panel */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="p-6 rounded-2xl glass-card space-y-6">
            
            {/* General Info */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800/80 pb-2">
                <MapPin className="w-4 h-4 text-amber-500" />
                基礎位置設定
              </h2>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400">分店名稱</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="分店名稱"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/50 text-sm text-slate-200 focus:outline-none focus:border-amber-500/70"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400">分店地址</label>
                <input
                  type="text"
                  required
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="例如: 新北市三峽區國際一街..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/50 text-sm text-slate-200 focus:outline-none focus:border-amber-500/70"
                />
              </div>
            </div>

            {/* GPS Coordinates */}
            <div className="space-y-4 pt-2">
              <h2 className="text-base font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800/80 pb-2">
                <Compass className="w-4 h-4 text-amber-500" />
                店家 GPS 經緯度座標
              </h2>
              <p className="text-xs text-slate-500 leading-normal">
                請輸入精確的十進位 GPS 座標。您可以在 Google 地圖中右鍵點選分店位置，即可複製經緯度。
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400">緯度 (Latitude)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formLat}
                    onChange={(e) => setFormLat(e.target.value)}
                    placeholder="例如: 24.9376"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/50 text-sm text-slate-200 focus:outline-none focus:border-amber-500/70"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400">經度 (Longitude)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formLon}
                    onChange={(e) => setFormLon(e.target.value)}
                    placeholder="例如: 121.3688"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/50 text-sm text-slate-200 focus:outline-none focus:border-amber-500/70"
                  />
                </div>
              </div>
            </div>

            {/* Radius Configuration */}
            <div className="space-y-4 pt-2">
              <h2 className="text-base font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800/80 pb-2">
                <Radio className="w-4 h-4 text-amber-500" />
                打卡有效範圍限制
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400">
                    允許打卡半徑 (公尺)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formAllowedRadius}
                    onChange={(e) => setFormAllowedRadius(e.target.value)}
                    placeholder="預設: 100"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/50 text-sm text-slate-200 focus:outline-none focus:border-amber-500/70"
                  />
                  <span className="text-[10px] text-slate-500 block leading-tight">
                    此範圍內打卡為正常 (NORMAL) 定位狀態。
                  </span>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400">
                    警告打卡半徑 (公尺)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formWarningRadius}
                    onChange={(e) => setFormWarningRadius(e.target.value)}
                    placeholder="預設: 300"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/50 text-sm text-slate-200 focus:outline-none focus:border-amber-500/70"
                  />
                  <span className="text-[10px] text-slate-500 block leading-tight">
                    超過允許半徑但在此範圍內為異常警告 (SUSPICIOUS) 狀態；超出此範圍則直接拒絕 (BLOCKED) 打卡。
                  </span>
                </div>
              </div>
            </div>

            {/* Save Buttons */}
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={formLoading}
                className="px-6 py-3 rounded-xl font-bold text-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer shadow-lg shadow-amber-500/10 active:scale-[0.98] flex items-center gap-2 disabled:opacity-50"
              >
                {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                儲存設定
              </button>
            </div>

          </form>
        </div>

        {/* Right Info and Token Panel */}
        <div className="space-y-6">
          
          {/* Security Token Card */}
          {workplace && (
            <div className="p-6 rounded-2xl glass-card space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-xl -z-10" />
              
              <div className="space-y-2">
                <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
                  <Key className="w-4 h-4 text-red-500" />
                  打卡安全識別金鑰
                </h2>
                <p className="text-xs text-slate-500 leading-normal">
                  此識別碼 (Workplace Token) 是驗證打卡網頁與店內 QR Code 完整性的金鑰。
                </p>
              </div>

              {/* Token Display Box */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-900 font-mono text-xs flex items-center justify-between gap-3 text-slate-300">
                <span className="truncate select-all" title={workplace.workplaceToken}>
                  {workplace.workplaceToken}
                </span>
                <button
                  onClick={handleCopyToken}
                  className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:text-amber-500 hover:border-slate-700 transition-all cursor-pointer flex-shrink-0"
                  title="複製識別碼"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Warning Alert */}
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
                <div className="space-y-1">
                  <span className="font-bold">安全提醒</span>
                  <p className="opacity-90 leading-relaxed">
                    重新產生識別碼會使當前店內張貼的打卡 QR Code 與所有員工手中的打卡網址連結立即使失效。重產後，您必須重新產生並列印新的 QR Code 提供給店內使用。
                  </p>
                </div>
              </div>

              {/* Regenerate Button */}
              <div className="pt-2">
                <button
                  onClick={handleRegenerateToken}
                  disabled={tokenLoading}
                  className="w-full py-3 px-4 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-red-400 font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {tokenLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  重新產生識別碼 (Regenerate)
                </button>
              </div>

            </div>
          )}

          {/* Location Description Info Card */}
          <div className="p-6 rounded-2xl glass-card space-y-4">
            <h3 className="text-sm font-bold text-slate-200">定位規則運作說明</h3>
            <ul className="text-xs text-slate-400 space-y-2.5 list-disc pl-4 leading-relaxed">
              <li>
                <strong>允許範圍 (正常)</strong>: 員工打卡距離在允許半徑內，狀態標示為 <span className="text-emerald-400 font-semibold">正常打卡</span>。
              </li>
              <li>
                <strong>警告範圍 (異常)</strong>: 超出允許半徑但低於警告半徑，打卡仍然可以完成，但後台日誌會將打卡標示為 <span className="text-amber-500 font-semibold">異常警告 (SUSPICIOUS)</span>，供店長查核是否為 GPS 飄移或非正常排班定位。
              </li>
              <li>
                <strong>超出限制範圍 (阻擋)</strong>: 超出警告半徑外打卡，打卡程序會被系統自動 <span className="text-red-400 font-semibold">直接攔截並阻擋 (BLOCKED)</span>。
              </li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
}
