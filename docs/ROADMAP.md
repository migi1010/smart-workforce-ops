# Future Product Roadmap: Smart Workforce Operations System

This document outlines the planned feature roadmap for future iterations of the Smart Workforce Operations System.

---

## Phase 1: Multi-Tenant Architecture
Support multiple retail branches or shop floors under a single corporate administrative account.

- **Corporate hierarchy**: Introduce organizational divisions (Regions, Branches, Stores).
- **Tenant Isolation**: Separate employee registries and workplace profiles by branch.
- **Unified Admin Portal**: Allow corporate managers to toggle between outlets and view aggregated company-wide operational data.

---

## Phase 2: Shift Scheduling Integration
Coordinate work rosters with check-in windows.

- **Shift Planner**: A drag-and-drop calendar interface in the admin panel to assign shifts.
- **Roster Enforcement**: Restrict clock-ins to scheduled shift times (e.g. deny clock-in if >30 minutes early).
- **Automated Absence Detection**: Automatically mark employees as `ABSENT` if they fail to check in within a specified window.

---

## Phase 3: Biometric & Facial Verification
Prevent proxy clocking ("buddy punching") on the shop floor.

- **Front-Camera Snapshots**: Capture a photo using the device camera during check-in/out.
- **Facial Comparison**: Use lightweight machine learning models (e.g. `face-api.js`) to match check-in photos against the employee's registry photo.
- **Photo Logs**: Store check-in photos in a secure S3 bucket and link them to attendance records for admin audit.

---

## Phase 4: Labor Regulation & Overtime Engine
Ensure compliance with local labor standards and automate overtime calculations.

- **Overtime Calculations**: Automatically calculate overtime pay based on configured rules (e.g. 1.33x for first 2 hours, 1.66x for subsequent hours).
- **Holiday & Rest Day Premium Rates**: Track calendar holidays and apply premium pay multipliers.
- **Statutory Deductions**: Integrate tax withholdings, labor insurance, and health insurance deductions into the payroll engine.

---

## Phase 5: Real-time Analytics Dashboard
Provide management with real-time operational insights.

- **Live Attendance Dashboard**: Real-time monitor showing which employees are currently clocked in.
- **Operational KPIs**: Charts visualizing labor cost velocity, shift coverage percentages, and average check-in accuracy.
- **Cost Forecasting**: Predictive labor cost estimation based on planned shifts and historical clock-in patterns.
