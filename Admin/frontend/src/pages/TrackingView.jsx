import React, { useState, useEffect } from "react";
import { getAllSessions, getActivityLogs, getAllUsers } from "../services/api";
import { Activity, Calendar, Clock, Database, Coffee, Camera, User } from "lucide-react";
import { TableSkeleton } from "../components/LoadingSkeleton";
import { NoSessionsFound, NoDataFound } from "../components/EmptyState";
import Modal from "../components/Modal";
import ScreenshotViewer from "../components/ScreenshotViewer";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { emitMessage } from "../services/socket";
import { useAdmin } from "../context/AdminContext";

export default function TrackingView() {
  const { notify } = useAdmin();
  const [sessions, setSessions] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [useDemoData, setUseDemoData] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [useLiveUpdates, setUseLiveUpdates] = useState(true);
  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [viewMode, setViewMode] = useState("list"); // 'list' | 'grid'
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);

  // Fetch users for the filter dropdown
  useEffect(() => {
    const fetchUsersList = async () => {
      try {
        setUsersLoading(true);
        const res = await getAllUsers(); // Match Reports page exactly
        if (res.data?.success) {
          // Handle both possible structures: array or paginated object
          const userList = res.data.data?.users || res.data.data || [];
          setUsers(Array.isArray(userList) ? userList : []);
        }
      } catch (err) {
        console.error("Failed to fetch users for filter", err);
      } finally {
        setUsersLoading(false);
      }
    };
    fetchUsersList();
  }, []);

  useEffect(() => {
    fetchData();
  }, [filterDate, useDemoData, selectedUserId]);

  const fetchData = async () => {
    try {
      // If this is the very first load (no data yet) show full-page loading
      const initialLoad = sessions.length === 0 && activityLogs.length === 0;
      if (initialLoad) setLoading(true);
      // Always show per-section loaders while fetching
      setSessionsLoading(true);
      setLogsLoading(true);
      // Backend expectations:
      // - Sessions use a string `date` field in `YYYY-MM-DD` format
      // - Activity logs accept timestamps or date strings and convert internally
      const sessionsStartDate = filterDate;
      const sessionsEndDate = filterDate;

      const activityStartMs = new Date(filterDate).getTime();
      const activityEndMs = activityStartMs + 24 * 60 * 60 * 1000;

      // if (useDemoData) {
      //   // generate demo sessions and activity logs
      //   const demo = generateDemoDataForDate(filterDate);
      //   setSessions(demo.sessions);
      //   setActivityLogs(demo.activityLogs);
      //   setSessionsLoading(false);
      //   setLogsLoading(false);
      // } else {
        const [sessionsRes, logsRes] = await Promise.all([
          getAllSessions({
            startDate: sessionsStartDate,
            endDate: sessionsEndDate,
            userId: selectedUserId || undefined
          }),
          getActivityLogs({
            startDate: activityStartMs,
            endDate: activityEndMs,
            userId: selectedUserId || undefined,
            limit: 2000,
          }),
        ]);

        if (sessionsRes?.data?.success) {
          setSessions(sessionsRes.data.data || []);
        } else {
          console.warn("Sessions fetch unsuccessful", sessionsRes);
        }

        if (logsRes?.data?.success) {
          setActivityLogs(logsRes.data.data || []);
        } else {
          console.warn("Logs fetch unsuccessful", logsRes);
        }

        setSessionsLoading(false);
        setLogsLoading(false);
      // }
      setError("");
    } catch (err) {
      setError("Failed to load tracking data");
      console.error(err);
    } finally {
      // Clear full-page loading only if it was set for the initial load
      if (sessions.length === 0 && activityLogs.length === 0) setLoading(false);
      // Make sure per-section loaders are cleared
      setSessionsLoading(false);
      setLogsLoading(false);
    }
  };

  // Polling for live updates when enabled (only when not using demo data)
  useEffect(() => {
    if (!useLiveUpdates || useDemoData) return;

    // Initial fetch handled by the other useEffect on mount/filter change.
    // We just set up the interval here.

    const id = setInterval(() => {
    // Background update: don't set global loading states to avoid UI flickering
    // Just fetch silently and update data
    async function fetchdata() {
      try {
        await Promise.all([
          getAllSessions({
            startDate: filterDate,
            endDate: filterDate,
            userId: selectedUserId || undefined
          }),
          getActivityLogs({
            startDate: new Date(filterDate).getTime(),
            endDate: new Date(filterDate).getTime() + 24 * 60 * 60 * 1000,
            userId: selectedUserId || undefined,
            limit: 2000,
          }),
        ]).then(([sessionsRes, logsRes]) => {
          if (sessionsRes?.data?.success) setSessions(sessionsRes?.data?.data); // Update sessions
          if (logsRes?.data?.success) setActivityLogs(logsRes?.data?.data); // Update activity logs
        }).catch(err => console.error("Live update failed", err));
      } catch (error) {
        console.log("Live update failed", error);
      }
    }

    fetchdata();
    }, 10000); // every 10s

    return () => clearInterval(id);
  }, [useLiveUpdates, useDemoData, filterDate, selectedUserId]);

  const formatDuration = (s) => {
    if (!s) return "0s";
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = Math.floor(s % 60);

    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const handleTakeScreenshot = (userId, userName) => {
    if (!userId) {
      notify("Cannot take screenshot: User ID not found", "error");
      return;
    }
    
    emitMessage("take-screenshot", {}, "project4", userId);
    notify(`Screenshot command sent to ${userName || 'user'}`, "success");
    
    // Log this action locally too if needed
    console.log(`📸 Manual screenshot requested for user ${userId}`);
  };

  // Demo data generator for a single date
  const generateDemoDataForDate = (dateStr) => {
    const date = new Date(dateStr);
    const sessions = [];
    const activityLogs = [];

    const sessionCount = Math.floor(Math.random() * 3) + 2; // 2-4 sessions
    // randomly choose one session to be ongoing (no sessionEnd) to mimic a live session
    const ongoingIndex = Math.random() > 0.5 ? Math.floor(Math.random() * sessionCount) : -1;
    for (let i = 0; i < sessionCount; i++) {
      const startHour = 9 + Math.floor(Math.random() * 3);
      const startMinute = Math.floor(Math.random() * 60);
      const sessionStart = new Date(date);
      sessionStart.setHours(startHour, startMinute, 0, 0);

      // if this session is the chosen ongoing one, set sessionEnd to null and compute duration to now
      let sessionEnd = null;
      let duration = (3 + Math.random() * 5) * 3600000; // default 3-8 hours
      if (i === ongoingIndex) {
        const now = Date.now();
        // if sessionStart is in future, keep a short duration
        duration = Math.max(0, now - sessionStart.getTime());
        sessionEnd = null;
      } else {
        duration = (3 + Math.random() * 5) * 3600000;
        sessionEnd = new Date(sessionStart.getTime() + duration);
      }

      const workingTime = duration * (0.65 + Math.random() * 0.25);
      const idleTime = duration - workingTime;

      const screenshotCount = Math.floor(duration / (30 * 60 * 1000)) + Math.floor(Math.random() * 5);
      const screenshots = Array.from({ length: screenshotCount }).map((_, si) => {
        // distribute timestamps across the available duration; if ongoing use now as upper bound
        const upper = i === ongoingIndex ? Date.now() : sessionStart.getTime() + duration;
        const ts = new Date(sessionStart.getTime() + Math.floor((si / Math.max(1, screenshotCount)) * Math.max(1, upper - sessionStart.getTime())));
        return {
          url: `https://picsum.photos/seed/tracking_${i}_${si}/800/450`,
          alt: `Screenshot ${si + 1}`,
          timestamp: ts.toISOString(),
        };
      });

      const breaksTaken = Math.floor(Math.random() * 3);
      const breaks = Array.from({ length: breaksTaken }).map(() => {
        const bStartOffset = Math.floor(Math.random() * Math.max(1, duration - 5 * 60 * 1000));
        const bDuration = (5 + Math.floor(Math.random() * 16)) * 60 * 1000;
        const start = new Date(sessionStart.getTime() + bStartOffset);
        const end = new Date(Math.min(start.getTime() + bDuration, sessionEnd.getTime()));
        return { start: start.toISOString(), end: end.toISOString() };
      });

      const activityMetrics = {
        keyPresses: Math.floor(Math.random() * 5000) + 1000,
        mouseClicks: Math.floor(Math.random() * 2000) + 500,
        mouseMovements: Math.floor(Math.random() * 10000) + 2000,
        mouseScrolls: Math.floor(Math.random() * 5000) + 1000,
      };

      const apps = ["VS Code", "Chrome", "Slack", "Terminal", "Spotify"];
      const applications = apps.map(app => ({
        name: app,
        duration: Math.floor(duration * Math.random() * 0.4 / 1000), // simplistic duration share
        lastActive: new Date(sessionStart.getTime() + Math.random() * duration).toISOString()
      }));

      const session = {
        _id: `demo_sess_${i}`,
        userId: `demo_user`,
        date: dateStr,
        sessionStart: sessionStart.toISOString(),
        sessionEnd: sessionEnd ? sessionEnd.toISOString() : null,
        workingTime: Math.floor(workingTime),
        idleTime: Math.floor(idleTime),
        screenshotCount,
        screenshots,
        breaksTaken,
        breaks,
        activityMetrics,
        applications,
      };
      
      sessions.push(session);

      // Activity logs: Generate a realistic timeline that matches the session metrics
      const totalDurMs = duration;
      const targetWorkingMs = workingTime;
      const targetIdleMs = idleTime;
      
      const sessionBaseTs = sessionStart.getTime();
      const chunkCount = 12; // Divide into 12 segments for a nice timeline
      const chunkDur = Math.floor(totalDurMs / chunkCount);
      
      for (let l = 0; l < chunkCount; l++) {
        const offset = l * chunkDur;
        const ts = new Date(sessionBaseTs + offset);
        
        // Alternate active/idle or mixed; here we distribute the total time
        const isLast = l === chunkCount - 1;
        const segmentWorking = isLast ? (targetWorkingMs - (chunkCount - 1) * Math.floor(targetWorkingMs / chunkCount)) : Math.floor(targetWorkingMs / chunkCount);
        const segmentIdle = isLast ? (targetIdleMs - (chunkCount - 1) * Math.floor(targetIdleMs / chunkCount)) : Math.floor(targetIdleMs / chunkCount);
        
        // Add working log
        if (segmentWorking > 5000) {
          activityLogs.push({
            _id: `demo_log_w_${i}_${l}`,
            userId: session.userId,
            sessionId: session._id,
            activityType: 'active',
            timestamp: ts.toISOString(),
            duration: segmentWorking,
          });
        }
        
        // Add idle log (slightly offset so it shows separately on X-axis)
        if (segmentIdle > 5000) {
          activityLogs.push({
            _id: `demo_log_i_${i}_${l}`,
            userId: session.userId,
            sessionId: session._id,
            activityType: 'idle',
            timestamp: new Date(ts.getTime() + (chunkDur / 2)).toISOString(),
            duration: segmentIdle,
          });
        }
      }
    }

    return { sessions, activityLogs };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-6"></div>
        </div>
        <TableSkeleton rows={5} columns={3} />
      </div>
    );
  }

  // Calculate summary metrics for the current filtered view
  const summaryStats = sessions.reduce((acc, s) => {
    acc.totalWork += (s.workingTime || 0);
    acc.totalIdle += (s.idleTime || 0);
    acc.totalScreenshots += (s.screenshotCount || 0);
    if (!s.sessionEnd) acc.activeCount++;
    return acc;
  }, { totalWork: 0, totalIdle: 0, totalScreenshots: 0, activeCount: 0 });

  return (
    <div className="space-y-4" style={{ height: '87vh', overflowY: 'auto' }}>
      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Sessions</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{sessions.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
          <p className="text-xs font-semibold text-green-500 uppercase tracking-wider mb-1">Work Duration</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatDuration(summaryStats.totalWork)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
          <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-1">Idle Time</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatDuration(summaryStats.totalIdle)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1">Live Now</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{summaryStats.activeCount}</p>
        </div>
      </div>
      {/* Header Section */}
      {/* <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 rounded-xl shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Tracking Data</h1>
        <p className="text-blue-100 dark:text-blue-200">Real-time monitoring of employee sessions and activity logs</p>
      </div> */}

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 border-l-4 border-red-500 text-red-700 dark:text-red-200 px-6 py-4 rounded-lg shadow-sm flex items-start gap-3">
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-semibold">Error Loading Data</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Controls Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-gray-200 dark:border-slate-700">
        <div className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Date Filter */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                <Calendar size={18} className="text-gray-600 dark:text-gray-300" />
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="bg-transparent border-none outline-none text-gray-900 dark:text-white text-sm font-medium cursor-pointer"
                />
              </label>

              {/* User Filter */}
              <label className="flex items-center gap-2 px-4 py-1.5 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                <User size={18} className="text-gray-600 dark:text-gray-300" />
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="bg-transparent border-none outline-none text-gray-900 dark:text-white text-sm font-medium cursor-pointer min-w-[150px]"
                  disabled={usersLoading}
                >
                  <option value="">All Employees</option>
                  {users && users.map(u => (
                    <option key={u.id || u._id} value={u.id || u._id}>
                      {u.username} ({u.email})
                    </option>
                  ))}
                </select>
                {usersLoading && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <div className="flex bg-gray-100 dark:bg-slate-700/50 rounded-lg p-1 mr-2 border border-gray-200 dark:border-slate-600">
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-md transition-all ${viewMode === "list"
                    ? "bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    }`}
                  title="List View"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-md transition-all ${viewMode === "grid"
                    ? "bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    }`}
                  title="Grid View (Manager's Wall)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                </button>
              </div>
              {/* <button
                onClick={() => setUseDemoData(!useDemoData)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${useDemoData
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-500/30'
                  : 'bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300'
                  }`}
                aria-label={useDemoData ? 'Disable demo mode' : 'Enable demo mode'}
              >
                <Database className="w-4 h-4" />
                <span className="text-sm">Demo {useDemoData ? 'ON' : 'OFF'}</span>
              </button> */}

              {/* <button
                onClick={() => setUseLiveUpdates((v) => !v)}
                disabled={useDemoData}
                title={useDemoData ? 'Live updates disabled while Demo mode is ON' : 'Toggle live updates'}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${useLiveUpdates && !useDemoData
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/30'
                  : 'bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300'
                  } ${useDemoData ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label={useLiveUpdates && !useDemoData ? 'Disable live updates' : 'Enable live updates'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 14.5V18h-2v-1.5A4.5 4.5 0 017.5 12H6v-2h1.5A4.5 4.5 0 0111 5.5V4h2v1.5A4.5 4.5 0 0116.5 10H18v2h-1.5A4.5 4.5 0 0113 16.5z" />
                </svg>
                <span className="text-sm">Live {useLiveUpdates && !useDemoData ? 'ON' : 'OFF'}</span>
              </button> */}
            </div>
          </div>
        </div>
      </div>

      {/* View Switcher Content */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sessionsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 animate-pulse h-64"></div>
            ))
          ) : sessions.length === 0 ? (
            <div className="col-span-full">
              <NoSessionsFound />
            </div>
          ) : (
            sessions.map((session) => {
              // Get the absolute latest screenshot if available
              const lastScreenshot = session.screenshots && session.screenshots.length > 0
                ? session.screenshots[session.screenshots.length - 1]
                : null;

              const isActive = !session.sessionEnd;

              return (
                <div
                  key={session._id}
                  onClick={() => setSelectedSession(session)}
                  className={`group relative bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden border-2 transition-all cursor-pointer hover:shadow-xl ${isActive ? 'border-green-500 dark:border-green-500' : 'border-transparent hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                >
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3 z-10">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold shadow-sm ${isActive
                      ? 'bg-green-500 text-white animate-pulse'
                      : 'bg-gray-600 text-gray-200'
                      }`}>
                      {isActive ? 'LIVE' : 'OFFLINE'}
                    </span>
                  </div>

                  {/* Screenshot Preview / Thumbnail */}
                  <div className="h-40 bg-gray-100 dark:bg-slate-900 w-full object-cover flex items-center justify-center overflow-hidden relative">
                    {lastScreenshot ? (
                      <img
                        src={`http://localhost:5000${lastScreenshot.url}`}
                        alt="Latest activity"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="text-gray-400 flex flex-col items-center">
                        <Activity size={32} className="mb-2 opacity-50" />
                        <span className="text-xs">No visual activity</span>
                      </div>
                    )}
                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                    {/* User Name Overlay */}
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <h3 className="font-bold text-lg truncate shadow-black drop-shadow-md">{session.userName}</h3>
                      <p className="text-xs text-gray-200 flex items-center gap-1">
                        <Clock size={10} />
                        {isActive ? 'Active now' : `Last seen ${new Date(session.sessionEnd).toLocaleTimeString()}`}
                      </p>
                    </div>

                    {/* Quick Action Overlay */}
                    {isActive && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 z-20">
                         <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTakeScreenshot(session.userId, session.userName);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transform hover:scale-110 transition-all"
                          title="Capture Screen Now"
                         >
                            <Camera size={24} />
                         </button>
                      </div>
                    )}
                  </div>

                  {/* Metrics Footer */}
                  <div className="p-4 grid grid-cols-2 gap-2 text-sm bg-white dark:bg-slate-800">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Working</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatDuration(session.workingTime)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Idle</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatDuration(session.idleTime)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* List View (Original) */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sessions Panel */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Sessions
                </h2>
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold">
                  {sessions.length}
                </span>
              </div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-slate-700 h-[calc(78vh-197px)] overflow-y-auto" aria-busy={sessionsLoading}>
              {sessionsLoading ? (
                <div className="p-6">
                  <TableSkeleton rows={3} columns={1} />
                </div>
              ) : sessions.length === 0 ? (
                <NoSessionsFound />
              ) : (
                sessions.map((session) => (
                  <button
                    key={session._id}
                    onClick={() => setSelectedSession(session)}
                    className="w-full text-left p-5 hover:bg-blue-50 dark:hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors duration-150"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <span className="font-semibold text-gray-900 dark:text-white text-base">{session.userName}</span>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                          <Clock size={14} />
                          {new Date(session.sessionStart).toLocaleTimeString()} - {session.sessionEnd ? new Date(session.sessionEnd).toLocaleTimeString() : 'Ongoing'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-semibold px-2.5 py-1 rounded-full ${session.sessionEnd
                          ? 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                          }`}>
                          {session.sessionEnd ? 'Ended' : 'Active'}
                        </div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white mt-2">
                          {formatDuration(session.workingTime || 0)}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <Clock size={14} className="text-green-600 dark:text-green-400" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">Work:</span>
                        <span className="font-medium">{formatDuration(session.workingTime || 0)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <Clock size={14} className="text-amber-600 dark:text-amber-400" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">Idle:</span>
                        <span className="font-medium">{formatDuration(session.idleTime || 0)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <Activity size={14} className="text-blue-600 dark:text-blue-400" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">Screenshots:</span>
                        <span className="font-medium">{session.screenshotCount || (session.screenshots?.length || 0)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <Coffee size={14} className="text-purple-600 dark:text-purple-400" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">Breaks:</span>
                        <span className="font-medium">{session.breaksTaken || (session.breaks?.length || 0)}</span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Activity Logs Panel */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Activity Logs
                </h2>
                <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-semibold">
                  {activityLogs.length}
                </span>
              </div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-slate-700 h-[calc(78vh-197px)] overflow-y-auto" aria-busy={logsLoading}>
              {logsLoading ? (
                <div className="p-6 flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                  <svg className="animate-spin h-5 w-5 text-blue-600 dark:text-sky-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  <span>Loading activity...</span>
                </div>
              ) : activityLogs.length === 0 ? (
                <NoDataFound />
              ) : (
                activityLogs.map((log) => (
                  <button
                    key={log._id}
                    type="button"
                    onClick={() => setSelectedLog(log)}
                    aria-label={`View activity from ${log.userId} at ${new Date(log.timestamp).toLocaleTimeString()}`}
                    className="w-full text-left p-5 hover:bg-indigo-50 dark:hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-colors duration-150"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-gray-900 dark:text-white text-base">
                        {log.userName}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold ${log.activityType === "active"
                          ? "bg-green-100 text-green-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                          : log.activityType === "idle"
                            ? "bg-yellow-100 text-yellow-700 dark:bg-amber-900/50 dark:text-amber-300"
                            : "bg-blue-100 text-blue-700 dark:bg-sky-900/50 dark:text-sky-300"
                          }`}
                      >
                        {log.activityType}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Clock size={14} />
                      {new Date(log.timestamp).toLocaleTimeString()} • {formatDuration((log.duration || 0) / 1000)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {selectedSession && (
        <Modal onClose={() => setSelectedSession(null)} title={`Session — ${new Date(selectedSession.sessionStart).toLocaleTimeString()}`}>
          <div className="space-y-6">
            {/* Header with Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${!selectedSession.sessionEnd ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedSession.userName}</h3>
              </div>
              
              {!selectedSession.sessionEnd && (
                <button
                  onClick={() => handleTakeScreenshot(selectedSession.userId, selectedSession.userName)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-md active:scale-95"
                >
                  <Camera size={18} />
                  <span>Capture Now</span>
                </button>
              )}
            </div>

            {/* Top Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
                <p className="text-xs text-gray-500">Working Time</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatDuration(selectedSession.workingTime)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
                <p className="text-xs text-gray-500">Idle Time</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatDuration(selectedSession.idleTime)}</p>
              </div>
            </div>

            {/* Activity Chart Section */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700">
              <h4 className="font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                <Activity size={16} className="text-blue-600" />
                Activity Timeline
              </h4>
              <div className="h-48 w-full">
                {selectedSession && (() => {
                  // Prepare data consistently for both Bar and Cells
                  const sessionLogs = activityLogs.filter(log => {
                    // Priority 1: Direct session ID match (most accurate)
                    const logSessId = log.sessionId && typeof log.sessionId === 'object' ? log.sessionId._id : log.sessionId;
                    if (logSessId && selectedSession._id && String(logSessId) === String(selectedSession._id)) {
                      return true;
                    }

                    // Priority 2: Time-range match (fallback)
                    const logTime = new Date(log.timestamp).getTime();
                    const start = new Date(selectedSession.sessionStart).getTime();
                    const end = selectedSession.sessionEnd
                      ? new Date(selectedSession.sessionEnd).getTime()
                      : Date.now();

                    return log.userId === selectedSession.userId && logTime >= start && logTime <= end;
                  });

                  // Process logs for chart
                  const chartData = sessionLogs.map(log => {
                    const durationMs = log.duration || 0;
                    return {
                      time: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      // For display, we want at least a sliver if duration is 0
                      durationSeconds: Math.max(durationMs / 1000, 30), 
                      actualDurationSeconds: durationMs / 1000,
                      type: log.activityType,
                      fullDate: log.timestamp
                    };
                  }).slice(-50);

                  if (chartData.length === 0) return <div className="h-full flex items-center justify-center text-gray-400">No activity data recorded</div>;

                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
                      >
                        <XAxis dataKey="time" fontSize={10} tickLine={false} axisLine={false} minTickGap={20} />
                        <YAxis
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          width={40}
                          label={{ value: 'Minutes', angle: -90, position: 'insideLeft', fontSize: 10, offset: 0 }}
                          tickFormatter={(val) => `${Math.floor(val / 60)}m`}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#f8fafc', borderRadius: '8px', fontSize: '12px' }}
                          itemStyle={{ color: '#f8fafc' }}
                          cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                          formatter={(value, name, props) => [
                            formatDuration(props.payload.actualDurationSeconds), 
                            props.payload.type === 'active' ? 'Working' : 'Idle'
                          ]}
                          labelFormatter={(label, payload) => {
                            if (payload && payload.length > 0) {
                              return new Date(payload[0].payload.fullDate).toLocaleTimeString();
                            }
                            return label;
                          }}
                        />
                        <Bar dataKey="durationSeconds" radius={[4, 4, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.type === 'active' ? '#10b981' : '#f59e0b'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
              <div className="flex justify-center gap-4 mt-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-gray-600 dark:text-gray-300">Active</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className="text-gray-600 dark:text-gray-300">Idle</span>
                </div>
              </div>
            </div>

            {/* Input Activity Stats (New) */}
            <div>
              <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Input Activity</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gray-50 dark:bg-slate-700 p-3 rounded-lg text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Key Presses</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedSession.activityMetrics?.keyPresses?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700 p-3 rounded-lg text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Mouse Clicks</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedSession.activityMetrics?.mouseClicks?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700 p-3 rounded-lg text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Scrolls</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedSession.activityMetrics?.mouseScrolls?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700 p-3 rounded-lg text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Movements</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedSession.activityMetrics?.mouseMovements?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Application Usage (New) */}
            {selectedSession.applications && selectedSession.applications.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 text-gray-900 dark:text-white flex items-center justify-between">
                  <span>Applications Used</span>
                  <span className="text-xs font-normal text-gray-500">
                    Tracked: {formatDuration(selectedSession.applications.reduce((sum, app) => sum + app.duration, 0))} / {formatDuration(selectedSession.workingTime)}
                  </span>
                </h4>
                <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg overflow-hidden shadow-sm">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-600 dark:text-gray-300 font-medium">
                      <tr>
                        <th className="px-4 py-3">Application</th>
                        <th className="px-4 py-3">Usage</th>
                        <th className="px-4 py-3 text-right">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                      {(() => {
                        const trackedAppDuration = selectedSession.applications.reduce((sum, app) => sum + app.duration, 0);
                        const totalReferenceDuration = Math.max(trackedAppDuration, selectedSession.workingTime) || 1;
                        
                        const sortedApps = [...selectedSession.applications].sort((a, b) => b.duration - a.duration);
                        
                        // Add an "Other/Unaccounted" entry if there's a significant gap
                        if (selectedSession.workingTime > trackedAppDuration + 5) {
                          sortedApps.push({
                            name: "Other / System",
                            duration: selectedSession.workingTime - trackedAppDuration,
                            lastActive: selectedSession.sessionEnd || new Date().toISOString(),
                            isUnaccounted: true
                          });
                        }

                        return sortedApps.map((app, idx) => {
                          const percentage = Math.round((app.duration / totalReferenceDuration) * 100);
                          return (
                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex flex-col">
                                  <span className={`font-semibold ${app.isUnaccounted ? 'text-gray-500 italic' : 'text-gray-900 dark:text-white'}`}>
                                    {app.name}
                                  </span>
                                  {!app.isUnaccounted && (
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 capitalize">
                                      Last active: {new Date(app.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 w-1/3">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${app.isUnaccounted ? 'bg-gray-300 dark:bg-slate-600' : 'bg-blue-500 dark:bg-blue-400'}`} 
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 w-8 text-right">
                                    {percentage}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-200">
                                {formatDuration(app.duration)}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Screenshots */}
            <div>
              <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Screenshots</h4>
              <ScreenshotViewer images={selectedSession.screenshots || []} />
            </div>

            {/* Breaks */}
            <div>
              <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Break Details</h4>
              {selectedSession.breaks && selectedSession.breaks.length > 0 ? (
                <ul className="divide-y divide-gray-100 dark:divide-slate-700 rounded-lg overflow-hidden border dark:border-slate-700">
                  {selectedSession.breaks.map((b, i) => (
                    <li key={i} className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Break {i + 1}
                          {b.type && <span className="ml-2 text-xs font-normal text-gray-500">({b.type})</span>}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(b.start).toLocaleString()} — {new Date(b.end).toLocaleString()}</p>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">{formatDuration((new Date(b.end) - new Date(b.start)) / 1000)}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No breaks recorded for this session.</p>
              )}
            </div>
          </div>
        </Modal>
      )
      }

      {
        selectedLog && (
          <Modal onClose={() => setSelectedLog(null)} title={`Activity — ${new Date(selectedLog.timestamp).toLocaleTimeString()}`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">User</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedLog.userId}</p>
                </div>
                <div>
                  <span className={`text-xs px-2 py-1 rounded font-semibold ${selectedLog.activityType === 'active' ? 'bg-green-100 text-green-800 dark:bg-emerald-900 dark:text-emerald-200' : selectedLog.activityType === 'idle' ? 'bg-yellow-100 text-yellow-800 dark:bg-amber-900 dark:text-amber-200' : 'bg-blue-100 text-blue-800 dark:bg-sky-900 dark:text-sky-200'}`}>
                    {selectedLog.activityType}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
                <div>
                  <p className="text-xs text-gray-500">Timestamp</p>
                  <p className="text-sm text-gray-900 dark:text-white">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Duration</p>
                  <p className="text-sm text-gray-900 dark:text-white">{formatDuration((selectedLog.duration || 0) / 1000)}</p>
                </div>
              </div>

              {selectedLog.extraDetails && (
                <div>
                  <p className="text-xs text-gray-500">Details</p>
                  <p className="text-sm text-gray-700 dark:text-gray-200">{selectedLog.extraDetails}</p>
                </div>
              )}
            </div>
          </Modal>
        )
      }

    </div >
  );
}
