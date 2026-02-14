const { app, BrowserWindow, ipcMain, powerMonitor, Tray, Menu, Notification, nativeImage, dialog, session } = require("electron");
app.setName("Employee Tracker");
const { exec } = require("child_process");

if (process.env.NODE_ENV === "development") {
  process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
}
const path = require("path");
const fs = require("fs");
const { uIOhook } = require("uiohook-napi");
const { GlobalKeyboardListener } = require("node-global-key-listener");
const screenshotDesktop = require("screenshot-desktop");
const StorePackage = require("electron-store");
const Store = StorePackage && StorePackage.default ? StorePackage.default : StorePackage;
const { io } = require('socket.io-client');
const store = new Store();

// Helper to safely register IPC handlers (prevents duplicate handler errors on hot reload)
function safelyHandle(channel, listener) {
  // Check if a handler is already registered for this channel (internal Electron API check if possible, or just try/catch)
  // Since we can't easily check, we'll remove it first if it exists then add it.
  try {
    ipcMain.removeHandler(channel);
  } catch (e) { /* ignore */ }
  ipcMain.handle(channel, listener);
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    restoreMainWindow();
  });
}

function restoreMainWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    mainWindow.setSkipTaskbar(false);
    
    // Always ensure tray and dock are visible when window is shown
    updateTrayVisibility(true);
    updateDockVisibility(true);
  }
}

function updateDockVisibility(forceShow = false) {
  if (!app.dock) return;

  const hideFromDock = store.get('hideFromDockOnMinimize', false);
  const hideBoth = store.get('hideBothOnMinimize', false);
  const hideOnMinimize = store.get('hideOnMinimize', false);

  if (forceShow || (!hideFromDock && !hideBoth && !hideOnMinimize)) {
    // Show the dock first
    app.dock.show();
    
    const iconPath = path.join(__dirname, "icon-2.png");
    if (fs.existsSync(iconPath)) {
      const icon = nativeImage.createFromPath(iconPath);
      app.dock.setIcon(icon);
      
      // Re-apply after a short delay to ensure it replaces the default Electron icon
      // which sometimes flickers back in right after show() on macOS
      setTimeout(() => {
        if (app.dock) app.dock.setIcon(icon);
      }, 200);
    }
  } else {
    app.dock.hide();
  }
}

function updateTrayVisibility(forceShow = false) {
  const hideFromTray = store.get('hideFromTrayOnMinimize', false);
  const hideBoth = store.get('hideBothOnMinimize', false);

  if (forceShow || (!hideFromTray && !hideBoth)) {
    if (!tray) {
      createTray();
    }
  } else {
    if (tray) {
      tray.destroy();
      tray = null;
    }
  }
}

// Socket.io Client Setup
const SOCKET_URL = process.env.VITE_SOCKET_URL || 'http://localhost:5000';
const socket = io(SOCKET_URL, {
  query: {
    type: 'project4',
    clientId: store.get('currentUserId') || 'electron-app'
  },
  autoConnect: true,
  reconnection: true
});

// Load Platform Specific Logic
const platform = process.platform === 'darwin' ? 'mac' : (process.platform === 'win32' ? 'windows' : null);
const platformModule = platform ? require(`./platform/${platform}.cjs`) : { 
  getActiveWindow: () => Promise.resolve('Unknown'),
  checkPermissions: () => Promise.resolve({ platform: process.platform })
};

socket.on('connect', () => {
  console.log('✅ Connected to Admin Socket Server');
});

// Persistent Admin Dashboard Sync (Runs even if tracking is stopped)
// This ensures the admin always knows the user status (clocked in/out, idle, etc.)
if (!global.adminSyncIntervalId) {
  global.adminSyncIntervalId = setInterval(() => {
    const currentUserId = store.get('currentUserId');
    const currentUserName = store.get('currentUserName');
    
    if (socket && socket.connected && (currentUserId || currentUserName)) {
      socket.emit('relay-message', {
        target: 'admin',
        event: 'tracking-update',
        userId: currentUserId ? String(currentUserId) : undefined,
        payload: {
          userId: currentUserId ? String(currentUserId) : undefined,
          userName: currentUserName || 'Unknown',
          workingTime: trackingData.workingTime,
          idleTime: trackingData.idleTime,
          isIdle: trackingData.isIdle,
          onBreak: Boolean(breakTimerId),
          breakInProgress: Boolean(breakTimerId),
          isClockedIn: Boolean(isClockedIn),
          isTrackingActive: !!trackingIntervalId,
          lastUpdate: Date.now(),
          timestamp: Date.now()
        }
      });
    }
  }, 10000); // Optimized from 2000ms to 10000ms to reduce network load
}

socket.on('disconnect', () => {
  console.log('❌ Disconnected from Admin Socket Server');
});

// Remote command received from Admin
socket.on('take-screenshot', async () => {
  console.log('📸 Remote command received: take-screenshot');
  const result = await takeScreenshot();
  
  if (result) {
    console.log('📤 Immediately uploading manual screenshot...');
    const sessionData = {
      workingTime: trackingData.workingTime,
      idleTime: trackingData.idleTime,
      sessionStart: trackingData.sessionStart,
      sessionEnd: null, // session is still active
      screenshotCount: trackingData.totalScreenshotCount,
      screenshots: [result], // Just send this one new screenshot
      activityMetrics: { ...trackingData.activityMetrics },
      appUsage: { ...trackingData.appUsage }
    };
    
    const uploadResult = await uploadSessionToBackend(sessionData);
    if (uploadResult.success) {
      // Remove from queue so it's not uploaded again in the periodic sync
      trackingData.screenshots = trackingData.screenshots.filter(s => s.path !== result.path);
    }
  }
});

socket.on('break-approved', (data) => {
  console.log('☕ Break approved from admin:', data);
  const currentUserId = store.get('currentUserId');
  if (currentUserId === data.userId) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('break-status-msg', {
            type: 'approved',
            duration: data.duration
        });
    }
    // Start the break automatically
    // data.duration is in minutes
    startBreak(data.duration, true);
  }
});

socket.on('break-rejected', (data) => {
    console.log('❌ Break rejected from admin:', data);
    const currentUserId = store.get('currentUserId');
    if (currentUserId === data.userId) {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('break-status-msg', {
                type: 'rejected',
                reason: data.reason
            });
        }
    }
});

// Listen for user status changes
socket.on('user-status-changed', ({ userId, isActive }) => {
  const currentUserId = store.get('currentUserId');
  if (currentUserId === userId && !isActive) {
    console.log('⚠️ Your account has been deactivated. Logging out...');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('force-logout', 'Your account has been deactivated.');
    }
    // Stop sessions
    stopTracking();
    stopScreenshots();
    resetAllTrackingData();
    store.delete('currentUserId');
  }
});

// Remote Break Command
socket.on('remote-break-start', (data) => {
  console.log('☕ Remote break-start received:', data);
  const currentUserId = store.get('currentUserId');
  if (currentUserId === data.userId || !data.userId) {
    startBreak(data.duration || 15, true);
  }
});

socket.on('remote-break-stop', (data) => {
  console.log('☕ Remote break-stop received:', data);
  const currentUserId = store.get('currentUserId');
  if (currentUserId === data.userId || !data.userId) {
    stopBreak();
  }
});

// Remote Clock-out Command
socket.on('remote-clock-out', (data) => {
  console.log('🕒 Remote clock-out received:', data);
  const currentUserId = store.get('currentUserId');
  if (currentUserId === data.userId || !data.userId) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('remote-clock-out-trigger');
    }
  }
});

// Remote Clock-in Command
socket.on('remote-clock-in', (data) => {
  console.log('🕒 Remote clock-in received:', data);
  const currentUserId = store.get('currentUserId');
  if (currentUserId === data.userId || !data.userId) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('remote-clock-in-trigger');
    }
  }
});

// Start heartbeat save every 15 seconds
setInterval(() => {
  if (trackingIntervalId && !trackingData.isIdle) {
    saveTrackingBuffer();
  }
}, 15000);

// Listen for settings updates
socket.on('settings-updated', (settings) => {
  console.log('⚙️ Real-time settings update received:', settings);
  
  if (settings.screenshotInterval) {
    const oldInterval = ensureSeconds(store.get('screenshotInterval'));
    const newInterval = ensureSeconds(settings.screenshotInterval);
    store.set('screenshotInterval', newInterval);
    if (oldInterval !== newInterval && screenshotIntervalId) {
      console.log('🔄 Restarting screenshot timer with new interval:', newInterval, 'seconds');
      clearInterval(screenshotIntervalId);
      screenshotIntervalId = null;
      startScreenshots();
    }
  }

  if (settings.idleThreshold) {
    const newThreshold = ensureSeconds(settings.idleThreshold);
    store.set('idleThreshold', newThreshold);
    appSettings.idleThreshold = newThreshold;
    console.log('⚙️ Updated idleThreshold to:', newThreshold, 'seconds');
  }

  if (settings.breakSchedules) {
    store.set('breakSchedules', settings.breakSchedules);
    startScheduledBreaks();
  }

  if (settings.hideOnMinimize !== undefined) {
    store.set('hideOnMinimize', settings.hideOnMinimize);
    console.log('⚙️ Updated hideOnMinimize to:', settings.hideOnMinimize);
  }

  if (settings.hideFromDockOnMinimize !== undefined) {
    store.set('hideFromDockOnMinimize', settings.hideFromDockOnMinimize);
    console.log('⚙️ Updated hideFromDockOnMinimize to:', settings.hideFromDockOnMinimize);
    updateDockVisibility();
  }

  if (settings.hideFromTrayOnMinimize !== undefined) {
    store.set('hideFromTrayOnMinimize', settings.hideFromTrayOnMinimize);
    console.log('⚙️ Updated hideFromTrayOnMinimize to:', settings.hideFromTrayOnMinimize);
    updateTrayVisibility();
  }

  if (settings.hideBothOnMinimize !== undefined) {
    store.set('hideBothOnMinimize', settings.hideBothOnMinimize);
    console.log('⚙️ Updated hideBothOnMinimize to:', settings.hideBothOnMinimize);
    updateTrayVisibility();
    updateDockVisibility();
  }

  // Notify renderer of settings change
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('settings-synced', settings);
  }
});

