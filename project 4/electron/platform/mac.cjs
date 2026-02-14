const { exec } = require("child_process");
const { systemPreferences } = require("electron");

/**
 * Get the name of the active application on macOS using AppleScript.
 * Optimizes for Electron-based apps by reading their bundle Plist.
 */
function getActiveWindow() {
  return new Promise((resolve) => {
    // 1. Get the process name using AppleScript
    const getProcessScript = `tell application "System Events" to get name of first application process whose frontmost is true`;
    
    exec(`osascript -e '${getProcessScript}'`, (err, stdout) => {
      if (err) return resolve('Unknown');
      
      const processName = stdout.trim();
      
      // If it's not a generic Electron runner, just return the process name
      if (processName !== 'Electron' && !processName.includes('Electron')) {
        return resolve(processName);
      }
      
      // 2. For Electron apps, try to get the actual app name from the bundle metadata
      const getBundleInfoScript = `
        tell application "System Events"
          set frontProcess to first application process whose frontmost is true
          set appPath to POSIX path of (application file of frontProcess as alias)
          return appPath
         tell
      `;
      
      exec(`osascript -e '${getBundleInfoScript}'`, (err2, appPath) => {
        if (err2 || !appPath) return resolve(processName);
        
        const bundlePath = appPath.trim();
        
        // Use defaults command to read the app name from Info.plist
        const readPlistCmd = `defaults read "${bundlePath}Contents/Info" CFBundleDisplayName 2>/dev/null || defaults read "${bundlePath}Contents/Info" CFBundleName 2>/dev/null || echo ""`;
        
        exec(readPlistCmd, (err3, appName) => {
          if (err3 || !appName || !appName.trim() || appName.trim() === 'Electron') {
            // Fallback: extract from bundle path (e.g., /Applications/Slack.app/ -> Slack)
            const match = bundlePath.match(/\/([^\/]+)\.app\/?$/);
            if (match && match[1] && match[1] !== 'Electron') {
              return resolve(match[1]);
            }
            return resolve(processName);
          }
          resolve(appName.trim());
        });
      });
    });
  });
}

/**
 * Check if the app has required system permissions
 */
async function checkPermissions() {
  // Passing 'true' to isTrustedAccessibilityClient prompts the user if not trusted
  const accessibility = systemPreferences.isTrustedAccessibilityClient(true);
  const camera = systemPreferences.getMediaAccessStatus('camera');
  const microphone = systemPreferences.getMediaAccessStatus('microphone');
  // Note: 'location' permission status is not directly available via systemPreferences.
  // It is handled by the OS upon request from the Renderer process or Native module.
  const screen = systemPreferences.getMediaAccessStatus('screen');

  return {
    accessibility,
    camera,
    microphone,
    screen,
    platform: 'darwin',
    location: 'unknown' // Main process cannot easily check this on macOS without native module
  };
}

module.exports = {
  getActiveWindow,
  checkPermissions
};
