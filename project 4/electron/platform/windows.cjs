const { exec } = require("child_process");

/**
 * Get the name of the active application on Windows using PowerShell.
 * Retrieves the process name of the current foreground window.
 */
function getActiveWindow() {
  return new Promise((resolve) => {
    // PowerShell command to get the name of the active foreground window's process
    const psCommand = `powershell -NoProfile -Command "
      Add-Type '@
        using System;
        using System.Runtime.InteropServices;
        public class Win32 {
          [DllImport(\\"user32.dll\\")]
          public static extern IntPtr GetForegroundWindow();
          [DllImport(\\"user32.dll\\")]
          public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
        }
'@
      $hwnd = [Win32]::GetForegroundWindow()
      if ($hwnd -ne [IntPtr]::Zero) {
        $processId = 0
        [Win32]::GetWindowThreadProcessId($hwnd, [ref]$processId)
        (Get-Process -Id $processId).ProcessName
      } else {
        'Unknown'
      }"`;

    exec(psCommand, (err, stdout) => {
      if (err || !stdout) return resolve('Unknown');
      resolve(stdout.trim());
    });
  });
}

/**
 * Check if the app has required system permissions
 * Most Windows tracking permissions are implicit or handled at install time.
 */
async function checkPermissions() {
  // On Windows, these are generally not programmatically checkable via Electron's 
  // systemPreferences API in the same way as Mac.
  return {
    accessibility: true, // Generally allowed unless blocked by corporate policy
    camera: 'granted',
    microphone: 'granted',
    screen: 'granted',
    platform: 'win32'
  };
}

module.exports = {
  getActiveWindow,
  checkPermissions
};
