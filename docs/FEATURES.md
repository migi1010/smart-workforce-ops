# Functional Features: Smart Workforce Operations System

This document provides a detailed breakdown of the features and modules available in the Smart Workforce Operations System.

---

## 1. Shop-Floor Attendance & Digitization

The front-end clock-in panel (`/clock`) is optimized for shared tablets or mobile devices mounted at the facility entrance.

- **Fast Select & PIN Authentication**: Employees select their name from an active staff dropdown and input a 4-digit PIN, eliminating slow password entry.
- **Dynamic Digital Clock**: Real-time Taiwan Standard Time clock interface.
- **Device GPS Verification**: Prompts user for GPS permission, verifies coordinates using high-accuracy geolocation APIs, and calculates real-world distance from the shop-floor geofence.
- **Immediate Feedback**: Clear, animated Traditional Chinese success/error panels indicating check-in status (e.g. Normal, Suspicious/Flagged, or Blocked due to excessive distance).

---

## 2. Smart Operations & Geofencing Config

Administrators can configure the physical geofence boundaries for each location:

- **Workplace Coordinates**: Precise latitude/longitude configuration.
- **Flexible Geofence Radii**:
  - **Allowed Radius**: Boundary within which check-ins are marked green/NORMAL.
  - **Warning Radius**: Boundary within which check-ins are flagged yellow/SUSPICIOUS for review.
- **Dynamic Workplace Tokens**: A secure token parameter (`workplaceToken`) binds check-in terminals. Admins can regenerate the token in one click to invalidate old URLs or leaked QR codes.

---

## 3. Labor Cost Analytics & Payroll Engine

The analytics dashboard (`/admin/payroll`) processes attendance records in real-time using individual employee rates:

- **Individual Hourly Wages**: Computes payroll based on `Employee.hourlyRate` rather than a global average.
- **Rule-Based Exclusions**:
  - Automatically excludes `ABSENT` and `LEAVE` days from working hour summaries and salary costs.
  - Includes `NORMAL`, `LATE`, and `EARLY_LEAVE` as paid working hours.
- **Calculated Metric Cards**:
  - **Total Payroll Cost**: Total NTD wages for the selected period.
  - **Total Clocked Hours**: Combined paid working hours.
  - **Staff Count**: Active employee count in the selected period.
  - **Average Salary**: Total payroll cost divided by staff count.
- **Sorting**: Automatically lists employees sorted by highest monthly salary descending to highlight top labor cost drivers.

---

## 4. Attendance Correction & Audit Logs

Admins have full editing controls to correct recording mistakes or handle missing events:

- **Clock-In/Out Adjustments**: Modify raw clock times manually. Total hours and statuses are recalculated automatically.
- **Manual Backfills (補登)**: Add records for employees who forgot to clock in/out.
- **Audit Trails**: Every edit logs an immutable database record, capturing the admin who made the change, previous values, IP address, and browser User Agent.

---

## 5. Excel Report Exporters

Supports exporting payroll and operational data into standard Excel workbooks for external accounting integrations:

- **Sheet 1: 薪資總表 (Salary Summary)**:
  - Columns: `員工編號` (Code), `員工姓名` (Name), `時薪 (NTD)` (Rate), `出勤天數` (Worked Days), `本月總工時` (Total Hours), `本月薪資 (NTD)` (Salary).
- **Sheet 2: 出勤明細 (Daily Details)**:
  - Daily breakdowns including clock times (Taiwan Standard Time), calculated hours, status flags, and notes.
- **Sheet 3: 摘要 (High-level Summary)**:
  - Period metrics including total costs, average wage, and export timestamps.
- **Formattings**:
  - Integer salary format (NTD).
  - Floating hours rounded to 2 decimals.
  - Timestamps formatted as `YYYY-MM-DD` and `HH:mm`.
