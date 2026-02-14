// Admin Sync Service for Project 4
// This service handles synchronization between the Electron app and the Admin backend
import { AppSettings } from '../types/electron';

const ADMIN_API_URL = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:5000/admin';

interface ActivityMetrics {
    keyPresses: number;
    mouseClicks: number;
    mouseMovements: number;
    mouseScrolls: number;
}

interface ScreenshotData {
    path: string;
    timestamp: number;
    data?: string;
}

interface BreakDetail {
    type: string;
    startTime: number;
    endTime?: number;
    duration: number;
}

interface SessionData {
    workingTime: number;
    idleTime: number;
    sessionStart?: number;
    sessionEnd?: number;
    date?: string;
    timestamp?: number;
    screenshotCount?: number;
    breaksTaken?: number;
    screenshots?: ScreenshotData[];
    breakDetails?: BreakDetail[];
    activityMetrics?: ActivityMetrics;
}

class AdminSyncService {
    private syncEnabled: boolean;
    private syncInterval: ReturnType<typeof setInterval> | null;

    constructor() {
        this.syncEnabled = true;
        this.syncInterval = null;
    }

    /**
     * Log activity to Admin backend
     */
    async logActivity(action: string, details: Record<string, unknown> = {}) {
        if (!this.syncEnabled) return;

        try {
            const userId = this.getCurrentUserId();
            const userName = this.getCurrentUserName();
            
            // Don't log background activity if not clocked in
            const isClockedIn = localStorage.getItem('isClockedIn') === 'true';
            const essentialActions = ['CLOCK_IN', 'CLOCK_OUT', 'LOGIN', 'LOGOUT'];
            if (!isClockedIn && !essentialActions.includes(action)) {
                return;
            }

            if (!userId) return;

            // Don't await this to avoid blocking
            fetch(`${ADMIN_API_URL}/activity-logs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    userName,
                    action,
                    details,
                    timestamp: new Date()
                })
            }).catch(err => console.error('Failed to log activity:', err));
        } catch (error) {
            console.error('Failed to prepare log activity:', error);
        }
    }

    /**
     * Get auth token from localStorage
     */
    getAuthToken(): string | null {
        try {
            return localStorage.getItem('adminAuthToken');
        } catch (error) {
            console.error('Failed to get auth token:', error);
            return null;
        }
    }

    /**
     * Set auth token in localStorage
     */
    setAuthToken(token: string) {
        try {
            localStorage.setItem('adminAuthToken', token);
        } catch (error) {
            console.error('Failed to set auth token:', error);
        }
    }

    /**
     * Clear auth token from localStorage
     */
    clearAuthToken() {
        try {
            localStorage.removeItem('adminAuthToken');
        } catch (error) {
            console.error('Failed to clear auth token:', error);
        }
    }

    /**
     * Get authorization headers with token
     */
    getAuthHeaders(): HeadersInit {
        const token = this.getAuthToken();
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    }

    /**
     * Authenticate user with Admin backend
     * Called during login
     */
    async authenticateUser(email: string, password: string) {
        if (!this.syncEnabled) return { success: false, error: 'Sync disabled' };

        try {
            const response = await fetch(`${ADMIN_API_URL}/users/authenticate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Authentication failed: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ User authenticated with Admin backend:', data);

            // Store auth token if provided
            if (data?.data?.token) {
                this.setAuthToken(data.data.token);
                console.log('✅ Auth token stored');
            }

            return { success: true, user: data?.data?.user, token: data?.data?.token };
        } catch (error) {
            console.error('❌ Failed to authenticate with Admin:', error);
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Refresh authentication token
     * Called when token is about to expire or after 401 error
     */
    async refreshToken() {
        if (!this.syncEnabled) return { success: false, error: 'Sync disabled' };

        try {
            const response = await fetch(`${ADMIN_API_URL}/refresh-token`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
            });

            if (!response.ok) {
                // If it's a 401/403, the session is definitely invalid
                if (response.status === 401 || response.status === 403) {
                    this.clearAuthToken();
                    window.dispatchEvent(new CustomEvent('token-expired'));
                }
                throw new Error(`Token refresh failed: ${response.status}`);
            }

            const data = await response.json();

            if (data?.data?.token) {
                this.setAuthToken(data.data.token);
                console.log('✅ Token refreshed successfully');
                return { success: true, token: data.data.token };
            }

            throw new Error('No token in refresh response');
        } catch (error) {
            console.error('❌ Failed to refresh token:', error);
            // Don't clear token on network errors, only on explicit 401/403
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Make authenticated request with automatic token refresh on 401
     */
    async authenticatedFetch(url: string, options: RequestInit = {}, retryOnce = true): Promise<Response> {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...this.getAuthHeaders(),
                ...(options.headers || {})
            }
        });

        // If 401 and we haven't retried yet, try to refresh token
        if (response.status === 401 && retryOnce) {
            const refreshResult = await this.refreshToken();

            if (refreshResult.success) {
                // Retry the request with new token
                return this.authenticatedFetch(url, options, false);
            }
        }

        return response;
    }

    /**
     * Change user password
     * Called when user wants to change their password
     */
    async changePassword(userId: string, oldPassword: string, newPassword: string) {
        if (!this.syncEnabled) return { success: false, error: 'Sync disabled' };

        try {
            const response = await this.authenticatedFetch(`${ADMIN_API_URL}/users/change-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    oldPassword,
                    newPassword,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Password change failed: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ Password changed successfully:', data);
            return { success: true, data };
        } catch (error) {
            console.error('❌ Failed to change password:', error);
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Upload session data to Admin backend
     * Called when session is saved/reset
     */
    async uploadSession(sessionData: SessionData) {
        if (!this.syncEnabled) return { success: false, error: 'Sync disabled' };

        try {
            // Get current user ID from localStorage or context
            const userId = this.getCurrentUserId();
            const userName = this.getCurrentUserName();
            if (!userId) {
                throw new Error('No user ID available');
            }

            const response = await fetch(`${ADMIN_API_URL}/sessions/upload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    userName,
                    workingTime: sessionData.workingTime,
                    idleTime: sessionData.idleTime,
                    sessionStart: sessionData.sessionStart,
                    sessionEnd: sessionData.sessionEnd || Date.now(),
                    date: sessionData.date,
                    timestamp: sessionData.timestamp,
                    screenshotCount: sessionData.screenshotCount || 0,
                    breaksTaken: sessionData.breaksTaken || 0,
                    screenshots: sessionData.screenshots || [],
                    breakDetails: sessionData.breakDetails || [],
                    activityMetrics: sessionData.activityMetrics,
                }),
            });

