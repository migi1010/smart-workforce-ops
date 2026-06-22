# Smart Workforce Operations System

A cloud-native, production-grade workforce attendance, payroll, and operational monitoring platform tailored for smart shop-floor operations and retail franchise management.

---

## 🇹🇼 繁體中文專案摘要 (Traditional Chinese Summary)

本系統是一套專為餐飲零售（如三峽八方雲集國際店）與製造工廠設計的**雲端智慧出勤與薪資營運平台**。本專案擺脫了傳統打卡系統功能單一的限制，聚焦於以下核心技術與業務價值：
- **智慧門店營運 (Smart Operations)**：結合物理地理柵欄 (Geofencing)，員工使用現場端 QR Code 掃描及行動裝置高精度 GPS 定位驗證打卡，杜絕代打卡漏洞。
- **店務管理與出勤修正 (Attendance Correction)**：管理員後台支援異常狀態警告標記、補卡與手動數據修正，並具備不可篡改的操作變更稽核日誌 (Audit Log)。
- **即時勞務成本分析與薪資引擎 (Payroll Engine & Analytics)**：自動排除無薪假與缺勤，根據各員工獨立時薪動態結算工時、計薪及分店人事支出。
- **一鍵式報表輸出 (Excel Export)**：整合 `xlsx` 函式庫，自動產生符合財會需求的三頁式 Traditional Chinese Excel 報表（包含薪資總表、出勤明細、及高階營運摘要）。
- **生產就緒與健診 (Production-Ready)**：配置 Render Cloud Blueprint 藍圖部署、資料庫定期備份指南、JWT 金鑰安全性輪轉，以及整合 Promethus/Render 健診的 `/api/health` 監控端點。

---

## 💡 Real-World Use Case

In decentralized retail franchises, fast-food outlets, and industrial shop floors, management struggles with manual timecard calculations, payroll errors, and off-site check-ins. 

**Smart Workforce Operations System** solves these challenges by providing a secure, geofenced clock-in interface for employees, paired with an automated payroll engine for management. For example, at **Bafang Yunji (Sanxia International Store)**, this platform automates daily shift logging, filters out unpaid absences, and generates audit-ready Excel reports for accounting in one click.

---

## 🚀 Key Architectural Workflow

The system is built on Next.js 16 (App Router), Prisma, and PostgreSQL. It enforces Edge Middleware route protection and processes high-accuracy GPS distances using the spherical Haversine formula.

```mermaid
graph TD
    User[Shop Floor Staff] -->|Scan QR / GPS| PublicClock[Public Clock Panel /clock]
    Boss[Store Administrator] -->|Log In / Session| AdminPanel[Protected Admin Dashboard /admin]
    
    subgraph Core System
        Middleware{Next.js Edge Middleware}
        PublicClock -->|Access API| PublicAPI[/api/clock/submit]
        AdminPanel -->|Session Check| Middleware
        Middleware -->|Valid Cookie| ProtectedAPI[/api/admin/*]
        Middleware -->|Invalid/Expired| Redirect[Redirect to /admin/login]
    end
    
    subgraph Database Layer
        PublicAPI -->|Transaction| DB[(PostgreSQL Database)]
        ProtectedAPI -->|ORM queries| DB
        DB -->|AuditLog| Audit[(Immutable Audit Log)]
    end
```

---

## 🛠️ Feature Highlights

- **GPS Geofence Verification**: Uses the Haversine formula to compute staff distances from the workplace coordinates, categorizing check-ins as `NORMAL` (green), `SUSPICIOUS` (yellow/flagged), or `BLOCKED` (denied).
- **Dynamic Terminals Binding**: Admins can regenerate the workplace token at any time to invalidate old QR codes and secure check-in URLs.
- **Automated Payroll Engine**: Computes wages based on individual employee hourly rates. It automatically includes paid statuses (`NORMAL`, `LATE`, `EARLY_LEAVE`) and excludes unpaid statuses (`ABSENT`, `LEAVE`).
- **Audit-Ready Excel Exporter**: Generates Traditional Chinese Excel reports containing three formatted worksheets:
  - **薪資總表 (Salary Summary)**: Sorted by monthly wages descending.
  - **出勤明細 (Daily Details)**: Clock times mapped to Taiwan Standard Time (UTC+8).
  - **摘要 (Period Metrics)**: Aggregated operational costs.