function updateSocketId(userId) {
  if (socket) {
    console.log(`🔌 Updating socket queries for user: ${userId}`);
    socket.io.opts.query = {
      type: 'project4',
      clientId: userId
    };
    
    if (socket.connected) {
      socket.disconnect().connect();
    } else {
      socket.connect();
    }
  }
}

// Helper to ensure values are in seconds (if > 1000, assume it was ms and convert)
function ensureSeconds(val, defaultVal = 30) {
  if (val === undefined || val === null) return defaultVal;
  const num = Number(val);
  if (isNaN(num)) return defaultVal;
  // If value is very large (e.g. > 1000), it's likely milliseconds
  if (num > 1000) return Math.floor(num / 1000);
  return num;
}

// Application settings (in-memory cache for efficiency)
let appSettings = {
  idleThreshold: ensureSeconds(store.get('idleThreshold'), 30),
  screenshotInterval: ensureSeconds(store.get('screenshotInterval'), 30),
  uploadInterval: 5 * 60 * 1000
};

// Admin Backend Integration
const ADMIN_API_URL = process.env.VITE_ADMIN_API_URL || 'http://localhost:5000/admin';

let mainWindow;
let tray = null;
let isQuitting = false;
let isClockedIn = false; // New state to track if user is clocked in

let trackingIntervalId = null; // Track the interval ID to prevent multiple timers
let screenshotIntervalId = null;
let screenshotsDir = null;
let breakTimerId = null;
let breakEndTimestamp = null;
let wasCapturingBeforeBreak = false;
let scheduledBreakTimers = {};
let scheduledSchedulerStarted = false;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function todayDateStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function initializeScheduledBreakState() {
  const key = "scheduledBreaks";
  const stored = store.get(key, null);
  const today = todayDateStr();
  if (!stored || stored.date !== today) {
    const obj = { date: today, afternoon45: false, evening15: false };
    store.set(key, obj);
  }
  // ensure a midnight reset is scheduled
  scheduleMidnightReset();
}

function scheduleMidnightReset() {
  // clear any existing timer stored on scheduledBreakTimers.midnightReset
  if (scheduledBreakTimers.midnightReset) {
    clearTimeout(scheduledBreakTimers.midnightReset);
  }
  const now = new Date();
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    5,
    0
  ); // a few seconds after midnight
  const delay = tomorrow.getTime() - now.getTime();
  scheduledBreakTimers.midnightReset = setTimeout(() => {
    const today = todayDateStr();
    const obj = { date: today, afternoon45: false, evening15: false };
    store.set("scheduledBreaks", obj);
    // re-schedule next reset
    scheduleMidnightReset();
  }, delay);
}
let trackingData = {
  lastActivity: Date.now(),
  lastKeyboardActivity: Date.now(),
  lastMouseActivity: Date.now(),
  idleTime: 0,
  workingTime: 0,
  isIdle: false,
  sessionStart: Date.now(),
  screenshots: [],
  totalScreenshotCount: 0,
  // Activity Metrics
  activityMetrics: {
    keyPresses: 0,
    mouseClicks: 0,
    mouseMovements: 0,
    mouseScrolls: 0
  },
  lastFocusedApp: "Unknown",
  appUsage: {},
  notifiedPreIdle: false
};

let lastUploadTime = {
  workingTime: 0,
  idleTime: 0,
  timestamp: Date.now(),
  activityMetrics: {
    keyPresses: 0,
    mouseClicks: 0,
    mouseMovements: 0,
    mouseScrolls: 0
  }
};

function resetAllTrackingData() {
  trackingData = {
    lastActivity: Date.now(),
    lastKeyboardActivity: Date.now(),
    lastMouseActivity: Date.now(),
    idleTime: 0,
    workingTime: 0,
    isIdle: false,
    sessionStart: Date.now(),
    screenshots: [],
    totalScreenshotCount: 0,
    activityMetrics: {
      keyPresses: 0,
      mouseClicks: 0,
      mouseMovements: 0,
      mouseScrolls: 0
    },
    lastFocusedApp: "Unknown",
    appUsage: {},
    notifiedPreIdle: false
  };

  lastUploadTime = {
    workingTime: 0,
    idleTime: 0,
    timestamp: Date.now(),
    activityMetrics: {
      keyPresses: 0,
      mouseClicks: 0,
      mouseMovements: 0,
      mouseScrolls: 0
    },
    lastFocusedApp: "Unknown",
    appUsage: {}
  };
  store.delete('activeSessionBuffer');
  console.log('🔄 All tracking state has been reset and buffer cleared');
}

// Helper to convert internal appUsage {} to backend applications [] format
function formatAppUsageForBackend(appUsage) {
  return Object.entries(appUsage).map(([name, ms]) => ({
    name,
    duration: Math.floor(ms / 1000), // convert to seconds
    lastActive: new Date() // Approximate
  }));
}

// Persist active session data to local store (Heartbeat)
function saveTrackingBuffer() {
  const userId = store.get('currentUserId');
  if (!userId) return;

  const bufferData = {
    userId,
    userName: store.get('currentUserName'),
    trackingData: {
      ...trackingData,
      screenshots: [] // Don't store large screenshot data in the local buffer
    },
    isTrackingActive: !!trackingIntervalId,
    timestamp: Date.now()
  };
  
  store.set('activeSessionBuffer', bufferData);
}

