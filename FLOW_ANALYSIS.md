# Employee Tracker System - Complete Flow Analysis

## System Overview
The Employee Tracker consists of three main components:
1. **Admin Backend** (Node.js/Express + MongoDB)
2. **Admin Frontend** (React Web App)
3. **Employee App** (Electron Desktop App - "Project 4")

---

## 1. Admin Backend APIs - What Backend Provides

### 🔐 Authentication & Authorization Routes
| Endpoint | Method | Purpose | Access |
|----------|--------|---------|--------|
| `/admin/register` | POST | Register new admin | Public (rate-limited) |
| `/admin/login` | POST | Admin login | Public (rate-limited) |
| `/admin/password-reset/request` | POST | Request password reset | Public |
| `/admin/password-reset/confirm` | POST | Confirm password reset | Public |
| `/admin/me` | GET | Get current admin profile | Private (requires auth) |
| `/admin/me` | PUT | Update current admin profile | Private |
| `/admin/change-password` | POST | Change admin password | Private |
| `/admin/refresh-token` | POST | Refresh JWT token | Semi-public (ignores expiration) |

### 👥 User Management Routes (Admin/Superadmin Only)
| Endpoint | Method | Purpose | Access |
|----------|--------|---------|--------|
| `/admin/users` | GET | Get all users (paginated, filterable) | Admin/Superadmin |
| `/admin/users` | POST | Create new employee user | Admin/Superadmin |
| `/admin/users/:id` | GET | Get user by ID | Admin/Superadmin |
| `/admin/users/:id` | PUT | Update user details | Admin/Superadmin |
| `/admin/users/:id` | DELETE | Delete user (soft delete) | Admin/Superadmin |

### 🔑 Employee Authentication Routes (For Electron App)
| Endpoint | Method | Purpose | Access |
|----------|--------|---------|--------|
| `/admin/users/authenticate` | POST | Employee login (Electron App) | Public (rate-limited) |
| `/admin/users/change-password` | PUT | Change employee password | Private (Employee) |
| `/admin/users/status/:userId` | GET | Get employee status | Public |

### 📊 Analytics & Dashboard Routes
| Endpoint | Method | Purpose | Access |
|----------|--------|---------|--------|
| `/admin/analytics/stats` | GET | Dashboard statistics | Admin/Superadmin |
| `/admin/analytics/activity` | GET | User activity analytics | Admin/Superadmin |
| `/admin/analytics/productivity/:userId` | GET | User productivity metrics (with date range support) | Admin/Owner |

### ⚙️ Settings Routes
| Endpoint | Method | Purpose | Access |
|----------|--------|---------|--------|
| `/admin/settings` | GET | Get app settings | All authenticated users |
| `/admin/settings` | PUT | Update settings | Admin/Superadmin |
| `/admin/settings/reset` | POST | Reset to defaults | Admin/Superadmin |

**Settings Synced to Employee App:**
- `screenshotInterval` - Frequency of automated screenshots
- `idleThreshold` - Time of inactivity before marking as idle
- `breakSchedules` - Configurable afternoon and evening break times
- `standardClockInTime` - Threshold for "delayed" status (e.g., 10:15 AM)
- `maxUsersAllowed` - System license limit
- `maintenanceMode` - Flag to disable system for maintenance
- `allowScreenshotDeletion` - Control if employees can delete their own captures

### ☕ Break Management Routes
| Endpoint | Method | Purpose | Access |
|----------|--------|---------|--------|
| `/admin/breaks/request` | POST | Submit break request | Employee (from App) |
| `/admin/breaks/pending` | GET | Get pending break requests | Admin/Superadmin |
| `/admin/breaks/all` | GET | Get all breaks (paginated) | Admin/Superadmin |
| `/admin/breaks/:id/process` | PATCH | Approve/Reject break | Admin/Superadmin |