- **Security & Log Auditing**: Implements HTTP-only cookie-based JWT sessions, one-way PIN hashing, and immutable administrative change logs.
- **Production Health Monitoring**: Exposes `/api/health` checking database connection status for automated recovery pipelines.

*Read more in [Functional Features](file:///c:/Users/User/.gemini/antigravity/scratch/employee_attendance_system/docs/FEATURES.md) and [System Architecture](file:///c:/Users/User/.gemini/antigravity/scratch/employee_attendance_system/docs/ARCHITECTURE.md).*

---

## 💻 Tech Stack

- **Framework**: Next.js 16 (App Router, dynamic API routes)
- **Language**: TypeScript
- **Database ORM**: Prisma ORM with PostgreSQL database
- **Validations**: Zod
- **Security**: JWT (`jose`), HTTP-only Cookies, Password Hashing (`bcryptjs`)
- **Excel Processor**: `xlsx` (sheet generation, column sizing, custom formats)
- **Styling**: Tailwind CSS v4 (Glassmorphism layout, responsive CSS grids)

---

## 🗄️ Database Model Overview

The database schema is optimized for querying performance and audit trails:

- **User**: System administrator credentials.
- **Employee**: Worker details, including code, phone, and hourly wage rates.
- **Workplace**: Active location geofence coordinates and allowed radii.
- **AttendanceRecord**: Aggregated daily working hours and attendance status.
- **ClockEvent**: Raw coordinate recordings of individual check-in/out events.
- **AuditLog**: Immutable logs capturing administrative alterations.

*Database indexes are configured on frequently queried columns (`date`, `employeeId`, `timestamp`) to ensure query speed as logs scale.*

---

## 🖼️ User Interface Preview

### 1. Mobile Geofenced Clock-in Terminal (`/clock`)
*(Clean mobile-first UI with GPS validation and Taiwan Standard time display)*
`[ Placeholder: Screenshots of Mobile Check-In Web View ]`

### 2. Admin Analytics Dashboard & Log Audit (`/admin`)
*(Analytical cards showing total labor costs, active headcount, and flagged events)*
`[ Placeholder: Screenshots of Admin Dashboard Overview ]`

### 3. Payroll cost & Excel Exporter (`/admin/payroll`)
*(Dynamic payroll list sorted by highest wage with Excel download actions)*
`[ Placeholder: Screenshots of Payroll Sheet & Exporter Buttons ]`

---

## 🔧 Local Development & Quick Start

### 1. Configure Environment:
Copy `.env.example` to `.env` and set your local PostgreSQL database URL and session keys:
```bash
cp .env.example .env
```

### 2. Install dependencies:
```bash
npm install
```

### 3. Migrate & Seed Database:
Initialize PostgreSQL schema tables and insert default administrator and workplace seeds:
```bash
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Launch Development Server:
```bash
npm run dev
```
Open [http://localhost:3000/clock](http://localhost:3000/clock) to access the public clock panel, or [http://localhost:3000/admin/login](http://localhost:3000/admin/login) to access the back-office login.

---

## 🧪 Verification & Test Suite

Verify system integrity by running the test suites:

```bash
# Verify base utilities, security helpers, and env variables
npm run test:foundation

# Verify database connection and AuditLog CRUD
npm run test:db

# Verify auth APIs, cookies, and middleware redirections
npm run test:auth

# Verify employee management actions and PIN updates
npm run test:employees

# Verify GPS geofence calculations and Haversine distance matches
npm run test:attendance-foundation

# Verify public clock-in transactions and duplicate clocks checks
npm run test:clock

# Verify QR Code urls generation and leakage protections
npm run test:qr-code

# Verify administrative edits and manual attendance corrections
npm run test:attendance

# Verify monthly payroll calculations and employee wage sorting
npm run test:payroll

# Verify excel export APIs and workbook sheets structures
npm run test:excel

# Verify production ready paths, redirections, and health endpoints
npm run test:production-smoke
```

---

## ☁️ Cloud Deployment & Roadmap

The application is configured to deploy directly to Render using blueprints. For step-by-step instructions on environment variables configuration, database backups, restore commands, and JWT key rotation, see the [Deployment & Operations Manual](file:///c:/Users/User/.gemini/antigravity/scratch/employee_attendance_system/docs/DEPLOYMENT.md).

For the upcoming features schedule, including multi-tenant support, automated shifts planning, camera biometric validation, and labor compliance engines, see the [Future Product Roadmap](file:///c:/Users/User/.gemini/antigravity/scratch/employee_attendance_system/docs/ROADMAP.md).
