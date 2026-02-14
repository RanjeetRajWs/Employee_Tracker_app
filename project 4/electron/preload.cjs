const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  onTrackingUpdate: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on("tracking-update", listener);
    return () => ipcRenderer.removeListener("tracking-update", listener);
  },
  getTrackingData: () => ipcRenderer.invoke("get-tracking-data"),
  resetTracking: () => ipcRenderer.invoke("reset-tracking"),
  saveSession: (sessionData) => ipcRenderer.invoke("save-session", sessionData),
  getSessions: () => ipcRenderer.invoke("get-sessions"),
  startScreenshots: () => ipcRenderer.invoke("start-screenshots"),
  stopScreenshots: () => ipcRenderer.invoke("stop-screenshots"),
  getScreenshots: () => ipcRenderer.invoke("get-screenshots"),
  takeScreenshotNow: () => ipcRenderer.invoke("take-screenshot-now"),
  getScreenshotsDir: () => ipcRenderer.invoke("get-screenshots-dir"),
  areScreenshotsRunning: () => ipcRenderer.invoke("are-screenshots-running"),
  deleteScreenshot: (filePath) =>
    ipcRenderer.invoke("delete-screenshot", filePath),
  bulkDeleteScreenshots: (filePaths) =>
    ipcRenderer.invoke("bulk-delete-screenshots", filePaths),
  startBreak: (minutes) => ipcRenderer.invoke("start-break", minutes),
  stopBreak: () => ipcRenderer.invoke("stop-break"),
  getBreakState: () => ipcRenderer.invoke("get-break-state"),
  onScreenshotTaken: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on("screenshot-taken", listener);
    return () => ipcRenderer.removeListener("screenshot-taken", listener);
  },
  setUserId: (userId) => ipcRenderer.invoke("set-user-id", userId),
  setUserInfo: (userInfo) => ipcRenderer.invoke("set-user-info", userInfo),
  setSettings: (settings) => ipcRenderer.invoke("set-settings", settings),
  startSession: () => ipcRenderer.invoke("start-session"),
  stopSession: () => ipcRenderer.invoke("stop-session"),
  startTrackingOnly: () => ipcRenderer.invoke("start-tracking-only"),
  stopTrackingOnly: () => ipcRenderer.invoke("stop-tracking-only"),
  // Activity tracking
  trackMouseClick: () => ipcRenderer.invoke("track-mouse-click"),
  trackMouseScroll: () => ipcRenderer.invoke("track-mouse-scroll"),
  trackKeyPress: () => ipcRenderer.invoke("track-key-press"),
  getAppSettings: () => ipcRenderer.invoke("get-app-settings"),
  onForceLogout: (callback) => {
    const listener = (event, reason) => callback(reason);
    ipcRenderer.on("force-logout", listener);
    return () => ipcRenderer.removeListener("force-logout", listener);
  },
  onSettingsSynced: (callback) => {
    const listener = (event, settings) => callback(settings);
    ipcRenderer.on("settings-synced", listener);
    return () => ipcRenderer.removeListener("settings-synced", listener);
  },
  onBreakStatusMsg: (callback) => {
    const listener = (event, msg) => callback(msg);
    ipcRenderer.on("break-status-msg", listener);
    return () => ipcRenderer.removeListener("break-status-msg", listener);
  },
  openLocationSettings: () => ipcRenderer.invoke("open-location-settings"),
  resetLocationPermissions: () => ipcRenderer.invoke("reset-location-permissions"),
  setClockedIn: (clockedIn) => ipcRenderer.invoke("set-clocked-in", clockedIn),
  onRemoteClockOut: (callback) => {
    const listener = (event) => callback();
    ipcRenderer.on("remote-clock-out-trigger", listener);
    return () => ipcRenderer.removeListener("remote-clock-out-trigger", listener);
  },
  onRemoteClockIn: (callback) => {
    const listener = (event) => callback();
    ipcRenderer.on("remote-clock-in-trigger", listener);
    return () => ipcRenderer.removeListener("remote-clock-in-trigger", listener);
  },
  checkPermissions: () => ipcRenderer.invoke("check-permissions"),
  showMessageBox: (options) => ipcRenderer.invoke("show-message-box", options),
});
