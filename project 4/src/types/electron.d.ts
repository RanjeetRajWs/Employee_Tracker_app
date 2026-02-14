export interface TrackingData {
  workingTime: number;
  idleTime: number;
  isIdle: boolean;
  timeSinceActivity?: number;
  // break state
  onBreak?: boolean;
  breakEnd?: number; // timestamp ms
  activityMetrics?: {
    keyPresses: number;
    mouseClicks: number;
    mouseMovements: number;
    mouseScrolls: number;
  };
  lastFocusedApp?: string;
  isTrackingActive?: boolean;
  breakInProgress?: boolean;
}

export interface SessionData {
  workingTime: number;
  idleTime: number;
  sessionStart: number;
  sessionEnd: number;
  date?: string; // YYYY-MM-DD format
  timestamp?: number; // when saved
}

export interface AppSettings {
  screenshotInterval: number;
  idleThreshold: number;
  breakSchedules: {
    afternoon: { time: string; duration: number };
    evening: { time: string; duration: number };
  };
  allowScreenshotDeletion: boolean;
  hideOnMinimize?: boolean;
  hideFromDockOnMinimize?: boolean;
  hideFromTrayOnMinimize?: boolean;
  hideBothOnMinimize?: boolean;
}

export interface ElectronAPI {
  // Returns an optional unsubscribe function to stop updates
  onTrackingUpdate: (callback: (data: TrackingData) => void) => void | (() => void);
  getTrackingData: () => Promise<TrackingData>;
  resetTracking: () => Promise<{ success: boolean }>;
  saveSession: (sessionData: SessionData) => Promise<{ success: boolean }>;
  getSessions: () => Promise<SessionData[]>;
  startScreenshots: () => Promise<{ success: boolean }>;
  stopScreenshots: () => Promise<{ success: boolean }>;
  getScreenshots: () => Promise<Array<{ file: string; path: string; timestamp: number; data?: string }>>;
  onScreenshotTaken: (callback: (data: { path: string; timestamp: number; data?: string }) => void) => void | (() => void);
  takeScreenshotNow: () => Promise<{ success: boolean; path?: string; error?: string }>;
  getScreenshotsDir: () => Promise<string>;
  areScreenshotsRunning: () => Promise<boolean>;
  deleteScreenshot: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  bulkDeleteScreenshots: (filePaths: string[]) => Promise<{ success: number; failed: number; errors: Array<{ path: string; error: string }> }>;
  startBreak: (minutes: number) => Promise<{ success: boolean; breakEnd?: number; nextAvailableAt?: number; error?: string }>;
  stopBreak: () => Promise<{ success: boolean }>;
  getBreakState: () => Promise<{
    onBreak: boolean;
    breakEnd?: number;
    lastManualBreakDate?: string;
    canStart?: boolean;
    nextAvailableAt?: number | null;
    scheduled?: {
      afternoon?: { taken?: boolean; windowEnd?: number; passed?: boolean; time?: string; duration?: number };
      evening?: { taken?: boolean; windowEnd?: number; passed?: boolean; time?: string; duration?: number };
    };
  }>;
  setUserId: (userId: string) => Promise<{ success: boolean }>;
  setUserInfo: (userInfo: { userId: string; userName: string; token?: string }) => Promise<{ success: boolean }>;
  setSettings: (settings: Partial<AppSettings>) => Promise<{ success: boolean }>;
  startSession: () => Promise<{ success: boolean }>;
  stopSession: () => Promise<{ success: boolean }>;
  // Activity tracking
  trackMouseClick: () => Promise<{ success: boolean }>;
  trackMouseScroll: () => Promise<{ success: boolean }>;
  trackKeyPress: () => Promise<{ success: boolean }>;
  startTrackingOnly: () => Promise<{ success: boolean }>;
  stopTrackingOnly: () => Promise<{ success: boolean }>;
  getAppSettings: () => Promise<AppSettings>;
  onForceLogout: (callback: (reason: string) => void) => () => void;
  onSettingsSynced: (callback: (settings: Partial<AppSettings>) => void) => () => void;
  onBreakStatusMsg: (callback: (msg: { type: 'approved' | 'rejected', duration?: number, reason?: string }) => void) => () => void;
  openLocationSettings: () => Promise<{ success: boolean }>;
  resetLocationPermissions: () => Promise<{ success: boolean }>;
  setClockedIn: (clockedIn: boolean) => Promise<{ success: boolean }>;
  onRemoteClockOut: (callback: () => void) => () => void;
  onRemoteClockIn: (callback: () => void) => () => void;
  showMessageBox: (options: any) => Promise<{ response: number; checkboxChecked?: boolean }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
