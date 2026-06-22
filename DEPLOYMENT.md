# 三峽八方雲集國際店 - 員工出勤管理系統
## 生產環境部署與運維手冊 (Production Deployment & Operations Manual)

本手冊提供在 Render 平台上部署、設定及維護本員工出勤管理系統的詳細操作指南。

---

## 1. Render 部署步驟 (Step-by-Step Render Deployment)

1. **準備 GitHub 儲存庫**：
   - 將專案程式碼推送至您的 GitHub 私人儲存庫（建議維持 Private，以保護敏捷機密與 PIN 碼雜湊）。
   
2. **在 Render 上連結 Blueprint**：
   - 登入 [Render 主控台](https://dashboard.render.com/)。
   - 點選右上角的 **New +** 選擇 **Blueprint**。
   - 連結您的 GitHub 專案儲存庫。
   - Render 會自動偵測專案根目錄的 `render.yaml`，並建立 Web Service 及 PostgreSQL 資料庫服務。

3. **初次部署與自動種子設定**：
   - Render 會自動執行 buildCommand：
     ```bash
     npm install && npx prisma generate && npx prisma migrate deploy && npm run build
     ```
   - 在首次資料庫遷移完成後，在您於本地或 Render Shell 中手動執行種子指令前，系統會使用環境變數中的 `INIT_ADMIN_USERNAME` 與 `INIT_ADMIN_PASSWORD` 來建立第一個系統管理員帳號，並自動生成一個工作地 Token 與預設工作地（三峽八方雲集國際店）。
   - **注意**：種子腳本為冪等設計（Idempotent），多次執行或重新部署時**絕對不會**覆寫已存在的管理員帳密與工作地資訊。

---

## 2. 部署後設定：配置專案生產網址 (Configure NEXT_PUBLIC_APP_URL)

當 Render Web Service 部署完成後，會生成一個隨機網址（例如：`https://employee-attendance-system.onrender.com`）。

1. **更新 Render 環境變數**：
   - 進入 Render Dashboard 點選您的 Web Service 服務。
   - 進入 **Environment** 頁面。
   - 將變數 `NEXT_PUBLIC_APP_URL` 的值從預設的 `http://localhost:3000` 修改為您實際的 Render 專案生產網址（必須以 `https://` 開頭，例如：`https://employee-attendance-system.onrender.com`）。
   - 儲存變數變更（Save Changes），Render 會自動觸發一次滾動更新（Rolling Update）重新編譯專案。

---

## 3. 變更生產網址後的 QR Code 重生與設定 (Regenerate QR Code)

當系統域名（`NEXT_PUBLIC_APP_URL`）變更或設定後，原先生成的 QR Code 打卡連結也必須更新：

1. **登入管理後台**：
   - 使用瀏覽器存取您的生產網址，並進入 `/admin/login`。
   - 使用初次設定的系統管理員帳密登入。
2. **進入 QR Code 管理頁面**：
   - 點選導覽列中的 **打卡 QR Code**（或直接存取 `/admin/qr-code`）。
   - 頁面會自動依據新的 `NEXT_PUBLIC_APP_URL` 與當前工作地的 `workplaceToken` 生成對應的打卡專屬 QR Code。
3. **重新印製與更新**：
   - 點選 **下載打卡 QR Code** 或 **列印打卡海報**。
   - 將全新的打卡海報重新列印並張貼於店內。舊有的打卡網址會因為域名不一致或失效而無法打卡，請務必更換。

---

## 4. 更新工作地 GPS 經緯度座標 (Update Workplace Latitude & Longitude)

若店面位置調整或需要修正打卡允許半徑：

1. **登入後台**：
   - 進入管理系統後台。
   - 點選導覽列中的 **工作地設定**（或直接存取 `/admin/workplace`）。
2. **修正地理資訊**：
   - 修改 **經度 (Longitude)** 與 **緯度 (Latitude)**（可利用 Google Maps 點選店面位置，右鍵複製精確的 6 位小數經緯度）。
   - 依據實際店內涵蓋範圍調整 **允許打卡半徑 (公尺)** 與 **警告半徑 (公尺)**。
   - 點選 **儲存設定**。變更將立即生效，員工下次打卡時會立即使用最新的地理柵欄規則進行判定。

---

## 5. 安全性管理：JWT_SECRET 金鑰安全輪轉 (Safe JWT_SECRET Rotation)

為確保使用者 Session 及管理員 Cookie Token 的高安全性，應定期輪轉 `JWT_SECRET`：

1. **產生隨機金鑰**：
   - 可在終端機中執行以下指令產生高強度的 32 位元隨機字串：
     ```bash
     openssl rand -base64 32
     ```
2. **在 Render 後台更新變數**：
   - 前往 Render Web Service 的 **Environment** 面板。
   - 找到 `JWT_SECRET` 變數，替換為生成的新安全字串。
   - 點選 **Save Changes**。
3. **輪轉影響與復原**：
   - 系統更新時，所有當前登入中的管理員會因金鑰失效而需要重新登入（Session Invalidated），此為安全輪轉的正常現象。
   - 員工前端打卡面板（`/clock`）使用的是 `workplaceToken` 與 PIN，不受 `JWT_SECRET` 影響，依然可正常運行。

---

## 6. 資料庫備份與還原指南 (Database Backup & Restore)

Render 提供了自動化每日備份。若要進行手動備份與備份還原（例如：轉移資料庫或手動快照）：

### A. 資料庫備份 (Database Backup)
取得 Render 提供的 PostgreSQL 外網連接網址（External Database URL）。
在本地安裝有 `postgresql-client` 工具的終端機執行：

```bash
# 格式：pg_dump -d "外部資料庫連接網址" -F c -b -v -f "備份檔名稱.dump"
pg_dump -d "postgresql://postgres:password@host:port/dbname" -F c -b -v -f "attendance_backup_2026.dump"
```

### B. 資料庫還原 (Database Restore)
在需要還原或清空資料庫後進行還原時，執行 `pg_restore` 指令：

```bash
# 格式：pg_restore -d "外部資料庫連接網址" -v -c --clean "備份檔名稱.dump"
pg_restore -d "postgresql://postgres:password@host:port/dbname" -v -c --clean "attendance_backup_2026.dump"
```
*`-c --clean` 參數會在還原前自動刪除（DROP）現有的表格結構，確保乾淨地還原資料。*

---

## 7. 系統日常監控與健康度檢查 (System Monitoring & Health)

1. **健康檢查 Endpoint**：
   - 提供專屬監控路徑：`/api/health`
   - 連接成功時返回 `200 OK` 並且 JSON 為：
     ```json
     {
       "status": "UP",
       "database": "connected",
       "timestamp": "2026-06-22T11:10:00.000Z",
       "version": "0.1.0"
     }
     ```
   - 若資料庫斷線或連線超時，會返回 `500 Internal Server Error`，這將自動通知 Render 負載平衡器對服務進行重啟（Restart Service）。
