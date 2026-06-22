# System Architecture: Smart Workforce Operations System

This document outlines the architectural design, security mechanisms, database conventions, and mathematical models underpinning the Smart Workforce Operations System.

---

## 1. System Overview

The platform uses a decoupled App Router layout separating public shop-floor clients from protected administrative management dashboards.

```mermaid
graph TD
    Client[Browser Client] -->|HTTP Request| Middleware[Next.js Middleware Interceptor]
    Middleware -->|Public Route| PublicPages[Public App Pages /clock]
    Middleware -->|Admin Token Validated| AdminPages[Protected Admin Panel /admin/*]
    Middleware -->|Unauthorized Redirect| Login[Login Page /admin/login]
    
    PublicPages -->|Public API| PublicAPI[/api/clock/*]
    AdminPages -->|Admin API| AdminAPI[/api/admin/*]
    
    PublicAPI -->|ORM| DB[(PostgreSQL Database)]
    AdminAPI -->|ORM| DB
```

---

## 2. Layout Structure & Routing Strategy

- **Public Front-End (`/clock`)**: Mobile-first, lightweight, cookie-free client designed for shop-floor devices. It depends on URL tokens (`?token=WORKPLACE_TOKEN`) for workplace binding and verification.
- **Protected Back-End (`/admin/*`)**: Desktop-optimized, analytical dashboards. Access is restricted using Next.js Edge Middleware checks.
- **API Boundary separation**:
  - `/api/clock/*` (Public, token-authorized): Exposes workplace name, active staff lists (excluding PIN hashes), and receives clock-in/out event payloads.
  - `/api/admin/*` (Protected, session-authorized): Manages staff databases, records adjustments, audit logs, payroll calculations, and Excel exports.

---

## 3. Timezone & Business Date Boundary Conventions

Because retail and manufacturing shop floors cross standard calendar days (e.g. shifts ending at 01:00 AM), timezone consistency is critical:

- **Asia/Taipei Timezone Enforcement**: All incoming server calculations and API boundaries align with Taiwan Standard Time (UTC+8).
- **Business Date Helper (`src/lib/date.ts`)**:
  - `getTaiwanNow()`: Instantiates current Date shifted by Taiwan offset.
  - `getTaiwanBusinessDate()`: Determines which business calendar date an event belongs to. Shifts clock-in events to the correct date index.
  - `getTaiwanMonthRange(year, month)`: Projects UTC timestamps mapping exactly to the local 1st and last day boundary offsets.

---

## 4. GPS Geofencing & Haversine Distance Mathematics

To verify if an employee is physically on-site during check-in/out, the platform implements GPS validation using the **Haversine Formula**:

$$d = 2R \arcsin \left( \sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)} \right)$$

Where:
- $R$ is the Earth's radius ($6,371,000$ meters).
- $\phi_1, \phi_2$ are latitudes in radians.
- $\lambda_1, \lambda_2$ are longitudes in radians.

### Location Evaluation States
Based on distance $d$, the event is classified into one of four states:
1. **NORMAL**: $d \le \text{allowedRadiusMeters}$. Allowed.
2. **SUSPICIOUS**: $\text{allowedRadiusMeters} < d \le \text{warningRadiusMeters}$. Allowed, but flagged in red for admin review.
3. **BLOCKED**: $d > \text{warningRadiusMeters}$. Rejected.
4. **LOCATION\_DENIED**: GPS permissions disabled by user. Rejected.

---

## 5. Security & Session Design

1. **HttpOnly Cookie Authorization**:
   - Authentication tokens are signed using high-security JWTs (`jose`) and transmitted as `HttpOnly`, `Secure`, `SameSite=Lax` cookies named `admin_token`.
   - Prevents client-side scripts (XSS attacks) from reading administrative sessions.
2. **One-Way PIN Hashing**:
   - Employee PINs are hashed using `bcryptjs` with a cost factor of 10 (`pinHash`) and never sent over the public API.
3. **Immutable Audit Logging**:
   - Any manual administrative alterations (e.g. editing clock times, adding missing records) automatically create an immutable entry in the `AuditLog` table, tracking:
     - Admin identity
     - Source IP address
     - Detailed modifications (before/after state)
     - Timestamp