// Recover unsaved session from a previous launch
async function recoverUnsavedSession(options = { uploadImmediately: true }) {
  const buffer = store.get('activeSessionBuffer');
  if (!buffer) return null;

  console.log('📦 Found unsaved session from previous launch. Analyzing...');
  
  try {
    const { trackingData: oldData, userId, userName, timestamp } = buffer;
    
    // If it was a very recent session (last 1 hour) and it's the same user, 
    // maybe we should offer to resume instead.
    const now = Date.now();
    const isRecent = (now - timestamp) < (60 * 60 * 1000); // 1 hour
    
    if (options.uploadImmediately) {
      // Prepare session data from buffer
      const payload = {
        userId,
        userName: userName || 'Recovered User',
        workingTime: Math.floor((oldData.workingTime || 0) / 1000),
        idleTime: Math.floor((oldData.idleTime || 0) / 1000),
        sessionStart: oldData.sessionStart,
        sessionEnd: timestamp,
        date: new Date(oldData.sessionStart).toISOString().split('T')[0],
        screenshotCount: oldData.totalScreenshotCount,
        activityMetrics: oldData.activityMetrics,
        applications: formatAppUsageForBackend(oldData.appUsage),
        note: "Recovered from unexpected shutdown"
      };

      console.log(`📤 Uploading recovered session for ${userName || userId}...`);
      
      const response = await fetch(`${ADMIN_API_URL}/sessions/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log('✅ Recovered session uploaded successfully');
        store.delete('activeSessionBuffer');
        return null;
      } else {
        console.warn('⚠️ Failed to upload recovered session');
        return buffer;
      }
    } else {
      // Return the buffer data if we want to resume
      return buffer;
    }
  } catch (error) {
    console.error('❌ Error recovering unsaved session:', error);
    return null;
  }
}

// Final upload before quitting
async function performFinalSessionUpload() {
  const userId = store.get('currentUserId');
  if (!userId) return;

  console.log('📤 Performing final session upload before quit...');
  
  const sessionData = {
    workingTime: trackingData.workingTime,
    idleTime: trackingData.idleTime,
    sessionStart: trackingData.sessionStart,
    sessionEnd: Date.now(),
    screenshotCount: trackingData.totalScreenshotCount,
    activityMetrics: { ...trackingData.activityMetrics },
    appUsage: { ...trackingData.appUsage }
  };

  await uploadSessionToBackend(sessionData);
  store.delete('activeSessionBuffer');
}

// 5 minutes (not stored in store yet)

function createTray() {
  const iconPath = path.join(__dirname, "icon-2.png");
  let trayIcon = nativeImage.createFromPath(iconPath);
  
  if (!trayIcon.isEmpty()) {
    // Resize for tray - 16x16 is standard, 22x22 for mac
    trayIcon = trayIcon.resize({ width: 22, height: 22 });
  } else {
    // Fallback to empty or another icon if icon-2 doesn't exist
    trayIcon = nativeImage.createFromPath(path.join(__dirname, "icon_small.png"));
  }

  tray = new Tray(trayIcon.isEmpty() ? nativeImage.createEmpty() : trayIcon);
  
  if (process.platform === 'darwin') {
    tray.setIgnoreDoubleClickEvents(true);
  }

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Employee Tracker', enabled: false },
    { type: 'separator' },
    { label: 'Show App', click: () => {
        restoreMainWindow();
    } },
    // { label: 'Open Screenshots Folder', click: () => {
    //     ensureScreenshotsDir();
    //     require('electron').shell.openPath(screenshotsDir);
    // }},
    { type: 'separator' },
    { label: 'Quit', click: () => {
        app.quit();
    }}
  ]);

  tray.setToolTip('Employee Tracker');
  if (process.platform !== 'darwin') {
    tray.setContextMenu(contextMenu);
  }
  tray.on('click', () => {
    if (mainWindow && mainWindow.isVisible() && mainWindow.isFocused()) {
      // If visible and focused, toggle it off
      const hideOnMinimize = store.get('hideOnMinimize', false);
      const hideFromDock = store.get('hideFromDockOnMinimize', false);
      const hideBoth = store.get('hideBothOnMinimize', false);

      mainWindow.hide();
      
      if (hideOnMinimize || hideFromDock || hideBoth) {
        mainWindow.setSkipTaskbar(true);
        updateDockVisibility();
      }

      if (hideBoth) {
        updateTrayVisibility();
      }
    } else {
      // If hidden or in background, restore and focus
      restoreMainWindow();
    }
  });

  tray.on('right-click', () => {
    tray.popUpContextMenu(contextMenu);
  });
}

function sendNotification(title, body) {
  if (Notification.isSupported()) {
    const iconPath = path.join(__dirname, "icon-2.png");
    new Notification({ 
      title, 
      body,
      icon: iconPath
    }).show();
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 450,
    height: 800,
    icon: path.join(__dirname, "icon-2.png"),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  //opening developer console
  // mainWindow.webContents.openDevTools();

  // Geolocation and other permissions are now handled globally in app.whenReady()
  // to ensure they are registered before any requests are made by the renderer.


  // Use a light background color to avoid a white flash on some platforms
  try {
    mainWindow.setBackgroundColor("#f8fafc");
  } catch (e) {
    // ignore
  }

  // Immediately show a polished splash / loading UI while the app (Vite/React)
  // is starting. This prevents a blank white window while the dev server
  // finishes booting and the renderer application mounts.
  const splashHtml = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline';" />
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Loading…</title>
        <style>
          html,body{height:100%;margin:0;background:linear-gradient(180deg,#f8fafc,#eef2ff);font-family:Inter,system-ui,Segoe UI,Roboto,'Helvetica Neue',Arial}
          .wrap{height:100%;display:flex;align-items:center;justify-content:center}
          .box{display:flex;flex-direction:column;align-items:center;gap:18px;padding:24px;border-radius:12px;background:rgba(255,255,255,0.7);box-shadow:0 6px 24px rgba(2,6,23,0.08)}
          .spinner{width:56px;height:56px;border-radius:50%;border:6px solid #e6eef8;border-top-color:#10b981;animation:spin 1s linear infinite}
          @keyframes spin{to{transform:rotate(360deg)}}
          h1{margin:0;font-size:18px;color:#0f172a}
          p{margin:0;color:#475569}
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="box">
            <div class="spinner" aria-hidden></div>
            <h1>Employee Tracker</h1>
            <p>Loading application… please wait</p>
          </div>
        </div>
      </body>
    </html>`;

  // Load splash immediately (encoded to avoid issues with special chars)
  try {
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(
      splashHtml
    )}`;
    // Load the splash synchronously so the user sees something immediately
    mainWindow.loadURL(dataUrl).catch(() => { });
  } catch (e) {
    // ignore
  }

  if (process.env.NODE_ENV === "development") {
    // Try multiple ports and implement retry logic; when successful, the
    // renderer will replace the splash screen with the actual app UI.
    const tryLoadUrl = (port, retries = 0) => {
      const url = `http://localhost:${port}`;
      console.log(`[Attempt ${retries + 1}] Attempting to load from ${url}`);

      
      // Check permissions after a short delay to let the app load
      setTimeout(async () => {
        if (process.platform === 'darwin') {
          const { checkPermissions } = require('./platform/mac.cjs');
          const perms = await checkPermissions();
          
          if (!perms.accessibility) {
             dialog.showMessageBox(mainWindow, {
               type: 'warning',
               title: 'Permissions Required',
               message: 'Employee Tracker requires system permissions.',
               detail: 'To function correctly, this app needs:\n\n1. Accessibility: For activity tracking (Required)\n2. Location Services: For attendance verification\n\nPlease enable these in System Settings.',
               buttons: ['Open Accessibility Settings', 'Open Location Settings', 'Later'],
               defaultId: 0,
               cancelId: 2
             }).then(({ response }) => {
               if (response === 0) {
                 require('child_process').exec('open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"');
               } else if (response === 1) {
                 require('child_process').exec('open "x-apple.systempreferences:com.apple.preference.security?Privacy_LocationServices"');
               }
             });
          }
        }
      }, 3000);

      setTimeout(() => {
        mainWindow
          .loadURL(url)
          .then(() => {
            console.log(`✓ Successfully loaded from ${url}`);
          })
          .catch((error) => {
            console.error(
              `✗ Failed to load from port ${port}:`,
              error.message || error
            );

            if (port === 5173 && retries < 3) {
              // Retry port 5173 a few more times
              console.log(`Retrying port 5173...`);
              tryLoadUrl(5173, retries + 1);
            } else if (port === 5173) {
              // If 5173 fails after retries, try 5174
              console.log(
                `Port 5173 failed after ${retries} attempts. Trying port 5174...`
              );
              tryLoadUrl(5174, 0);
            } else if (port === 5174) {
              // We already added the handler in the previous step, so we don't need to add it again.
  // Just ensuring the permission check handler logic is sound.
              console.error(
                "✗ Could not connect to Vite server on ports 5173 or 5174."
              );
              console.error(
                "  Please make sure to run 'npm run dev' in another terminal first."
              );
              mainWindow.webContents.loadURL(
                `data:text/html,${encodeURIComponent(
                  '<body style="font-family: Arial; padding: 20px;"><h1>Error: Cannot Connect to Dev Server</h1><p>Make sure to run <code>npm run dev</code> in another terminal first.</p><p><strong>Steps to fix:</strong></p><ol><li>Open a new terminal</li><li>Run: <code>npm run dev</code></li><li>Wait for "Local: http://localhost:XXXX" message</li><li>Then run: <code>npm run electron</code></li></ol></body>'
                )}`
              );
            }
          });
      }, 500);
    };

    // Start with port 5173 (Vite's default port)
    tryLoadUrl(5173);

    // Uncomment to open developer tools for debugging
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // Handle window minimize - optionally hide from taskbar/dock/tray
  mainWindow.on('minimize', (event) => {
    const hideOnMinimize = store.get('hideOnMinimize', false);
    const hideFromDock = store.get('hideFromDockOnMinimize', false);
    const hideFromTray = store.get('hideFromTrayOnMinimize', false);
    const hideBoth = store.get('hideBothOnMinimize', false);

    if (hideBoth || hideOnMinimize || hideFromDock) {
      event.preventDefault();
      mainWindow.hide();
      mainWindow.setSkipTaskbar(true);
      updateDockVisibility();
      
      if (hideBoth) {
        updateTrayVisibility();
      }
      console.log('📉 Hiding app on minimize');
    } else if (hideFromTray) {
      updateTrayVisibility();
      console.log('📉 Hiding Tray icon on minimize');
    }
  });

  // Handle Tray click or "Show App" - restore from taskbar
  mainWindow.on('show', () => {
    mainWindow.setSkipTaskbar(false);
    updateTrayVisibility(true);
    updateDockVisibility(true);
  });

  // Handle window close - hide instead of quit if enabled
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      const hideOnMinimize = store.get('hideOnMinimize', false);
      const hideFromDock = store.get('hideFromDockOnMinimize', false);
      const hideBoth = store.get('hideBothOnMinimize', false);

      if (hideOnMinimize || hideFromDock || hideBoth) {
        event.preventDefault();
        mainWindow.hide();
        mainWindow.setSkipTaskbar(true);
        updateDockVisibility();
        
        if (hideBoth) {
          updateTrayVisibility();
        }
        console.log('✖️ Hiding on close');
      }
    }
    return false;
  });

  // Tracking and screenshots will be started via IPC 'start-session' after login
  // startTracking();
  // startScreenshots();
}

function ensureScreenshotsDir() {
  if (!screenshotsDir) {
    screenshotsDir = path.join(app.getPath("userData"), "screenshots");
    try {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    } catch (err) {
      console.error("Failed to create screenshots directory", err);
    }
  }
}

async function takeScreenshot() {
  try {
    // only take screenshots when window exists and not on break
    if (!mainWindow || mainWindow.isDestroyed() || breakTimerId || !trackingIntervalId) return null;

    ensureScreenshotsDir();

    const userId = store.get('currentUserId') || 'anonymous';
    console.log(`📸 Capturing screenshot for user: ${userId}...`);
    
    // capture entire display
    const buffer = await screenshotDesktop({ format: "png" });
    const timestamp = Date.now();
    const filename = `screenshot_${userId}_${timestamp}.png`;
    const filePath = path.join(screenshotsDir, filename);

    // Write file to disk
    await fs.promises.writeFile(filePath, buffer);
    // console.log(`💾 Screenshot saved to: ${filePath}`);

    const b64 = buffer.toString("base64");
    const dataUri = `data:image/png;base64,${b64}`;

    // Add to tracking data for upload
    if (!trackingData.screenshots) trackingData.screenshots = [];
    trackingData.screenshots.push({
      path: filePath,
      timestamp: timestamp,
      data: dataUri // Include data for upload
    });
    
    trackingData.totalScreenshotCount++;

    // Notify renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("screenshot-taken", {
        path: filePath,
        timestamp: timestamp,
        data: dataUri,
      });
    }

    return { path: filePath, timestamp, data: dataUri };
  } catch (err) {
    console.error("❌ Error capturing screenshot:", err);
    return null;
  }
}