            if (!response.ok) {
                throw new Error(`Session upload failed: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ Session uploaded to Admin backend:', data);
            return { success: true, data };
        } catch (error) {
            console.error('❌ Failed to upload session to Admin:', error);
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Fetch user sessions from Admin backend
     * Returns all sessions for the current user
     */
    async fetchUserSessions({ date, userId, filter }: { date?: string; userId?: string; filter?: string }) {
        console.log(`Fetching user sessions... Filter: ${filter}, Date: ${date}`);
        if (!this.syncEnabled) return { success: false, error: 'Sync disabled' };

        try {
            // Use passed userId or fallback to current user
            const targetUserId = userId || this.getCurrentUserId();
            if (!targetUserId) {
                throw new Error('No user ID available');
            }

            let url = `${ADMIN_API_URL}/sessions/user/${targetUserId}`;

            // Map frontend filters to backend endpoints and params
            if (filter === 'day') {
                url = `${ADMIN_API_URL}/sessions/day/${targetUserId}?date=${date}`;
            } else if (filter === 'week') {
                // Backend expects 'startDate' for weekly
                url = `${ADMIN_API_URL}/sessions/week/${targetUserId}?startDate=${date}`;
            } else if (filter === 'month') {
                // Backend expects 'month' and 'year' for monthly
                const d = date ? new Date(date) : new Date();
                const month = d.getMonth() + 1;
                const year = d.getFullYear();
                url = `${ADMIN_API_URL}/sessions/month/${targetUserId}?month=${month}&year=${year}`;
            }

            // Use authenticatedFetch for automatic token refresh
            const response = await this.authenticatedFetch(url, {
                method: 'GET',
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Authentication failed. Please log in again.');
                }
                throw new Error(`Sessions fetch failed: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ Sessions fetched from Admin backend:', data);

            // Handle different response structures based on filter type
            let sessions = [];

            if (filter === 'day') {
                // Daily endpoint returns: { success: true, data: [...sessions] }
                sessions = Array.isArray(data?.data) ? data.data : [];
            } else if (filter === 'week') {
                // Weekly endpoint returns: { success: true, data: { weekStart, weekEnd, summary, sessions: [...] } }
                sessions = data?.data?.sessions || [];
            } else if (filter === 'month') {
                // Monthly endpoint returns: { success: true, data: { month, year, summary, dailyData: [...] } }
                // We need to flatten dailyData to get all sessions
                const dailyData = data?.data?.dailyData || [];
                sessions = dailyData.flatMap((day: { sessions?: SessionData[] }) => day.sessions || []);
            } else {
                // Default fallback for /user/:userId endpoint
                sessions = data?.data?.sessions || data?.data || [];
            }

            console.log(`📊 Parsed ${sessions.length} sessions for filter: ${filter}`);
            return { success: true, sessions };
        } catch (error) {
            console.error('❌ Failed to fetch sessions from Admin:', error);
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Fetch app settings from Admin backend
     * Returns settings like screenshot interval, idle threshold, etc.
     */
    async fetchSettings() {
        if (!this.syncEnabled) return { success: false, error: 'Sync disabled' };

        try {
            const response = await fetch(`${ADMIN_API_URL}/settings`, {
                method: 'GET',
                headers: this.getAuthHeaders(),
            });

            if (!response.ok) {
                throw new Error(`Settings fetch failed: ${response.statusText}`);
            }

            const data = await response.json();
            // console.log('✅ Settings fetched from Admin backend:', data);
            
            // Backend might return { success: true, settings: { ... } } or { success: true, data: { ... } }
            const settings = data.settings || data.data || data;
            
            return { success: true, settings };
        } catch (error) {
            console.error('❌ Failed to fetch settings from Admin:', error);
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Check user status (active, suspended, etc.)
     * Returns user status from Admin backend
     */
    async checkUserStatus() {
        if (!this.syncEnabled) return { success: false, error: 'Sync disabled' };

        try {
            const userId = this.getCurrentUserId();
            if (!userId) {
                throw new Error('No user ID available');
            }

            const response = await fetch(`${ADMIN_API_URL}/users/status/${userId}`, {
                method: 'GET',
                headers: this.getAuthHeaders(),
            });

            if (!response.ok) {
                throw new Error(`Status check failed: ${response.statusText}`);
            }

            const data = await response.json();
            // console.log('✅ User status checked:', data);

            // If user is suspended, notify the app
            if (data.status === 'suspended') {
                this.handleUserSuspended();
            }

            return { success: true, status: data.status };
        } catch (error) {
            console.error('❌ Failed to check user status:', error);
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Fetch productivity analytics for current user
     */
    async fetchProductivityAnalytics(startDate?: string, endDate?: string) {
        if (!this.syncEnabled) return { success: false, error: 'Sync disabled' };

        try {
            const userId = this.getCurrentUserId();
            if (!userId) {
                throw new Error('No user ID available');
            }

            let url = `${ADMIN_API_URL}/analytics/productivity/${userId}`;
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            const response = await this.authenticatedFetch(url, {
                method: 'GET',
            });

            if (!response.ok) {
                throw new Error(`Analytics fetch failed: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('📊 Productivity analytics fetched:', data);

            return { success: true, data: data.data };
        } catch (error) {
            console.error('❌ Failed to fetch productivity analytics:', error);
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Submit a break request to Admin backend
     */
    async requestBreak(startTime: Date, endTime: Date, reason: string) {
        if (!this.syncEnabled) return { success: false, error: 'Sync disabled' };

        try {
            const userId = this.getCurrentUserId();
            const userName = this.getCurrentUserName();
            if (!userId) {
                throw new Error('No user ID available');
            }

            const response = await this.authenticatedFetch(`${ADMIN_API_URL}/breaks/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    userName,
                    startTime,
                    endTime,
                    reason,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Break request failed: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ Break requested successfully:', data);
            return { success: true, data: data.data };
        } catch (error) {
            console.error('❌ Failed to request break:', error);
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Clock in with current location
     */
    async clockIn(location: { latitude: number; longitude: number; address?: string }): Promise<{ 
        success: boolean; 
        error?: string;
        data?: unknown;
        delayInfo?: {
            isDelayed: boolean;
            delayMinutes?: number;
            message: string;
        };
    }> {
        if (!this.syncEnabled) return { success: false, error: 'Sync disabled' };

        try {
            const userId = this.getCurrentUserId();
            const userName = this.getCurrentUserName();
            if (!userId) {
                throw new Error('No user ID available');
            }

            const response = await this.authenticatedFetch(`${ADMIN_API_URL}/attendance/clock-in`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    userName,
                    location
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Clock-in failed: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ Clocked in successfully:', data);
            return { success: true, data: data.data, delayInfo: data.delayInfo };
        } catch (error) {
            console.error('❌ Failed to clock in:', error);
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Clock out with current location
     */
    async clockOut(location: { latitude: number; longitude: number; address?: string }) {
        if (!this.syncEnabled) return { success: false, error: 'Sync disabled' };

        try {
            const userId = this.getCurrentUserId();
            const userName = this.getCurrentUserName();
            if (!userId) {
                throw new Error('No user ID available');
            }

            const response = await this.authenticatedFetch(`${ADMIN_API_URL}/attendance/clock-out`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    userName,
                    location
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Clock-out failed: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ Clocked out successfully:', data);
            return { success: true, data: data.data };
        } catch (error) {
            console.error('❌ Failed to clock out:', error);
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Request a clock out early (before 8 hours)
     */
    async requestClockOut(data: {
        clockInTime: number;
        clockInLocation: any;
        requestTime: number;
        requestLocation: any;
        reason: string;
    }) {
        if (!this.syncEnabled) return { success: false, error: 'Sync disabled' };

        try {
            const userId = this.getCurrentUserId();
            const userName = this.getCurrentUserName();
            if (!userId) {
                throw new Error('No user ID available');
            }

            const response = await this.authenticatedFetch(`${ADMIN_API_URL}/attendance/clock-out-request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    userName,
                    ...data
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Clock-out request failed: ${response.statusText}`);
            }

            const responseData = await response.json();
            console.log('✅ Clock-out request submitted successfully:', responseData);
            return { success: true, data: responseData.data };
        } catch (error) {
            console.error('❌ Failed to request clock-out:', error);
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Get current attendance status
     */
    async getAttendanceStatus() {
        if (!this.syncEnabled) return { success: false, error: 'Sync disabled' };

        try {
            const userId = this.getCurrentUserId();
            if (!userId) {
                throw new Error('No user ID available');
            }

            const response = await fetch(`${ADMIN_API_URL}/attendance/status/${userId}`, {
                method: 'GET',
                headers: this.getAuthHeaders(),
            });

            if (!response.ok) {
                throw new Error(`Attendance status fetch failed: ${response.statusText}`);
            }

            const data = await response.json();
            // console.log('✅ Attendance status fetched:', data);
            return { success: true, data: data.data };
        } catch (error) {
            console.error('❌ Failed to fetch attendance status:', error);
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Fetch user's own activity logs
     */
    async fetchMyActivityLogs(limit = 50) {
        if (!this.syncEnabled) return { success: false, error: 'Sync disabled' };

        try {
            const userId = this.getCurrentUserId();
            if (!userId) {
                throw new Error('No user ID available');
            }

            const response = await this.authenticatedFetch(
                `${ADMIN_API_URL}/activity-logs?userId=${userId}&limit=${limit}`,
                { method: 'GET' }
            );

            if (!response.ok) {
                throw new Error(`Activity logs fetch failed: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('📋 Activity logs fetched:', data);

            return { success: true, logs: data.data };
        } catch (error) {
            console.error('❌ Failed to fetch activity logs:', error);
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Start periodic sync (every 5 minutes)
     * Syncs settings and checks user status
     */
    startPeriodicSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        // Initial sync
        this.performPeriodicSync();

        // Sync every 5 minutes
        this.syncInterval = setInterval(() => {
            this.performPeriodicSync();
        }, 5 * 60 * 1000);

        // console.log('✅ Periodic sync started (every 5 minutes)');
    }

    /**
     * Stop periodic sync
     */
    stopPeriodicSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('⏹️ Periodic sync stopped');
        }
    }

    /**
     * Perform periodic sync tasks
     */
    async performPeriodicSync() {
        // Skip sync if not clocked in (except for essential status checks if needed)
        const isClockedIn = localStorage.getItem('isClockedIn') === 'true';
        if (!isClockedIn) {
            console.log('⏭️ Skipping periodic sync - user not clocked in');
            return;
        }

        // console.log('🔄 Performing periodic sync...');
        window.dispatchEvent(new CustomEvent('sync-status', { detail: { status: 'syncing' } }));

        try {
            // Check user status
            await this.checkUserStatus();

            // Fetch latest settings
            const settingsResult = await this.fetchSettings();

            if (settingsResult.success) {
                // Apply settings to the app
                this.applySettings(settingsResult.settings);
            }

            window.dispatchEvent(new CustomEvent('sync-status', { detail: { status: 'success', timestamp: Date.now() } }));
            // console.log("adding log for sync success")
            this.logActivity('SYNC_SUCCESS', { timestamp: Date.now() });
        } catch (error) {
            console.error('Sync failed:', error);
            window.dispatchEvent(new CustomEvent('sync-status', { detail: { status: 'error', error: (error as Error).message } }));
            this.logActivity('SYNC_ERROR', { error: (error as Error).message });
        }
    }

    /**
     * Apply settings from Admin backend to the app
     */
    applySettings(settings: any) {
        // Extract the actual settings data from the response
        let rawSettings = settings?.data || settings;

        // Normalize naming
        const normalizedSettings: Record<string, any> = {
            screenshotInterval: rawSettings.screenshotInterval ?? rawSettings.screenshot_interval,
            idleThreshold: rawSettings.idleThreshold ?? rawSettings.idle_threshold,
            allowScreenshotDeletion: rawSettings.allowScreenshotDeletion ?? rawSettings.allow_screenshot_deletion,
            breakSchedules: rawSettings.breakSchedules ?? rawSettings.break_schedules,
            hideOnMinimize: rawSettings.hideOnMinimize ?? rawSettings.hide_on_minimize,
            hideFromDockOnMinimize: rawSettings.hideFromDockOnMinimize ?? rawSettings.hide_from_dock_on_minimize,
            hideFromTrayOnMinimize: rawSettings.hideFromTrayOnMinimize ?? rawSettings.hide_from_tray_on_minimize,
            hideBothOnMinimize: rawSettings.hideBothOnMinimize ?? rawSettings.hide_both_on_minimize
        };

        // Filter out undefined values
        const finalSettings: any = {};
        Object.keys(normalizedSettings).forEach(key => {
            if (normalizedSettings[key] !== undefined && normalizedSettings[key] !== null) {
                finalSettings[key] = normalizedSettings[key];
            }
        });

        // console.log('🔄 Normalized settings for app (in seconds):', finalSettings);

        // Store settings in localStorage for the app to use (in seconds)
        localStorage.setItem('adminSettings', JSON.stringify(finalSettings));

        // Push settings to Electron main process
        if (window.electronAPI) {
            // Electron main process expects milliseconds for intervals/thresholds
            const electronSettings: Partial<AppSettings> = {};
            
            if (finalSettings.idleThreshold !== undefined) {
                electronSettings.idleThreshold = finalSettings.idleThreshold * 1000;
            }
            if (finalSettings.screenshotInterval !== undefined) {
                electronSettings.screenshotInterval = finalSettings.screenshotInterval * 1000;
            }
            if (finalSettings.breakSchedules !== undefined) {
                electronSettings.breakSchedules = finalSettings.breakSchedules;
            }
            if (finalSettings.allowScreenshotDeletion !== undefined) {
                electronSettings.allowScreenshotDeletion = finalSettings.allowScreenshotDeletion;
            }
            if (finalSettings.hideOnMinimize !== undefined) {
                electronSettings.hideOnMinimize = finalSettings.hideOnMinimize;
            }
            if (finalSettings.hideFromDockOnMinimize !== undefined) {
                electronSettings.hideFromDockOnMinimize = finalSettings.hideFromDockOnMinimize;
            }
            if (finalSettings.hideFromTrayOnMinimize !== undefined) {
                electronSettings.hideFromTrayOnMinimize = finalSettings.hideFromTrayOnMinimize;
            }
            if (finalSettings.hideBothOnMinimize !== undefined) {
                electronSettings.hideBothOnMinimize = finalSettings.hideBothOnMinimize;
            }

            // console.log('📤 Pushing settings to Electron (in milliseconds):', electronSettings);
            window.electronAPI.setSettings(electronSettings).catch(err =>
                console.error('Failed to push settings to Electron:', err)
            );
        }

        // Dispatch event to notify app components (settings in seconds)
        window.dispatchEvent(new CustomEvent('admin-settings-updated', {
            detail: finalSettings
        }));

        // console.log('✅ Settings applied and synced with Electron');
    }

    /**
     * Handle user suspension
     */
    handleUserSuspended() {
        console.warn('⚠️ User has been suspended by admin');
        this.logActivity('USER_SUSPENDED_DETECTED');

        // Dispatch event to notify app
        window.dispatchEvent(new CustomEvent('user-suspended'));

        // Optionally, show notification or redirect to suspended page
        alert('Your account has been suspended by the administrator. Please contact support.');
    }

    /**
     * Get current user ID from localStorage
     */
    getCurrentUserId(): string | null {
        try {
            const authData = localStorage.getItem('appUser');
            if (authData) {
                const parsed = JSON.parse(authData);
                return parsed?.id || null;
            }
            return null;
        } catch (error) {
            console.error('Failed to get user ID:', error);
            return null;
        }
    }

    getCurrentUserName(): string | null {
        try {
            const authData = localStorage.getItem('appUser');
            if (authData) {
                const parsed = JSON.parse(authData);
                // console.log("🚀 ~ AdminSyncService ~ getCurrentUserName ~ parsed?.userName:", parsed?.username)
                return parsed?.username || null;
            }
            return null;
        } catch (error) {
            console.error('Failed to get user name:', error);
            return null;
        }
    }

    /**
     * Enable/disable sync
     */
    setSyncEnabled(enabled: boolean) {
        this.syncEnabled = enabled;
        console.log(`Sync ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Check if Admin backend is reachable
     */
    async healthCheck() {
        try {
            const response = await fetch(`${ADMIN_API_URL}/health`, {
                method: 'GET',
            });

            if (!response.ok) {
                return { success: false, error: 'Backend not reachable' };
            }

            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            console.error('❌ Admin backend health check failed:', error);
            return { success: false, error: (error as Error).message };
        }
    }
}

// Export singleton instance
const adminSyncService = new AdminSyncService();
export default adminSyncService;