### 🕐 Attendance & Clock In/Out Routes
| Endpoint | Method | Purpose | Access |
|----------|--------|---------|--------|
| `/admin/attendance/clock-in` | POST | Clock in with location | Employee (from App) |
| `/admin/attendance/clock-out` | POST | Clock out (normal) | Employee (from App) |
| `/admin/attendance/clock-out-request` | POST | Request early clock-out | Employee (from App) |
| `/admin/attendance/today` | GET | Today's attendance records | Admin/Superadmin |
| `/admin/attendance/range` | GET | Attendance by date range | Admin/Superadmin |
| `/admin/attendance/clock-out-requests` | GET | Pending clock-out requests | Admin/Superadmin |
| `/admin/attendance/clock-out-requests/:id` | PUT | Approve/Reject clock-out | Admin/Superadmin |
| `/admin/attendance/status/:userId` | GET | Get current attendance status | Employee/Admin |
| `/admin/attendance/user/:userId` | GET | User attendance history | Admin/Owner |

### 📸 Screenshots Routes
| Endpoint | Method | Purpose | Access |
|----------|--------|---------|--------|
| `/admin/screenshots/capture` | POST | Manually trigger screenshot | Admin/Superadmin |
| `/admin/screenshots/user/:userId` | GET | Get user's screenshots | Admin/Employee-owner |

### 📋 Sessions & Tracking Routes
| Endpoint | Method | Purpose | Access |
|----------|--------|---------|--------|
| `/admin/sessions/upload` | POST | Stream tracking data (incremental updates) | Public (rate-limited) |
| `/admin/sessions` | GET | Get all sessions | Admin/Superadmin |
| `/admin/sessions` | POST | Create session | Admin/Superadmin/User |
| `/admin/sessions/:id` | GET | Get session by ID | Admin/Superadmin |
| `/admin/sessions/stats` | GET | Session statistics | Admin/Superadmin |
| `/admin/sessions/user/:userId` | GET | Get user sessions | Admin/Owner |
| `/admin/sessions/day/:userId` | GET | Daily sessions | Admin/Owner |
| `/admin/sessions/week/:userId` | GET | Weekly sessions | Admin/Owner |
| `/admin/sessions/month/:userId` | GET | Monthly sessions | Admin/Owner |

### 📝 Activity Logs Routes
| Endpoint | Method | Purpose | Access |
|----------|--------|---------|--------|
| `/admin/activity-logs` | POST | Log specific activity events | Employee (from App) |
| `/admin/activity-logs` | GET | Get activity logs | Admin/Superadmin |
| `/admin/activity-logs/stats` | GET | Activity statistics | Admin/Superadmin |

### 🌴 Leave Management Routes
| Endpoint | Method | Purpose | Access |
|----------|--------|---------|--------|
| `/admin/leaves` | GET | Get all leave requests (filterable) | Admin/Superadmin |
| `/admin/leaves/:id` | PATCH | Process leave request (Approve/Reject) | Admin/Superadmin |
| `/api/leaves/balance` | GET | Get leave balance (annual/comp-off) | Employee |
| `/api/leaves/apply` | POST | Submit leave application with attachment | Employee |
| `/api/leaves/my-leaves` | GET | Get own leave history | Employee |

### 🔧 Maintenance & Cleanup Routes
| Endpoint | Method | Purpose | Access |
|----------|--------|---------|--------|
| `/admin/maintenance/storage-stats` | GET | Get system storage & data stats | Superadmin |
| `/admin/maintenance/cleanup` | POST | Run cleanup for old data & orphans | Superadmin |

---

## 2. Admin Frontend Pages - What Admin Can See/Do

### 📊 Dashboard (`/dashboard`)
- **Key Cards:** Total Users, Active (24h), Active Sessions, Total Sessions, Pending Breaks.
- **Quick Links:** Fast navigation to all major modules.
- **Systems Status:** Real-time indicator of Server and Database connectivity.
- **Notifications:** Pulsing indicators for pending break requests.

### 👥 User Management (`/users`)
- **Real-time Status:** Pulsing green indicators for online users (via Socket.io).
- **Online/Offline Tracking:** "Active Now" vs "Last Active" timestamps.
- **Roles:** Support for Superadmin, Admin, Manager, and User roles.
- **Actions:** Edit profiles, deactivate users, and **instantly trigger remote screenshots**.

### 📺 Live Tracking View (`/tracking`)
- Detailed breakdown of active/past sessions.
- Productivity metrics based on work-to-idle ratio.
- Interactive application usage charts.
- Expandable high-resolution screenshot gallery.

### 🕐 Attendance (`/attendance`)
- Filterable view of daily attendance status.
- **Range Filtering:** Capability to view attendance over custom periods.
- Geolocation tracking for all clock events.
- **Clock-out Approval:** Review and process early clock-out requests.