function startScreenshots() {
  console.log("🚀 ~ startScreenshots ~ screenshotIntervalId:", screenshotIntervalId)
  if (screenshotIntervalId || breakTimerId || !trackingIntervalId) return;
  ensureScreenshotsDir();

  const intervalSecs = ensureSeconds(store.get('screenshotInterval'), 30);
  const intervalMs = intervalSecs * 1000;

  console.log(`📸 Starting screenshots with interval: ${intervalSecs}s (${intervalMs}ms)`);

  screenshotIntervalId = setInterval(async () => {
    await takeScreenshot();
  }, intervalMs);
}

function stopScreenshots() {
  if (screenshotIntervalId) {
    clearInterval(screenshotIntervalId);
    screenshotIntervalId = null;
  }
}

function startBreak(minutes, force = false) {
  if (!isClockedIn && !force) {
    console.log("⚠️ Break blocked: User not clocked in");
    return { success: false, error: "not_clocked_in" };
  }
  // If a break is already running, restart it
  if (breakTimerId) clearTimeout(breakTimerId);

  if (!force) {
    // Enforce one manual break per calendar day: store lastManualBreakDate as YYYY-MM-DD
    const lastManual = store.get("lastManualBreakDate", "");
    const today = todayDateStr();
    if (lastManual === today) {
      // too soon, do not start; next available is next midnight
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        0,
        0
      ).getTime();
      return {
        success: false,
        error: "break_taken",
        nextAvailableAt: nextMidnight,
      };
    }
    // record today's date as manual break taken
    store.set("lastManualBreakDate", today);
  }

  wasCapturingBeforeBreak = screenshotIntervalId !== null;
  // stop screenshots during break
  stopScreenshots();
  const ms = Number(minutes) * 60 * 1000;
  breakEndTimestamp = Date.now() + ms;
  // schedule end
  breakTimerId = setTimeout(() => {
    breakTimerId = null;
    breakEndTimestamp = null;
    // resume screenshots if they were running
    if (wasCapturingBeforeBreak) startScreenshots();
    // notify renderer with final tracking-update (onBreak false)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("tracking-update", {
        workingTime: trackingData.workingTime,
        idleTime: trackingData.idleTime,
        isIdle: trackingData.isIdle,
        onBreak: false,
        activityMetrics: trackingData.activityMetrics,
      });
    }
  }, ms);

  // send immediate update
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("tracking-update", {
      workingTime: trackingData.workingTime,
      idleTime: trackingData.idleTime,
      isIdle: trackingData.isIdle,
      onBreak: true,
      breakInProgress: true,
      breakEnd: breakEndTimestamp,
      activityMetrics: trackingData.activityMetrics,
    });
  }

  return { success: true, breakEnd: breakEndTimestamp };
}

// IPC handler for sending socket messages
ipcMain.on('send-socket-message', (event, { target, event: socketEvent, payload }) => {
  console.log(`📡 Sending socket message: ${socketEvent} to ${target}`);
  socket.emit('relay-message', { target, event: socketEvent, payload });
});

function scheduleDailyBreak(id, hour, minute, durationMinutes) {
  // schedule next occurrence (if now is within window, start immediately with remaining time)
  const now = new Date();
  const target = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hour,
    minute,
    0,
    0
  );
  const durationMs = durationMinutes * 60 * 1000;
  // ensure scheduled break flags exist for today
  const sbKey = "scheduledBreaks";
  const sb = store.get(sbKey, null) || {
    date: todayDateStr(),
    afternoon45: false,
    evening15: false,
  };
  if (sb.date !== todayDateStr()) {
    sb.date = todayDateStr();
    sb.afternoon45 = false;
    sb.evening15 = false;
    store.set(sbKey, sb);
  }
  const mappedId =
    id === "afternoon45"
      ? "afternoon45"
      : id === "evening15"
        ? "evening15"
        : id;

  const scheduleFor = (date) => {
    const delay = date.getTime() - Date.now();
    const tid = setTimeout(async () => {
      try {
        // if we're inside the window (in case app started late), compute remaining minutes
        // const endAt = date.getTime() + durationMs;
        // const nowMs = Date.now();
        // let minutesToUse = durationMinutes;
        // if (nowMs > date.getTime() && nowMs < endAt) {
        //   minutesToUse = Math.ceil((endAt - nowMs) / 60000);
        // }
        // // start forced scheduled break (bypass 24h rule)
        // // mark as taken for today
        // const s = store.get(sbKey, {});
        // s[mappedId] = true;
        // store.set(sbKey, s);
        // startBreak(minutesToUse, true);
        console.log(`⏰ Scheduled break window reached: ${mappedId}. Auto-start disabled.`);
      } catch (e) {
        console.error("Scheduled break failed", e);
      }
      // schedule next day's occurrence
      const next = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      scheduledBreakTimers[id] = scheduleFor(next);
    }, Math.max(0, delay));
    return tid;
  };

  // choose initial date (today or tomorrow)
  let first = target;
  const nowMs = Date.now();
  if (first.getTime() + durationMs <= nowMs) {
    // today's window already passed
    // mark as taken/disabled for today if not already
    const s = store.get(sbKey, {});
    if (!s[mappedId]) {
      s[mappedId] = true;
      store.set(sbKey, s);
    }
    first = new Date(first.getTime() + 24 * 60 * 60 * 1000);
    scheduledBreakTimers[id] = scheduleFor(first);
  } else if (
    nowMs >= target.getTime() &&
    nowMs < target.getTime() + durationMs
  ) {
    // current time is within today's window
    const s = store.get(sbKey, {});
    if (!s[mappedId]) {
      s[mappedId] = true;
      store.set(sbKey, s);
      const remainingMins = Math.ceil(
        (target.getTime() + durationMs - nowMs) / 60000
      );
      startBreak(remainingMins, true);
    }
    // schedule next day's occurrence
    const next = new Date(target.getTime() + 24 * 60 * 60 * 1000);
    scheduledBreakTimers[id] = scheduleFor(next);
  } else {
    // future today: schedule it normally
    scheduledBreakTimers[id] = scheduleFor(first);
  }
  return scheduledBreakTimers[id];
}

function startScheduledBreaks() {
  if (!isClockedIn) {
    console.log('⏭️ Skipping scheduled breaks: User not clocked in');
    return;
  }
  // Allow re-run to update schedules
  scheduledSchedulerStarted = true;

  // Clear existing timers
  if (scheduledBreakTimers["afternoon45"]) clearTimeout(scheduledBreakTimers["afternoon45"]);
  if (scheduledBreakTimers["evening15"]) clearTimeout(scheduledBreakTimers["evening15"]);

  const breakSchedules = store.get('breakSchedules', {
    afternoon: { time: '13:15', duration: 45 },
    evening: { time: '16:45', duration: 15 }
  });

  // Parse time strings "HH:MM"
  const [aftHour, aftMin] = (breakSchedules.afternoon?.time || '13:15').split(':').map(Number);
  const [eveHour, eveMin] = (breakSchedules.evening?.time || '16:45').split(':').map(Number);

  const aftDur = breakSchedules.afternoon?.duration || 45;
  const eveDur = breakSchedules.evening?.duration || 15;

  scheduleDailyBreak("afternoon45", aftHour, aftMin, aftDur);
  scheduleDailyBreak("evening15", eveHour, eveMin, eveDur);

  console.log(`📅 Scheduled breaks: Afternoon ${aftHour}:${aftMin} (${aftDur}m), Evening ${eveHour}:${eveMin} (${eveDur}m)`);
}

// Shared activity tracking state and functions
let lastGlobalKeyPressTime = 0;
let lastGlobalMouseClickTime = 0;
let lastScrollCounted = 0;
let lastMouseMoveLogged = 0;

// Track state of physical keys to ignore OS auto-repeats
const keyStates = new Map();
// Track state of mouse buttons
const mouseButtons = new Map();

// Global listeners initialized flag
let globalListenersInitialized = false;
let keyboardListenerInstance = null;

const trackKeyPressShared = (keyId = 'any', source = 'unknown') => {
  const now = Date.now();
  
  if (!trackingIntervalId || breakTimerId) return;
  
  // 1. GLOBAL DEBOUNCE (Deduplicate multiple sources: uIOhook, GKL, Renderer)
  // No human can intentionally press keys faster than 20/sec (50ms)
  if (now - lastGlobalKeyPressTime < 50) {
    if (process.env.NODE_ENV === "development") {
      // console.log(`⏩ Key deduplicated (Source: ${source}, Key: ${keyId})`);
    }
    return;
  }

  // 2. Per-key repeat protection (Ignore OS auto-repeat)
  const lastTime = keyStates.get(keyId) || 0;
  if (now - lastTime < 150 && keyId !== 'any') return;

  trackingData.activityMetrics.keyPresses++;
  lastGlobalKeyPressTime = now;
  keyStates.set(keyId, now);
  
  trackingData.lastKeyboardActivity = now;
  trackingData.lastActivity = now;
  
  if (trackingData.isIdle) {
    trackingData.isIdle = false;
    if (process.env.NODE_ENV === "development") {
      console.log(`🟢 User active (Source: ${source}, Key: ${keyId})`);
    }
  }
};

