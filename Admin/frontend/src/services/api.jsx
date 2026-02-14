/**
 * API Service
 * Centralized API client configuration and endpoints
 * @module services/api
 */

import axios from "axios";
import { API_CONFIG, STORAGE_KEYS } from "../constants";

// Remove trailing slash from base URL
const API_BASE_URL = API_CONFIG.BASE_URL.replace(/\/$/, "");

/**
 * Create axios instance with default configuration
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Request interceptor - Add auth token to requests
 */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Response interceptor - Handle authentication errors
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    try {
      const status = error.response?.status;
      if (status === 401) {
        // Signal logout globally
        try {
          window.dispatchEvent(new CustomEvent('admin-logout'));
        } catch (e) {
          // Ignore if event dispatch fails
        }
        // Clear stored token as a fallback
        localStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.ADMIN);
      }
    } catch (e) {
      // Ignore interceptor errors
    }
    return Promise.reject(error);
  }
);

// ==================== ADMIN AUTH ====================
export const adminLogin = (email, password) =>
  api.post("/admin/login", { email, password });

export const adminRegister = (username, email, password, role) =>
  api.post("/admin/register", { username, email, password, role });

export const getAdminProfile = () => api.get("/admin/me");
export const updateAdminProfile = (data) => api.put("/admin/me", data);

// ==================== USER MANAGEMENT ====================
export const getAllUsers = (params = {}) => api.get("/admin/users", { params });

export const getUserById = (id) => api.get(`/admin/users/${id}`);

export const createUser = (userData) => api.post("/admin/users", userData);

export const updateUser = (id, userData) => api.put(`/admin/users/${id}`, userData);

export const deleteUser = (id) => api.delete(`/admin/users/${id}`);

// ==================== PASSWORD MANAGEMENT ====================
export const changePassword = (currentPassword, newPassword) => api.post("/admin/change-password", { currentPassword, newPassword });

export const requestPasswordReset = (email) => api.post("/admin/password-reset/request", { email });

export const confirmPasswordReset = (token, newPassword) => api.post("/admin/password-reset/confirm", { token, newPassword });

// ==================== SESSIONS (Project 4 Integration) ====================
export const getAllSessions = (filters = {}) => api.get("/admin/sessions", { params: filters });

export const getUserSessions = (userId) => api.get(`/admin/sessions/user/${userId}`);

export const addSession = (sessionData) => api.post("/admin/sessions", sessionData);

export const uploadSession = (sessionData) => api.post("/admin/sessions/upload", sessionData);

// ==================== ACTIVITY LOGS ====================
export const getActivityLogs = (filters = {}) => api.get("/admin/activity-logs", { params: filters });

// ==================== APP SETTINGS ====================
export const getSettings = () => api.get("/admin/settings");

export const updateSettings = (settings) => api.put("/admin/settings", settings);

export const resetSettings = () => api.post("/admin/settings/reset");

// ==================== BREAK REQUESTS ====================
export const getPendingBreaks = () => api.get("/admin/breaks/pending");

export const getAllBreaks = (params = {}) => api.get("/admin/breaks/all", { params });

export const processBreakRequest = (id, status, adminNotes) => 
  api.patch(`/admin/breaks/${id}/process`, { status, adminNotes });

// ==================== LEAVE REQUESTS ====================
export const getAllLeavesAdmin = (params = {}) => api.get("/admin/leaves", { params });

export const updateLeaveStatus = (id, data) => api.patch(`/admin/leaves/${id}`, data);

export const getLeaveBalance = () => api.get("/api/leaves/balance");

export const getMyLeaves = (filter = 'year') => api.get("/api/leaves/my-leaves", { params: { filter } });

export const applyLeave = (leaveData) => {
  const formData = new FormData();
  Object.keys(leaveData).forEach(key => {
    formData.append(key, leaveData[key]);
  });
  return api.post("/api/leaves/apply", formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

// ==================== ATTENDANCE ====================
export const getAttendanceToday = () => api.get("/admin/attendance/today");

export const getAttendanceByDateRange = (params = {}) => 
  api.get("/admin/attendance/range", { params });

export const getUserAttendance = (userId, params = {}) => 
  api.get(`/admin/attendance/user/${userId}`, { params });

export const getAttendanceStatus = (userId) => 
  api.get(`/admin/attendance/status/${userId}`);

// ==================== CLOCK-OUT REQUESTS ====================
export const getClockOutRequests = (params = {}) => 
  api.get("/admin/attendance/clock-out-requests", { params });

export const processClockOutRequest = (requestId, status, adminNotes = "") => 
  api.put(`/admin/attendance/clock-out-requests/${requestId}`, { status, adminNotes });

// ==================== SCREENSHOTS ====================
export const captureScreenshot = (userId) => 
  api.post("/admin/screenshots/capture", { userId });

// ==================== ANALYTICS ====================
export const getDashboardStats = () => api.get("/admin/analytics/stats");

export const getUserProductivity = (userId) => api.get(`/admin/analytics/productivity/${userId}`);

// ==================== REPORTS ====================
export const getDailyReports = (userId, date = null) => api.get(`/admin/sessions/day/${userId}`, { params: { date } });

export const getWeeklyReports = (userId, startDate = null) => api.get(`/admin/sessions/week/${userId}`, { params: { startDate } });

export const getMonthlyReports = (userId, month = null, year = null) => api.get(`/admin/sessions/month/${userId}`, { params: { month, year } });

// ==================== HEALTH ====================
export const healthCheck = () => api.get("/health");

export default api;
