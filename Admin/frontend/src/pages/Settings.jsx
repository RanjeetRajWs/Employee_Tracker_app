import React, { useState, useEffect } from "react";
import { getSettings, updateSettings, resetSettings } from "../services/api";
import { extractErrorMessage } from "../utils";
import { Settings, Save, AlertCircle, Loader, Monitor, Layout, Minimize2, EyeOff, Clock, Camera, Zap, Coffee, Moon } from "lucide-react";

export default function AppSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await getSettings();
      setSettings(response.data.data);
      setError("");
    } catch (err) {
      setError("Failed to load settings");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      // Only send the fields that the backend expects (exclude MongoDB fields)
      const settingsToUpdate = {
        screenshotInterval: settings.screenshotInterval,
        idleThreshold: settings.idleThreshold,
        breakSchedules: settings.breakSchedules,
        maxUsersAllowed: settings.maxUsersAllowed,
        maintenanceMode: settings.maintenanceMode,
        allowScreenshotDeletion: settings.allowScreenshotDeletion,
        hideOnMinimize: settings.hideOnMinimize,
        hideFromDockOnMinimize: settings.hideFromDockOnMinimize,
        hideFromTrayOnMinimize: settings.hideFromTrayOnMinimize,
        hideBothOnMinimize: settings.hideBothOnMinimize,
        standardClockInTime: settings.standardClockInTime,
      };
      await updateSettings(settingsToUpdate);
      setSuccess("Settings saved successfully!");
      setError("");
      // Refresh settings after successful save
      await fetchSettings();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      const message = extractErrorMessage(err);
      setError(message || "Failed to save settings");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleBreakScheduleChange = (breakType, field, value) => {
    setSettings((prev) => ({
      ...prev,
      breakSchedules: {
        ...prev?.breakSchedules,
        [breakType]: {
          ...prev?.breakSchedules?.[breakType],
          [field]: value,
        },
      },
    }));
  };

  const handleResetToDefaults = async () => {
    try {
      setIsSaving(true);
      const response = await resetSettings();
      const data = response?.data?.data || response?.data;
      if (data) {
        setSettings(data);
      }
      setSuccess("Settings reset to defaults");
      setError("");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      const message = extractErrorMessage(err);
      setError(message || "Failed to reset settings");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMinimizeBehaviorChange = (behavior) => {
    setSettings((prev) => ({
      ...prev,
      hideFromDockOnMinimize: behavior === "dock",
      hideFromTrayOnMinimize: behavior === "tray",
      hideBothOnMinimize: behavior === "both",
      hideOnMinimize: behavior === "dock" || behavior === "both",
    }));
  };

  const getMinimizeBehavior = () => {
    if (settings?.hideBothOnMinimize) return "both";
    if (settings?.hideFromTrayOnMinimize) return "tray";
    if (settings?.hideFromDockOnMinimize) return "dock";
    return "none";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded dark:bg-slate-700 dark:border-slate-700 dark:text-red-300">
        Failed to load settings
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Settings size={32} /> App Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-300">Manage application-wide settings</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2 dark:bg-slate-700 dark:border-slate-700 dark:text-red-300">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded dark:bg-slate-700 dark:border-slate-700 dark:text-green-300">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Screenshot Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100 transition-all hover:shadow-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Camera size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Screenshot Settings
            </h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Screenshot Interval (seconds) <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full ml-2 font-medium">Synced to App</span>
              </label>
              <input
                type="number"
                min="10"
                max="120"
                value={settings.screenshotInterval}
                onChange={(e) =>
                  handleChange("screenshotInterval", parseInt(e.target.value))
                }
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none transition-all"
              />
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 italic font-medium">Default: 30 seconds</p>
            </div>
          </div>
        </div>

        {/* Idle Threshold */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100 transition-all hover:shadow-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
              <Zap size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Activity Detection
            </h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Idle Threshold (seconds) <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full ml-2 font-medium">Synced to App</span>
              </label>
              <input
                type="number"
                min="15"
                max="120"
                value={settings.idleThreshold}
                onChange={(e) =>
                  handleChange("idleThreshold", parseInt(e.target.value))
                }
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none transition-all"
              />
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 italic font-medium">Default: 30 seconds</p>
            </div>
          </div>
        </div>

        {/* Break Schedules */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100 transition-all hover:shadow-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <Coffee size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Afternoon Break
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={settings?.breakSchedules?.afternoon?.time || ''}
                onChange={(e) =>
                  handleBreakScheduleChange("afternoon", "time", e.target.value)
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Duration (min)
              </label>
              <input
                type="number"
                value={settings?.breakSchedules?.afternoon?.duration || ''}
                onChange={(e) =>
                  handleBreakScheduleChange(
                    "afternoon",
                    "duration",
                    parseInt(e.target.value)
                  )
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100 transition-all hover:shadow-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Moon size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Evening Break
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={settings?.breakSchedules?.evening?.time || ''}
                onChange={(e) =>
                  handleBreakScheduleChange("evening", "time", e.target.value)
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Duration (min)
              </label>
              <input
                type="number"
                value={settings?.breakSchedules?.evening?.duration || ''}
                onChange={(e) =>
                  handleBreakScheduleChange(
                    "evening",
                    "duration",
                    parseInt(e.target.value)
                  )
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Clock-In Time Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:col-span-2 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100 transition-all hover:shadow-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
              <Clock size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Attendance & Punctuality
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Standard Clock-In Time <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full ml-2 font-medium italic">Delay Tracking Grace Period</span>
              </label>
              <input
                type="time"
                value={settings?.standardClockInTime || '10:15'}
                onChange={(e) =>
                  handleChange("standardClockInTime", e.target.value)
                }
                className="w-64 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none transition-all"
              />
              <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed max-w-md">
                Employees clocked in after this time will be flagged as <span className="text-red-500 font-semibold underline decoration-2 underline-offset-2">Delayed</span> in reports. Best practice is to allow 15 minutes of grace time from the start of work shift.
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-800">
              <h4 className="flex items-center gap-2 text-sm font-bold text-blue-900 dark:text-blue-300 mb-2">
                <AlertCircle size={16} /> Pro Tip
              </h4>
              <p className="text-xs text-blue-800/80 dark:text-blue-300/80 leading-relaxed font-medium">
                Consistent clock-in tracking helps in identifying performance trends and ensures high operational efficiency across your remote team.
              </p>
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2 dark:bg-slate-800 dark:text-gray-100">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            System Settings
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Max Users Allowed
              </label>
              <input
                type="number"
                value={settings.maxUsersAllowed}
                onChange={(e) =>
                  handleChange("maxUsersAllowed", parseInt(e.target.value))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white transition-all shadow-sm"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.maintenanceMode}
                    onChange={(e) =>
                      handleChange("maintenanceMode", e.target.checked)
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition-colors">
                  Maintenance Mode
                </span>
              </label>
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.allowScreenshotDeletion}
                    onChange={(e) =>
                      handleChange("allowScreenshotDeletion", e.target.checked)
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition-colors">
                  Allow employee screenshot deletion
                </span>
              </label>
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-slate-700 pt-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Window Minimize Behavior of App
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { id: "none", label: "Default", icon: Monitor, desc: "Show in Dock & Tray" },
                { id: "dock", label: "Hide Dock", icon: Layout, desc: "Hide from Taskbar" },
                { id: "tray", label: "Hide Tray", icon: Minimize2, desc: "Remove from Tray" },
                { id: "both", label: "Hide Both", icon: EyeOff, desc: "Hidden everywhere (Dock & Tray)" },
              ].map((opt) => {
                const isSelected = getMinimizeBehavior() === opt.id;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleMinimizeBehaviorChange(opt.id)}
                    className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-4 ring-blue-500/10"
                        : "border-gray-100 bg-gray-50/50 hover:border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400'}`}>
                      <Icon size={24} />
                    </div>
                    <div className="text-center">
                      <div className={`font-bold text-sm ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                        {opt.label}
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {opt.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          onClick={handleResetToDefaults}
          disabled={isSaving}
          className="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700 disabled:opacity-50 font-medium"
        >
          Reset to Defaults
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50 font-bold"
        >
          {isSaving ? <Loader className="animate-spin" size={20} /> : <Save size={20} />} 
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