const trackMouseClickShared = (buttonId = 'any', source = 'unknown') => {
  const now = Date.now();
  
  if (!trackingIntervalId || breakTimerId) return;
  
  // GLOBAL DEBOUNCE for clicks
  if (now - lastGlobalMouseClickTime < 100) {
    return;
  }

  trackingData.activityMetrics.mouseClicks++;
  lastGlobalMouseClickTime = now;
  mouseButtons.set(buttonId, now);
  
  trackingData.lastMouseActivity = now;
  trackingData.lastActivity = now;
  
  if (trackingData.isIdle) {
    trackingData.isIdle = false;
    if (process.env.NODE_ENV === "development") {
      console.log(`🟢 User active (Source: ${source}, Button: ${buttonId})`);
    }
  }
};

const trackScrollShared = () => {
  const now = Date.now();
  if (!trackingIntervalId || breakTimerId) return;
  if (now - lastScrollCounted > 150) {
    trackingData.activityMetrics.mouseScrolls++;
    lastScrollCounted = now;
  }
  trackingData.lastMouseActivity = now;
  trackingData.lastActivity = now;
  if (trackingData.isIdle) {
    trackingData.isIdle = false;
    if (process.env.NODE_ENV === "development") console.log("🟢 User active (Scroll)");
  }
};

function stopBreak() {
  if (breakTimerId) {
    clearTimeout(breakTimerId);
    breakTimerId = null;
  }
  breakEndTimestamp = null;
  if (wasCapturingBeforeBreak) startScreenshots();
  wasCapturingBeforeBreak = false;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("tracking-update", {
      workingTime: trackingData.workingTime,
      idleTime: trackingData.idleTime,
      isIdle: trackingData.isIdle,
      onBreak: false,
      breakInProgress: false,
    });
  }
}

function startTracking(resumeData = null) {
  // Prevent multiple tracking intervals from running
  if (trackingIntervalId) {
    console.log('⚠️ Tracking already running, skipping duplicate start');
    return;
  }

  if (resumeData && resumeData.trackingData) {
    console.log('🔄 Resuming tracking state from buffer...');
    trackingData = {
      ...trackingData,
      ...resumeData.trackingData,
      isIdle: false, // Start active
      lastActivity: Date.now(),
      lastMouseActivity: Date.now(),
      lastKeyboardActivity: Date.now()
    };
  }

  let lastMousePosition = { x: 0, y: 0 };
  let lastCheckTime = Date.now();
  let lastActiveWindow = "";

  // Throttled focus detection every 3 seconds
  const getActiveWindow = () => platformModule.getActiveWindow();

  if (!globalListenersInitialized) {
    // 1. Setup uIOhook Event Listeners (Do this ONLY ONCE)
    console.log('🔌 Registering global hardware event listeners...');

    uIOhook.on('keydown', (event) => {
      trackKeyPressShared(event.keycode ? `k${event.keycode}` : 'any', 'uIOhook');
    });

    uIOhook.on('mousedown', (event) => {
      trackMouseClickShared(event.button ? `b${event.button}` : 'any', 'uIOhook');
    });

    uIOhook.on('wheel', (event) => {
      trackScrollShared();
    });

    uIOhook.on('mousemove', (event) => {
      // NOTE: uIOhook 'mousemove' fires extremely rapidly. 
      // We throttle metric updates but ensure activity timestamp is always fresh.
      const now = Date.now();
      
      // Always update last activity time to prevent idle
      trackingData.lastMouseActivity = now;
      trackingData.lastActivity = now;
      
      if (trackingData.isIdle) {
        trackingData.isIdle = false;
        if (process.env.NODE_ENV === "development") {
           // console.log("🟢 User active (Global Mouse Move)");
        }
      }
      
      // Only count actual "movement" metrics effectively
      if (now - lastMouseMoveLogged > 500) {
        trackingData.activityMetrics.mouseMovements++;
        lastMouseMoveLogged = now;
      }
    });

    globalListenersInitialized = true;
  }

  // 1b. ALWAYS ensure uIOhook is started
  try {
    uIOhook.start();
    console.log('✅ Global uIOhook started successfully');
  } catch (error) {
    // On some platforms, calling start when already started might throw
    if (process.env.NODE_ENV === "development") {
      console.log("ℹ️ uIOhook start attempt:", error.message);
    }
  }

  // 2. Setup GlobalKeyboardListener (Secondary source for keys, often more robust on Mac)
  // Re-create it if it was killed or never initialized
  if (!keyboardListenerInstance) {
    try {
      keyboardListenerInstance = new GlobalKeyboardListener();
      keyboardListenerInstance.addListener((e, down) => {
        if (down) {
          trackKeyPressShared(e.name || e.vKey || 'any', 'GKL');
        } else {
          keyStates.delete(e.name || e.vKey || 'any');
        }
      });
      console.log('✅ Secondary global keyboard listener initialized');
    } catch (err) {
      console.error('❌ Failed to initialize secondary GlobalKeyboardListener:', err);
      if (process.platform === 'darwin') {
        console.log('💡 Tip: Ensure Terminal/Electron has Accessibility permissions in System Settings.');
      }
    }
  }

  if (process.platform === 'darwin') {
    console.log('💡 Note: Global tracking requires Accessibility permissions for this app/terminal.');
  }

  // Activity & Time Tracking Loop
  const { screen } = require("electron");
  trackingIntervalId = setInterval(() => {
    const currentTime = Date.now();
    const timeSinceLastCheck = currentTime - lastCheckTime;
    lastCheckTime = currentTime;

    // Detect mouse movement via Electron API as a fallback
    const point = screen.getCursorScreenPoint();

    const hasMouseMoved =
      point.x !== lastMousePosition.x || point.y !== lastMousePosition.y;

    if (hasMouseMoved && !breakTimerId) {
      const distance = Math.sqrt(
        Math.pow(point.x - lastMousePosition.x, 2) +
        Math.pow(point.y - lastMousePosition.y, 2)
      );

      // Only count if uIOhook might be failing or if it's a significant move not already captured
      if (distance > 20) {
        // If uIOhook is working, it will update lastMouseActivity constantly.
        // We only increment metric here if distance is large enough to be a meaningful movement "block"
        if (currentTime - trackingData.lastMouseActivity > 1000) {
           trackingData.activityMetrics.mouseMovements++;
        }
        trackingData.lastMouseActivity = currentTime;
        trackingData.lastActivity = currentTime;
        if (trackingData.isIdle) trackingData.isIdle = false;
      }

      lastMousePosition = { x: point.x, y: point.y };
    }

    // Track Active Window (Throttled focus detection every 3 seconds)
    if (currentTime % 3000 < 1000 && !breakTimerId) {
      getActiveWindow().then(windowName => {
        if (windowName !== lastActiveWindow) {
          lastActiveWindow = windowName;
          trackingData.lastFocusedApp = windowName;
          if (process.env.NODE_ENV === "development") {
            console.log(`🔲 Focus changed: ${windowName}`);
          }
        }
      });
    }

    // Increment usage for focused app if not idle
    if (!trackingData.isIdle && trackingData.lastFocusedApp && !breakTimerId) {
      const currentApp = trackingData.lastFocusedApp;
      trackingData.appUsage[currentApp] = (trackingData.appUsage[currentApp] || 0) + timeSinceLastCheck;
    }

    // Force activity timestamps during break to prevent immediate "Idle" after break ends
    if (breakTimerId) {
        trackingData.lastActivity = currentTime;
        trackingData.lastMouseActivity = currentTime;
        trackingData.lastKeyboardActivity = currentTime;
        trackingData.isIdle = false;
        trackingData.notifiedPreIdle = false;
    }

    const timeSinceMouseActivity = currentTime - trackingData.lastMouseActivity;
    const timeSinceKeyboardActivity = currentTime - trackingData.lastKeyboardActivity;
    
    // Time since ANY activity (the smaller of the two lapses)
    const timeSinceAnyActivity = Math.min(
      timeSinceMouseActivity,
      timeSinceKeyboardActivity
    );

    const threshold = appSettings.idleThreshold || 30000;
    const warningThreshold = Math.max(5000, threshold - 10000); // Warn 10s before, but at least 5s window

    if (timeSinceAnyActivity >= warningThreshold && timeSinceAnyActivity < threshold && !trackingData.isIdle && !breakTimerId) {
      if (!trackingData.notifiedPreIdle) {
        sendNotification('Idle Warning', 'You have been inactive. You will be marked as Idle in a few seconds.');
        trackingData.notifiedPreIdle = true;
      }
    }

    if (timeSinceAnyActivity < warningThreshold) {
      trackingData.notifiedPreIdle = false;
    }

    if (timeSinceAnyActivity >= threshold && !trackingData.isIdle && !breakTimerId) {
      trackingData.isIdle = true;
    }

    if (timeSinceAnyActivity < threshold && trackingData.isIdle && !breakTimerId) {
      trackingData.isIdle = false;
    }

    if (breakTimerId) {
      // Do not increment working or idle time during break
    } else if (trackingData.isIdle) {
      trackingData.idleTime += timeSinceLastCheck;
    } else {
      trackingData.workingTime += timeSinceLastCheck;
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      const updateData = {
        workingTime: trackingData.workingTime,
        idleTime: trackingData.idleTime,
        isIdle: trackingData.isIdle,
        timeSinceActivity: timeSinceAnyActivity,
        onBreak: Boolean(breakTimerId),
        breakInProgress: Boolean(breakTimerId),
        breakEnd: breakEndTimestamp,
        activityMetrics: trackingData.activityMetrics,
        lastFocusedApp: trackingData.lastFocusedApp,
      };

      mainWindow.webContents.send("tracking-update", updateData);
    }
  }, 1000);

  console.log('✅ Tracking started with interval ID:', trackingIntervalId);

  powerMonitor.on("suspend", () => {
    trackingData.isIdle = true;
  });

  powerMonitor.on("resume", () => {
    trackingData.lastActivity = Date.now();
    trackingData.lastMouseActivity = Date.now();
    trackingData.lastKeyboardActivity = Date.now();
  });
}

