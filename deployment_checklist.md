# 員工出勤管理系統 - 生產環境部署檢核表 (Deployment Checklist)

本檢核表供系統維護人員在生產環境正式上線或進行系統升級時使用。

---

## 🟩 1. 環境變數檢核 (Environment Variables)

- [ ] **DATABASE_URL**
  - [ ] 已設定為生產環境 PostgreSQL 連線字串。
  - [ ] 確定連線超時與連線池大小設定適合 Render 運作環境。
- [ ] **JWT_SECRET**
  - [ ] 金鑰長度大於 32 字元，且為高隨機強度字串。
  - [ ] 不使用開發預設金鑰 `dev_secret_key_must_be_long_enough`。
- [ ] **NEXT_PUBLIC_APP_URL**
  - [ ] 已設定為對應的生產環境域名（例如：`https://xxx.onrender.com`）。
  - [ ] 網址以 `https://` 開頭，而非 `http://`。
- [ ] **INIT_ADMIN_USERNAME & INIT_ADMIN_PASSWORD**
  - [ ] 設定了首次部署的系統管理員使用者名稱及密碼。
  - [ ] 已在安全地方記錄初始帳密，並提醒於部署完畢後手動變更密碼。

---

## 🟩 2. 資料庫遷移與種子檢核 (Prisma Database Setup)

- [ ] **Prisma schema 同步**
  - [ ] 執行 `npx prisma generate` 成功生成客戶端。
  - [ ] 執行 `npx prisma migrate deploy` 成功執行所有遷移，無未提交的 schema 變更。
- [ ] **種子資料冪等性**
  - [ ] 種子腳本已安全載入，重部署時**不覆寫**任何現有帳密或工作地資料。
  - [ ] 確保只在乾淨（全新）資料庫中才寫入預設工作地與管理員。

---

## 🟩 3. 安全與權限檢核 (Security Controls)

- [ ] **SSL/HTTPS 強制**
  - [ ] 生產環境已部署 SSL 憑證。
  - [ ] API 路由已禁止不安全（HTTP）請求，僅允許加密通道。
- [ ] **路由中介軟體保護 (Middleware)**
  - [ ] 存取 `/admin` 及其子頁面時，若無 Session，會自動跳轉至 `/admin/login`。
  - [ ] 所有 `/api/admin/*` 敏感路徑在未授權時皆拒絕並回傳 `401 Unauthorized`。
- [ ] **打卡參數隱私性**
  - [ ] 公開 API `GET /api/clock/workplace?token=xxx` **絕不洩漏** `workplaceToken` 與 `pinHash` 等敏感細節。

---

## 🟩 4. 系統建置與健康診斷 (Build & Health Diagnosis)

- [ ] **Next.js 靜態優化編譯**
  - [ ] 執行 `npm run build` 成功，無任何語法、型別、或是元件編譯錯誤。
  - [ ] 開發除錯的 Console Log 與 Warn 警告皆已清理或確認安全。
- [ ] **監控節點**
  - [ ] 存取 `/api/health` 運作正常，於資料庫運作正常時回傳 `200 OK` 且帶有 UP 狀態。
  - [ ] 模擬資料庫離線時，`/api/health` 正確回傳 `500 Internal Server Error`，狀態為 DOWN。