### 🌴 Leave Management (`/leaves`)
- **Approval Workflow:** Review pending leave requests (Annual/Comp Off).
- **Admin Commentary:** Add internal notes or rejection reasons.
- **Document Review:** View uploaded medical certificates or documents directly.
- **User Filtering:** View leave history for specific employees.

### 📊 Reports (`/reports`)
- Comprehensive Daily, Weekly, and Monthly productivity reports.
- **Data Export:** Built-in capability to **export reports as CSV files**.
- Interactive sorting by Time, Working Duration, Idle Time, or Productivity.
- Detailed session drill-downs within weekly/monthly views.

### ⚙️ Settings (`/settings`)
- Sync intervals for tracking and screenshots.
- Activity detection threshold configuration.
- Fixed break schedule management.
- System-wide maintenance mode and deletion permissions.

---

## 3. Employee App (Project 4) - What Employees Can Do

### 🖥️ Main Navigation
- **Tracking Dashboard:** Core work/time tracking interface.
- **Leaves Page:** Dedicated portal for leave balance and applications.
- **Profile:** Manage personal information and credentials.

### 📊 Tracking Dashboard
- **Location-Aware Clock-in:** Automatic GPS capture for attendance.
- **Smart Break System:** Choose between preset (5m, 10m, etc.) or custom requested breaks.
- **Intelligent Tracking:** Background activity monitoring (keyboard/mouse) for accuracy.
- **Feedback:** Real-time visibility into current session duration and idle status.

### 🌴 Leave Portal
- **Balance Overview:** See available vs utilized Annual and Comp Off leaves.
- **Smart Accrual:** Visual feedback on earned leaves (accrued monthly).
- **Application Form:** Support for Half-day requests and file attachments.
- **History:** Searchable history (Week/Month/Year) with status tracking (Pending/Approved/Rejected).

### 📸 Dynamic Screenshots
- **Automated:** Captures at admin-defined intervals.
- **On-Demand:** Responds instantly to manual capture requests from Admin via Sockets.
- **Local Cache:** Temporarily stores captures before secure upload.

---

## 4. Real-Time Communication (Socket.io)

### Unified Event Bus
- **`take-screenshot`**: Remote triggering of capture on client machines.
- **`settings-updated`**: Instant synchronization of global config.
- **`break-approved/rejected`**: Real-time notification toast on employee apps.
- **`employee-status-changed`**: Live heartbeats showing admin who is currently working.

---

## 5. Missing or Incomplete Features

### ✅ Fully Implemented:
- **Core Tracking:** Clock in/out with geolocation and activity metrics.
- **Monitoring:** Automatic/Manual screenshots and live session status.
- **Communication:** Real-time socket-based events and notifications.
- **Leave Management:** Complete request/approval flow with balance system.
- **Reporting:** Daily/Weekly/Monthly productivity logs with **CSV Export**.
- **Maintenance:** Data cleanup and storage statistics system.
- **Security:** JWT Authentication, Role-Based Access, and Input Validation.

### ⚠️ Partially Implemented:
- **User Export:** User list UI allows searching/filtering but lacks a CSV/Excel export button.
- **Email Notifications:** Routes for password reset and approvals exist, but external mail transport is not configured.

### ❌ Potential Enhancements:
1. **Shift Management:** Adding predefined work shifts (Shift A/B/C).
2. **Geofencing:** Restricting clock-in to specific radius around office locations.
3. **Payroll Export:** Formatting export data specifically for payroll systems.
4. **Advanced Insights:** Comparative team analytics and trend predictions.

---

## 6. Technology Stack

- **Backend:** Node.js, Express, MongoDB, Socket.io, Mongoose, Winston.
- **Admin Frontend:** React 18, Tailwind CSS, Lucide Icons, Recharts, Axios.
- **Employee App:** Electron, React, TypeScript, uiohook-napi (Native OS activity tracking).

---

## Summary

The **Employee Tracker System** is now a mature, feature-complete platform for remote and office-based workforce management. It combines native desktop tracking (Project 4) with a powerful web-based administration layer. All major business flows—including attendance, productivity tracking, and leave management—are fully operational and synchronized in real-time.