function stopTracking() {
  if (trackingIntervalId) {
    clearInterval(trackingIntervalId);
    trackingIntervalId = null;
    console.log('⏹️ Tracking loop stopped');
    
    // Notify renderer that tracking has stopped
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("tracking-update", {
        workingTime: trackingData.workingTime,
        idleTime: trackingData.idleTime,
        isIdle: false, // Not idle if not tracking
        isTrackingActive: false,
        onBreak: Boolean(breakTimerId),
        breakInProgress: Boolean(breakTimerId),
        activityMetrics: trackingData.activityMetrics,
      });
    }
  }

  try {
    uIOhook.stop();
    if (keyboardListenerInstance) {
      keyboardListenerInstance.kill();
      keyboardListenerInstance = null;
    }
    keyStates.clear();
    mouseButtons.clear();
    console.log('⏹️ Hardware listeners stopped and state cleared');
  } catch (error) {
    console.log("Error stopping hardware listeners:", error);
  }
}

ipcMain.handle("get-tracking-data", async () => {
  return {
    workingTime: trackingData.workingTime,
    idleTime: trackingData.idleTime,
    isIdle: trackingData.isIdle,
    activityMetrics: trackingData.activityMetrics,
    isTrackingActive: !!trackingIntervalId,
  };
});

// Track mouse clicks from renderer
ipcMain.handle("track-mouse-click", async () => {
  if (!trackingIntervalId) return { success: false };
  trackMouseClickShared();
  return { success: true };
});

// Track mouse scrolls from renderer
ipcMain.handle("track-mouse-scroll", async () => {
  if (!trackingIntervalId) return { success: false };
  trackScrollShared();
  return { success: true };
});

// Track key presses from renderer
ipcMain.handle("track-key-press", async () => {
  if (!trackingIntervalId) return { success: false };
  trackKeyPressShared();
  return { success: true };
});

// Queue for failed uploads
function queueUpload(sessionData) {
  const queue = store.get('uploadQueue', []);
  queue.push({
    data: sessionData,
    timestamp: Date.now(),
    attempts: 0
  });
  store.set('uploadQueue', queue);
  console.log(`📥 Added session to upload queue. Queue size: ${queue.length}`);
}

// Process the upload queue
async function processUploadQueue() {
  const queue = store.get('uploadQueue', []);
  if (queue.length === 0) return;

  console.log(`🔄 Processing upload queue (${queue.length} items)...`);
  const userId = store.get('currentUserId');
  if (!userId) return;

  const remainingQueue = [];

  for (const item of queue) {
    try {
      // Try to upload - convert time values to seconds
      const payload = {
        userId, // Ensure we use current user ID (or store userId in queue item)
        userName: store.get('currentUserName') || "",
        ...item.data,
        workingTime: Math.floor((item.data.workingTime || 0) / 1000), // Convert ms to seconds
        idleTime: Math.floor((item.data.idleTime || 0) / 1000), // Convert ms to seconds
        date: item.data.date || new Date(item.timestamp).toISOString().split('T')[0]
      };

      const response = await fetch(`${ADMIN_API_URL}/sessions/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log(`✅ Queued item uploaded successfully for session starting at ${new Date(item.data.sessionStart).toLocaleTimeString()}`);
      } else {
        // If failed, keep in queue
        item.attempts += 1;
        remainingQueue.push(item);
        const errText = await response.text();
        console.warn(`⚠️ Queued upload failed (attempt ${item.attempts}): ${response.status} ${errText}`);
      }
    } catch (error) {
      item.attempts += 1;
      remainingQueue.push(item);
      console.error('❌ Queued upload error:', error.message);
    }
  }

  store.set('uploadQueue', remainingQueue);
}

// Upload session data to Admin backend
async function uploadSessionToBackend(sessionData) {
  try {
    const userId = store.get('currentUserId');
    const token = store.get('adminAuthToken');
    
    if (!userId) {
      console.log('⚠️  No user ID found, skipping session upload');
      return { success: false, error: 'No user ID' };
    }

    console.log(`📤 Uploading session for user ${userId}...`);

    // Prepare payload - convert milliseconds to seconds for backend storage
    const userName = store.get('currentUserName') || 'Unknown User';
    const payload = {
      userId,
      userName,
      workingTime: Math.floor((sessionData.workingTime || 0) / 1000), // Convert ms to seconds
      idleTime: Math.floor((sessionData.idleTime || 0) / 1000), // Convert ms to seconds
      sessionStart: sessionData.sessionStart || trackingData.sessionStart,
      sessionEnd: sessionData.sessionEnd || null,
      date: sessionData.date || new Date().toISOString().split('T')[0],
      screenshotCount: sessionData.screenshotCount || 0,
      totalScreenshotCount: trackingData.totalScreenshotCount, // Send total count so far
      breaksTaken: sessionData.breaksTaken || 0,
      screenshots: sessionData.screenshots || [],
      breakDetails: sessionData.breakDetails || [],
      // Include activity metrics
      activityMetrics: sessionData.activityMetrics || trackingData.activityMetrics,
      // Include application usage
      applications: formatAppUsageForBackend(sessionData.appUsage || trackingData.appUsage)
    };

    console.log(`📊 Time data - Working: ${payload.workingTime}s (${sessionData.workingTime}ms), Idle: ${payload.idleTime}s (${sessionData.idleTime}ms)`);

    const response = await fetch(`${ADMIN_API_URL}/sessions/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Session uploaded successfully:', data.data?.sessionId);

    processUploadQueue();

    return { success: true, sessionId: data.data?.sessionId };
  } catch (error) {
    const errorMsg = error.message || String(error);
    console.error('❌ Upload failed:', errorMsg);

    // Queue for retry
    queueUpload(sessionData);

    return { success: false, error: errorMsg, queued: true };
  }
}

ipcMain.handle("reset-tracking", async () => {
  try {
    // Prepare session data with date
    const sessionData = {
      workingTime: trackingData.workingTime,
      idleTime: trackingData.idleTime,
      sessionStart: trackingData.sessionStart,
      sessionEnd: Date.now(),
      date: new Date().toISOString().split('T')[0], // Add date for filtering
      screenshotCount: trackingData.totalScreenshotCount,
      breaksTaken: 0, // TODO: Track from break history
      activityMetrics: { ...trackingData.activityMetrics }
    };

    console.log('🔄 Resetting tracking and saving session...');

    // Save to local store for Reports page
    const sessions = store.get("sessions", []);
    sessions.push({
      ...sessionData,
      timestamp: Date.now(),
    });
    store.set("sessions", sessions);
    console.log(`💾 Saved session to local store (total: ${sessions.length})`);

    // Also upload to backend
    await uploadSessionToBackend(sessionData);

    // Reset all tracking data for the next session
    resetAllTrackingData();

    console.log('✅ Tracking reset complete');
    return { success: true };
  } catch (error) {
    console.error('❌ Error resetting tracking:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("save-session", async (event, sessionData) => {
  try {
    // Save to local store
    const sessions = store.get("sessions", []);
    sessions.push({
      ...sessionData,
      timestamp: Date.now(),
    });
    store.set("sessions", sessions);

    // Also upload to backend
    await uploadSessionToBackend(sessionData);

    return { success: true };
  } catch (error) {
    console.error('Error saving session:', error);
    return { success: false, error: error.message };
  }
});

// Store user ID (called after login)
ipcMain.handle("set-user-id", async (event, userId) => {
  console.log(`👤 Setting user ID: ${userId}`);
  store.set('currentUserId', userId);
  updateSocketId(userId);
  return { success: true };
});

ipcMain.handle("set-user-info", async (event, { userId, userName, token }) => {
  console.log(`👤 Setting user info: ${userName} (${userId})`);
  store.set('currentUserId', userId);
  store.set('currentUserName', userName);
  if (token) {
    store.set('adminAuthToken', token);
  }
  updateSocketId(userId);
  return { success: true };
});

ipcMain.handle("set-clocked-in", async (event, clockedIn) => {
  console.log(`🕒 Setting clocked-in status: ${clockedIn}`);
  isClockedIn = clockedIn;
  
  if (clockedIn) {
    startScheduledBreaks();
  } else {
    // Clear scheduled break timers if any
    Object.values(scheduledBreakTimers).forEach(timer => {
       if (timer) clearTimeout(timer);
    });
    // Also stop tracking and screenshots just in case
    stopTracking();
    stopScreenshots();
  }
  
  return { success: true };
});

ipcMain.handle("get-sessions", async () => {
  return store.get("sessions", []);
});

ipcMain.handle("start-screenshots", async () => {
  startScreenshots();
  return { success: true };
});

ipcMain.handle("stop-screenshots", async () => {
  stopScreenshots();
  return { success: true };
});

ipcMain.handle("get-screenshots", async () => {
  ensureScreenshotsDir();
  const userId = store.get('currentUserId');
  if (!userId) {
    console.warn("⚠️ No user ID found while fetching screenshots");
    return [];
  }

  try {
    const files = fs
      .readdirSync(screenshotsDir)
      .filter((f) => f.startsWith(`screenshot_${userId}_`) && f.endsWith(".png"));
    const list = files.map((f) => {
      const p = path.join(screenshotsDir, f);
      let dataUri = null;
      try {
        const buf = fs.readFileSync(p);
        dataUri = `data:image/png;base64,${buf.toString("base64")}`;
      } catch (e) {
        dataUri = null;
      }

      // Parse timestamp from filename: screenshot_userId_timestamp.png
      const parts = f.replace(".png", "").split("_");
      const timestamp = parts.length >= 3 ? Number(parts[parts.length - 1]) : 0;

      return {
        file: f,
        path: p,
        timestamp: timestamp,
        data: dataUri,
      };
    });
    list.sort((a, b) => b.timestamp - a.timestamp);
    return list;
  } catch (err) {
    console.error("Failed to list screenshots", err);
    return [];
  }
});

ipcMain.handle("start-break", async (event, minutes) => {
  const res = startBreak(minutes || 15);
  if (res && res.success === false) {
    return res;
  }
  return { success: true, breakEnd: breakEndTimestamp };
});

ipcMain.handle("stop-break", async () => {
  stopBreak();
  return { success: true };
});

ipcMain.handle("get-break-state", async () => {
  const lastManual = store.get("lastManualBreakDate", "");
  const now = new Date();
  const today = todayDateStr();
  const canStart = lastManual !== today;
  const nextAvailableAt = canStart
    ? null
    : new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      0
    ).getTime();
  // scheduled breaks info
  const sb = store.get("scheduledBreaks", {
    date: todayDateStr(),
    afternoon45: false,
    evening15: false,
  });

  const breakSchedules = store.get('breakSchedules', {
    afternoon: { time: '13:15', duration: 45 },
    evening: { time: '16:45', duration: 15 }
  });

  const [aftHour, aftMin] = (breakSchedules.afternoon?.time || '13:15').split(':').map(Number);
  const [eveHour, eveMin] = (breakSchedules.evening?.time || '16:45').split(':').map(Number);
  const aftDur = breakSchedules.afternoon?.duration || 45;
  const eveDur = breakSchedules.evening?.duration || 15;

  // compute whether scheduled windows are still open for today
  const nowDt = new Date();
  const makeTime = (h, m) =>
    new Date(
      nowDt.getFullYear(),
      nowDt.getMonth(),
      nowDt.getDate(),
      h,
      m,
      0,
      0
    ).getTime();

  const afternoonWindowEnd = makeTime(aftHour, aftMin) + aftDur * 60 * 1000;
  const eveningWindowEnd = makeTime(eveHour, eveMin) + eveDur * 60 * 1000;

  const afternoonPassed =
    Date.now() > afternoonWindowEnd || sb.afternoon45 === true;
  const eveningPassed = Date.now() > eveningWindowEnd || sb.evening15 === true;

  const scheduled = {
    afternoon: {
      taken: !!sb.afternoon45,
      windowEnd: afternoonWindowEnd,
      passed: afternoonPassed,
      time: breakSchedules.afternoon?.time,
      duration: aftDur
    },
    evening: {
      taken: !!sb.evening15,
      windowEnd: eveningWindowEnd,
      passed: eveningPassed,
      time: breakSchedules.evening?.time,
      duration: eveDur
    },
  };

  return {
    onBreak: Boolean(breakTimerId),
    breakEnd: breakEndTimestamp,
    lastManualBreakDate: lastManual,
    canStart,
    nextAvailableAt,
    scheduled,
  };
});

ipcMain.handle("take-screenshot-now", async () => {
  if (!trackingIntervalId) {
    console.log("⚠️ Screenshot blocked: Tracking not active");
    return { success: false, error: "Tracking not active" };
  }
  const result = await takeScreenshot();
  if (result) {
    return { success: true, path: result.path };
  } else {
    return { success: false, error: "Failed to take screenshot" };
  }
});

ipcMain.handle("get-screenshots-dir", async () => {
  ensureScreenshotsDir();
  return screenshotsDir;
});

ipcMain.handle("are-screenshots-running", async () => {
  return screenshotIntervalId !== null;
});

ipcMain.handle("delete-screenshot", async (event, filePath) => {
  const allowDeletion = store.get('allowScreenshotDeletion', false);
  if (!allowDeletion) {
    return { success: false, error: "Screenshot deletion is disabled by administrator" };
  }

  const userId = store.get('currentUserId');
  if (!userId || !path.basename(filePath).startsWith(`screenshot_${userId}_`)) {
    return { success: false, error: "Unauthorized or invalid file" };
  }
  try {
    fs.unlinkSync(filePath);
    return { success: true };
  } catch (err) {
    console.error("Failed to delete screenshot", err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle("bulk-delete-screenshots", async (event, filePaths) => {
  const allowDeletion = store.get('allowScreenshotDeletion', false);
  if (!allowDeletion) {
    return { success: 0, failed: filePaths.length, error: "Screenshot deletion is disabled by administrator" };
  }

  const userId = store.get('currentUserId');
  const results = { success: 0, failed: 0, errors: [] };
  
  if (!userId) return { success: 0, failed: filePaths.length, error: "No user logged in" };

  for (const filePath of filePaths) {
    try {
      if (!path.basename(filePath).startsWith(`screenshot_${userId}_`)) {
        throw new Error("Unauthorized to delete this file");
      }
      fs.unlinkSync(filePath);
      results.success += 1;
    } catch (err) {
      results.failed += 1;
      results.errors.push({ path: filePath, error: String(err) });
    }
  }
  return results;
});

app.commandLine.appendSwitch('enable-location-services');

app.whenReady().then(() => {
  // Move name setting to the very top, outside whenReady

  // Handle permission requests (like geolocation and media)
  // This handles the actual request for permission (the first time)
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const origin = webContents.getURL();
    console.log(`[PermissionRequest] Origin: ${origin}, Permission: ${permission}`);
    
    // For Geolocation, we must allow it. On macOS, this triggers the OS prompt.
    if (permission === 'geolocation') {
      console.log('📍 Geolocation permission requested, allowing...');
      return callback(true);
    }

    // For other permissions like media
    if (permission === 'media') {
       return callback(true);
    }

    callback(false);
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission, origin) => {
    // console.log(`[PermissionCheck] Origin: ${origin}, Permission: ${permission}`);
    
    // For Geolocation, we return true to let the frontend attempt the request.
    // This prevents the UI from getting stuck in a 'denied' state when the OS
    // permission is actually handled at the request level.
    if (permission === 'geolocation') {
      return true; 
    }
    
    if (permission === 'media') {
      return true;
    }
    return false;
  });
  
  // Set Dock icon on macOS during development
  if (process.platform === 'darwin') {
    const iconPath = path.join(__dirname, "icon-2.png");
    if (fs.existsSync(iconPath)) {
      const icon = nativeImage.createFromPath(iconPath);
      app.dock.setIcon(icon);
    }
  }

  createWindow();
  //open devtools
  // mainWindow.webContents.openDevTools();
  // Initialize scheduled-break state for today
  initializeScheduledBreakState();
  createTray();

  // Recover any unsaved data from a previous crash (only if not resumeable)
  const buffer = store.get('activeSessionBuffer');
  const userId = store.get('currentUserId');
  const isResumeable = buffer && buffer.userId === userId && (Date.now() - buffer.timestamp < 2 * 60 * 60 * 1000);
  
  if (buffer && !isResumeable) {
    recoverUnsavedSession();
  }

  // Handle Auto-Start
  const autoStart = store.get('autoStart', true);
  app.setLoginItemSettings({
    openAtLogin: autoStart,
    path: app.getPath('exe'),
  });

  // Check for upcoming breaks every minute
  setInterval(() => {
    if (!isClockedIn) return;
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const breakSchedules = store.get('breakSchedules', {
      afternoon: { time: '13:15', duration: 45 },
      evening: { time: '16:45', duration: 15 }
    });
    
    const reminderBuffer = store.get('breakReminderMinutes', 5);

    // Simplified check: if current time + buffer matches a break time
    Object.values(breakSchedules).forEach(sched => {
      const [h, m] = sched.time.split(':').map(Number);
      const breakDate = new Date();
      breakDate.setHours(h, m, 0, 0);
      
      const diffMins = Math.floor((breakDate.getTime() - now.getTime()) / 60000);
      
      if (diffMins === reminderBuffer) {
        sendNotification('Break Reminder', `Your scheduled ${sched.duration}m break starts in ${reminderBuffer} minutes.`);
      }
    });
  }, 60000);

  // Start periodic session upload (every 5 minutes)
  setInterval(async () => {
    const userId = store.get('currentUserId');
    if (!userId || !isClockedIn) return;

    // First try to process any queued items
    await processUploadQueue();

    console.log('⏰ Periodic session upload...');

    // Calculate CUMULATIVE time (backend subtraction logic prefers this)
    const totalWorkingTime = trackingData.workingTime;
    const totalIdleTime = trackingData.idleTime;

    // Only upload if there's data to send
    if (totalWorkingTime < 1000 && totalIdleTime < 1000) {
      console.log('⏭️ Skipping upload - no significant activity');
      return;
    }

    // Get screenshots to upload (only NEW ones since last clear)
    const newScreenshots = [...(trackingData.screenshots || [])];

    const sessionData = {
      workingTime: totalWorkingTime, 
      idleTime: totalIdleTime,
      sessionStart: trackingData.sessionStart, // ALWAYS use original start time
      sessionEnd: Date.now(),
      screenshotCount: trackingData.totalScreenshotCount,
      breaksTaken: 0,
      screenshots: newScreenshots,
      activityMetrics: { ...trackingData.activityMetrics },
      appUsage: { ...trackingData.appUsage }
    };

    console.log(`📊 Uploading session update - Working: ${Math.floor(totalWorkingTime / 1000)}s, Idle: ${Math.floor(totalIdleTime / 1000)}s`);

    const result = await uploadSessionToBackend(sessionData);

    // If upload successful or queued, update last upload tracking
    if (result.success || result.queued) {
      lastUploadTime = {
        workingTime: trackingData.workingTime,
        idleTime: trackingData.idleTime,
        timestamp: Date.now(),
        activityMetrics: { ...trackingData.activityMetrics }
      };
      trackingData.screenshots = [];
      console.log('✅ Last upload time updated');
    }
  }, 5 * 60 * 1000); // Every 5 minutes

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      restoreMainWindow();
    }
  });
});

// Update settings dynamically
ipcMain.handle("set-settings", async (event, settings) => {
  console.log('⚙️ Updating settings in main process:', settings);

  if (settings.screenshotInterval) {
    // Update screenshot interval if changed
    const oldInterval = store.get('screenshotInterval');
    store.set('screenshotInterval', settings.screenshotInterval);

    // If interval changed and screenshots are running, restart them
    if (oldInterval !== settings.screenshotInterval && screenshotIntervalId) {
      console.log('🔄 Restarting screenshot timer with new interval:', settings.screenshotInterval);
      clearInterval(screenshotIntervalId);
      screenshotIntervalId = null;

      // Restart with new interval
      startScreenshots();
    }
  }

  if (settings.idleThreshold) {
    store.set('idleThreshold', settings.idleThreshold);
    appSettings.idleThreshold = settings.idleThreshold;
    console.log('⚙️ Updated idleThreshold to:', settings.idleThreshold);
  }

  if (settings.breakSchedules) {
    store.set('breakSchedules', settings.breakSchedules);
    // Restart break scheduler
    startScheduledBreaks();
  }

  if (settings.allowScreenshotDeletion !== undefined) {
    store.set('allowScreenshotDeletion', settings.allowScreenshotDeletion);
  }

  if (settings.autoStart !== undefined) {
    store.set('autoStart', settings.autoStart);
    app.setLoginItemSettings({
      openAtLogin: settings.autoStart,
      path: app.getPath('exe'),
    });
  }

  if (settings.breakReminderMinutes !== undefined) {
    store.set('breakReminderMinutes', settings.breakReminderMinutes);
  }

  if (settings.hideOnMinimize !== undefined) {
    store.set('hideOnMinimize', settings.hideOnMinimize);
    console.log('⚙️ Updated hideOnMinimize to:', settings.hideOnMinimize);
    updateDockVisibility();
  }

  if (settings.hideFromDockOnMinimize !== undefined) {
    store.set('hideFromDockOnMinimize', settings.hideFromDockOnMinimize);
    updateDockVisibility();
  }

  if (settings.hideFromTrayOnMinimize !== undefined) {
    store.set('hideFromTrayOnMinimize', settings.hideFromTrayOnMinimize);
    updateTrayVisibility();
  }

  if (settings.hideBothOnMinimize !== undefined) {
    store.set('hideBothOnMinimize', settings.hideBothOnMinimize);
    updateTrayVisibility();
    updateDockVisibility();
  }


  return { success: true };
});

ipcMain.handle("start-session", async () => {
  console.log("🚀 Starting session after login...");
  // Tracking and screenshots are now started manually via clock-in
  // startTracking();
  // startScreenshots();
  startScheduledBreaks();
  return { success: true };
});

ipcMain.handle("start-tracking-only", async () => {
  const buffer = store.get('activeSessionBuffer');
  const userId = store.get('currentUserId');
  
  if (buffer && buffer.userId === userId && (Date.now() - buffer.timestamp < 2 * 60 * 60 * 1000)) {
     console.log("▶️ Resuming tracking from recent buffer...");
     startTracking(buffer);
  } else {
     console.log("▶️ Starting new tracking session...");
     startTracking();
  }
  startScreenshots();
  return { success: true };
});

ipcMain.handle("check-permissions", async () => {
  return await platformModule.checkPermissions();
});

ipcMain.handle("stop-tracking-only", async () => {
  console.log("⏸️ Pausing tracking...");
  stopTracking();
  stopScreenshots();
  return { success: true };
});



  safelyHandle('show-message-box', async (event, options) => {
    if (!mainWindow) return { response: 0 };
    
    // Ensure we use the app icon
    const iconPath = path.join(__dirname, "icon-2.png");
    const icon = nativeImage.createFromPath(iconPath);
    
    const result = await dialog.showMessageBox(mainWindow, {
      ...options,
      icon: icon, // Force the app icon
      title: options.title || "Employee Tracker"
    });
    
    return result;
  });

  safelyHandle('open-location-settings', async () => {
    console.log('📍 Opening location settings...');
    if (process.platform === 'darwin') {
      require('child_process').exec('open "x-apple.systempreferences:com.apple.preference.security?Privacy_LocationServices"');
    } else if (process.platform === 'win32') {
      require('child_process').exec('start ms-settings:privacy-location');
    }
    return { success: true };
  });

  safelyHandle('reset-location-permissions', async () => {
    console.log('📍 Resetting location permission overrides...');
    session.defaultSession.clearPermissionOverrides();
    return { success: true };
  });

ipcMain.handle("stop-session", async () => {
  console.log("🛑 Stopping session...");

  stopTracking();
  stopScreenshots();
  resetAllTrackingData();
  store.delete('currentUserId');
  store.delete('currentUserName');
  updateSocketId('electron-app');

  return { success: true };
});

ipcMain.handle("get-app-settings", async () => {
  return {
    screenshotInterval: store.get('screenshotInterval', 30),
    idleThreshold: store.get('idleThreshold', 30000),
    breakSchedules: store.get('breakSchedules', {
      afternoon: { time: '13:15', duration: 45 },
      evening: { time: '16:45', duration: 15 }
    }),
    allowScreenshotDeletion: store.get('allowScreenshotDeletion', false),
    autoStart: store.get('autoStart', true),
    breakReminderMinutes: store.get('breakReminderMinutes', 5),
    hideOnMinimize: store.get('hideOnMinimize', false),
    hideFromDockOnMinimize: store.get('hideFromDockOnMinimize', false),
    hideFromTrayOnMinimize: store.get('hideFromTrayOnMinimize', false),
    hideBothOnMinimize: store.get('hideBothOnMinimize', false),
  };
});

// Track last upload time/metrics to send only incremental data (global scope)

app.on("window-all-closed", async () => {
  // Upload final session before quitting
  const userId = store.get('currentUserId');
  if (userId) {
    console.log('📤 Uploading final session before quit...');

    // Calculate incremental time since last upload
    const incrementalWorkingTime = trackingData.workingTime - lastUploadTime.workingTime;
    const incrementalIdleTime = trackingData.idleTime - lastUploadTime.idleTime;

    // Only upload if there's data to send
    if (incrementalWorkingTime > 0 || incrementalIdleTime > 0) {
      const sessionData = {
        workingTime: trackingData.workingTime,
        idleTime: trackingData.idleTime,
        sessionStart: trackingData.sessionStart,
        sessionEnd: Date.now(),
        screenshotCount: trackingData.totalScreenshotCount,
        breaksTaken: 0,
        activityMetrics: { ...trackingData.activityMetrics }
      };
      await uploadSessionToBackend(sessionData);
      console.log(`📊 Final upload - Working: ${Math.floor(incrementalWorkingTime / 1000)}s, Idle: ${Math.floor(incrementalIdleTime / 1000)}s`);
    } else {
      console.log('⏭️ No new data to upload on quit');
    }
  }

  // Stop all tracking and screenshots
  stopTracking();
  stopScreenshots();

  // Clear all timers
  Object.values(scheduledBreakTimers).forEach((timer) => {
    if (timer) clearTimeout(timer);
  });
  if (breakTimerId) clearTimeout(breakTimerId);

  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Final safety net for quitting correctly
app.on('before-quit', (event) => {
  // If user is clocked in (tracking is active), ask for confirmation
  if (trackingIntervalId && !isQuitting) {
    const choice = dialog.showMessageBoxSync({
      type: 'warning',
      buttons: ['Stay', 'Quit Anyway'],
      title: 'Active Session',
      message: 'You have an active tracking session. Are you sure you want to quit?',
      detail: 'Quitting might lead to inconsistent tracking data if not clocked out.',
      defaultId: 0,
      cancelId: 0
    });

    if (choice === 0) {
      event.preventDefault();
      isQuitting = false;
      return;
    }
  }

  if (!isQuitting) {
    isQuitting = true;
    performFinalSessionUpload();
  }
});
