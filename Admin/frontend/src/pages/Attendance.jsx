import React, { useState, useEffect } from "react";
import { 
  Clock, CheckCircle, XCircle, User, MapPin, Camera, RefreshCw, 
  AlertCircle, UserCheck, UserX, Calendar, Timer, Activity, Eye,
  ChevronLeft, ChevronRight, Search, Filter, ArrowRight, LogIn, LogOut,
  ChevronDown, Download, TrendingUp
} from "lucide-react";
import { 
  getAllUsers, 
  getAttendanceToday,
  getAttendanceByDateRange,
  getClockOutRequests,
  processClockOutRequest,
  getDailyReports,
  captureScreenshot
} from "../services/api";
import { socket } from "../services/socket";
import { useAdmin } from "../context/AdminContext";

export default function Attendance() {
  const { notify } = useAdmin();
  const [users, setUsers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [clockOutRequests, setClockOutRequests] = useState([]);
  const [sessions, setSessions] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [capturingScreenshot, setCapturingScreenshot] = useState(null);
  
  // Filters
  const [mainTab, setMainTab] = useState("employees"); // employees or requests
  const [statusFilter, setStatusFilter] = useState("all"); // all, present, absent, completed, delayed
  const [searchQuery, setSearchQuery] = useState("");
  const [showClockOutRequests, setShowClockOutRequests] = useState(false);
  const [expandedTimeline, setExpandedTimeline] = useState(null);
  
  // Date filters
  const [dateFilterType, setDateFilterType] = useState("today"); // today, custom, week, month, year
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedUserId, setSelectedUserId] = useState(""); // For user-specific filter
  
  // Pagination for clock-out requests
  const [requestPage, setRequestPage] = useState(1);
  const [requestsPerPage] = useState(5);

  useEffect(() => {
    fetchAllData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAllData(true);
    }, 30000);

    // Socket listeners for real-time updates
    const handleAttendanceUpdate = (data) => {
      console.log('socket event: attendance-update', data);
      fetchAllData(true);
    };

    const handleClockOutRequest = (data) => {
      console.log('socket event: clock-out-request', data);
      fetchAllData(true);
    };
    
    socket.on('attendance-update', handleAttendanceUpdate);
    socket.on('clock-out-request', handleClockOutRequest);
    
    return () => {
      clearInterval(interval);
      socket.off('attendance-update', handleAttendanceUpdate);
      socket.off('clock-out-request', handleClockOutRequest);
    };
  }, [dateFilterType, startDate, endDate, selectedUserId]);

  // Helper function to calculate date ranges
  const getDateRange = () => {
    const today = new Date();
    
    switch (dateFilterType) {
      case "today":
        const todayStr = today.toISOString().split('T')[0];
        // Fetch wider window (-1 to +1 days) to account for timezone differences
        // between Server (UTC) and Client (Local). We filter precisely in UI.
        const d_start = new Date(today); d_start.setDate(today.getDate() - 1);
        const d_end = new Date(today); d_end.setDate(today.getDate() + 1);
        return { 
          startDate: d_start.toISOString().split('T')[0], 
          endDate: d_end.toISOString().split('T')[0] 
        };
        
      case "week":
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
        return {
          startDate: weekStart.toISOString().split('T')[0],
          endDate: weekEnd.toISOString().split('T')[0]
        };
        
      case "month":
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return {
          startDate: monthStart.toISOString().split('T')[0],
          endDate: monthEnd.toISOString().split('T')[0]
        };
        
      case "year":
        const yearStart = new Date(today.getFullYear(), 0, 1);
        const yearEnd = new Date(today.getFullYear(), 11, 31);
        return {
          startDate: yearStart.toISOString().split('T')[0],
          endDate: yearEnd.toISOString().split('T')[0]
        };
        
      case "custom":
        return { startDate, endDate };
        
      default:
        return { startDate, endDate };
    }
  };

  const fetchAllData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      
      const dateRange = getDateRange();
      
      // Fetch all data in parallel
      const [usersRes, attendanceRes, clockOutRes] = await Promise.all([
        getAllUsers(),
        getAttendanceByDateRange({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          userId: selectedUserId || undefined
        }),
        getClockOutRequests({ status: 'pending' })
      ]);
      
      const userData = usersRes.data.data || [];
      const attendanceData = attendanceRes.data.data || [];
      const attendanceSummaryData = attendanceRes.data.summary || [];
      const clockOutData = clockOutRes.data.data || [];
      
      setUsers(userData);
      setAttendance(attendanceData);
      setAttendanceSummary(attendanceSummaryData);
      setClockOutRequests(clockOutData);
      
      // Fetch sessions for all users within date range
      const sessionPromises = userData.map(user => 
        getDailyReports(user.id, dateRange.startDate)
          .then(res => ({ userId: user.id, sessions: res.data.data || [] }))
          .catch(() => ({ userId: user.id, sessions: [] }))
      );
      
      const sessionsData = await Promise.all(sessionPromises);
      const sessionsMap = {};
      sessionsData.forEach(({ userId, sessions }) => {
        if (sessions.length > 0) {
          // Calculate total work time and idle time
          const totalWorkTime = sessions.reduce((sum, s) => sum + (s.workingTime || 0), 0);
          const totalIdleTime = sessions.reduce((sum, s) => sum + (s.idleTime || 0), 0);
          sessionsMap[userId] = { workingTime: totalWorkTime, idleTime: totalIdleTime };
        }
      });
      setSessions(sessionsMap);
      
      setError("");
    } catch (err) {
      console.error("Failed to fetch attendance data:", err);
      setError("Failed to load attendance data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleProcessClockOutRequest = async (requestId, status, userId) => {
    try {
      setProcessingId(requestId);
      await processClockOutRequest(requestId, status);
      
      // Refresh data after processing
      await fetchAllData(true);
      
      notify(`Clock-out request ${status === 'approved' ? 'approved' : 'rejected'} successfully`, 'success');
    } catch (err) {
      notify("Failed to process request: " + (err.response?.data?.error || err.message), 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCaptureScreenshot = async (userId, userName) => {
    try {
      setCapturingScreenshot(userId);
      await captureScreenshot(userId);
      notify(`Screenshot captured for ${userName}`, 'success');
    } catch (err) {
      notify("Failed to capture screenshot: " + (err.response?.data?.error || err.message), 'error');
    } finally {
      setCapturingScreenshot(null);
    }
  };

  const formatTime = (ms) => {
    if (!ms) return "0h 0m";
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getAttendanceStatus = (userId) => {
    // Find the daily record for this user
    // Note: With the new model, we expect one document per day per user
    const dailyRecord = attendance.find(a => {
      const isUser = String(a.userId) === String(userId);
      if (dateFilterType === 'today') {
        // Compare string dates YYYY-MM-DD
        const todayStr = new Date().toISOString().split('T')[0];
        // Ensure we match local date if needed, but backend is consistent with YYYY-MM-DD string
        // If a.date is available use it, otherwise fallback to timestamp check
        if (a.date) {
             return isUser && a.date === todayStr;
        }
        // Fallback
        const recordDate = new Date(a.timestamp);
        const todayDate = new Date();
        return isUser && recordDate.toDateString() === todayDate.toDateString();
      }
      return isUser;
    });
    // console.log("🚀 ~ getAttendanceStatus ~ dailyRecord:", dailyRecord)
    
    // If no attendance records, user is absent
    if (!dailyRecord) return { 
      status: 'absent', 
      time: null,
      timeline: [],
      everClockedIn: false
    };
    
    // Build timeline from sessions
    const sessions = dailyRecord.clockIN_out?.attend || [];
    const timeline = [];
    
    sessions.forEach(session => {
        // Add Clock In Event
        if (session.clockIn && session.clockIn.time) {
            timeline.push({
                type: 'clock-in',
                timestamp: session.clockIn.time,
                location: session.clockIn.location,
                isDelayed: dailyRecord.isDelayed, // Inherit delay status
                delayMinutes: dailyRecord.delayMinutes
            });
        }
        // Add Clock Out Event
        if (session.clockOut && session.clockOut.time) {
            timeline.push({
                type: 'clock-out',
                timestamp: session.clockOut.time,
                location: session.clockOut.location,
                workDuration: session.workDuration
            });
        }
    });
    
    // Sort timeline by time
    timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Determine status from backend document
    let status = 'absent';
    const backendStatus = dailyRecord.status;
    
    if (backendStatus === 'Present') status = 'present';
    else if (backendStatus === 'Completed Work') status = 'completed';
    else if (backendStatus === 'Partially Completed') status = 'partially_completed';
    else status = 'absent';
    
    return {
      status,
      time: timeline.length > 0 ? timeline[timeline.length - 1].timestamp : null,
      location: timeline.length > 0 ? timeline[timeline.length - 1].location : null,
      timeline,
      everClockedIn: true,
      totalWorkDuration: dailyRecord.totalWorkDuration || 0,
      overtime: dailyRecord.overtime || 0,
      lateBy: dailyRecord.delayMinutes || 0,
      isDelayed: dailyRecord.isDelayed
    };
  };

  const getUserClockOutRequest = (userId) => {
    return clockOutRequests.find(req => req.userId === userId && req.status === 'pending');
  };

  const getAttendanceTimeline = (userId) => {
     // Reuse logic from getAttendanceStatus to ensure consistency
     const status = getAttendanceStatus(userId);
     return status.timeline || [];
  };

  // Filter users based on status filter and search query
  const filteredUsers = users.filter(user => {
    const attendanceStatus = getAttendanceStatus(user.id);
    const status = attendanceStatus.status;
    const timeline = attendanceStatus.timeline || [];
    const isDelayed = timeline.some(event => event.type === 'clock-in' && event.isDelayed);
    
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'present' && status === 'present') ||
      (statusFilter === 'completed' && status === 'completed') ||
      (statusFilter === 'partially_completed' && status === 'partially_completed') ||
      (statusFilter === 'absent' && status === 'absent') ||
      (statusFilter === 'delayed' && isDelayed);
    
    const matchesSearch = 
      searchQuery === '' ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const presentCount = users.filter(u => getAttendanceStatus(u.id).status === 'present').length;
  const completedCount = users.filter(u => getAttendanceStatus(u.id).status === 'completed').length;
  const partiallyCompletedCount = users.filter(u => getAttendanceStatus(u.id).status === 'partially_completed').length;
  const absentCount = users.filter(u => getAttendanceStatus(u.id).status === 'absent').length;
  
  // Calculate delayed clock-ins count
  const delayedClockInsCount = users.filter(u => {
    const timeline = getAttendanceStatus(u.id).timeline || [];
    return timeline.some(event => event.type === 'clock-in' && event.isDelayed);
  }).length;

  // Export attendance data to CSV
  const handleExportData = () => {
    try {
      // Prepare CSV headers
      const headers = ['Date', 'User', 'Email', 'Clock In', 'Clock Out', 'Status', 'Delayed', 'Delay (min)', 'Location'];
      
      // Prepare CSV rows
      const rows = filteredUsers.map(user => {
        const status = getAttendanceStatus(user.id);
        const timeline = status.timeline || [];
        
        // Find first clock-in and last clock-out
        const clockIn = timeline.find(e => e.type === 'clock-in');
        const clockOut = timeline.findLast(e => e.type === 'clock-out');
        
        return [
          new Date().toLocaleDateString(),
          user.username || '',
          user.email || '',
          clockIn ? formatTimestamp(clockIn.timestamp) : '-',
          clockOut ? formatTimestamp(clockOut.timestamp) : '-',
          status.status,
          clockIn?.isDelayed ? 'Yes' : 'No',
          clockIn?.delayMinutes || 0,
          clockIn?.location || '-'
        ];
      });
      
      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const { startDate: start, endDate: end } = getDateRange();
      const filename = `attendance_${start}_to_${end}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      notify(`Exported ${rows.length} attendance records`, 'success');
    } catch (err) {
      notify('Failed to export data: ' + err.message, 'error');
    }
  };

  // Paginate clock-out requests
  const paginatedRequests = clockOutRequests.slice(
    (requestPage - 1) * requestsPerPage,
    requestPage * requestsPerPage
  );
  const totalRequestPages = Math.ceil(clockOutRequests.length / requestsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 min-h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">
            Attendance Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Real-time employee attendance tracking and monitoring
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Download size={18} />
            Export CSV
          </button>
          <button
            onClick={() => fetchAllData()}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Filter Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Time Period
            </label>
            <select
              value={dateFilterType}
              onChange={(e) => setDateFilterType(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Start Date (for custom range) */}
          {dateFilterType === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>
            </>
          )}

          {/* User Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by User
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            >
              <option value="">All Users</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.username} ({user.email})
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Display */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Range
            </label>
            <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <Calendar size={16} />
              <span className="font-medium">
                {getDateRange().startDate === getDateRange().endDate 
                  ? getDateRange().startDate
                  : `${getDateRange().startDate} to ${getDateRange().endDate}`}
              </span>
            </div>
          </div>
        </div>

        {/* Summary Stats for Selected Range */}
        {/* {attendanceSummary.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {attendance.length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Records
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-green-600 dark:text-green-400">
                  {attendance.filter(a => a.type === 'clock-in').length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Clock-Ins
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-red-600 dark:text-red-400">
                  {attendance.filter(a => a.type === 'clock-out').length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Clock-Outs
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-orange-600 dark:text-orange-400">
                  {attendance.filter(a => a.isDelayed).length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Delayed
                </p>
              </div>
            </div>
          </div>
        )} */}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-600" size={20} />
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Total Employees</p>
              <p className="text-3xl font-black text-gray-900 dark:text-white mt-2">{users.length}</p>
            </div>
            <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <User className="text-blue-600 dark:text-blue-400" size={28} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Present</p>
              <p className="text-3xl font-black text-green-600 dark:text-green-400 mt-2">{presentCount}</p>
            </div>
            <div className="w-14 h-14 bg-green-50 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <UserCheck className="text-green-600 dark:text-green-400" size={28} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Completed Work</p>
              <p className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-2">{completedCount}</p>
            </div>
            <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <CheckCircle className="text-blue-600 dark:text-blue-400" size={28} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Partially Completed Today's Session</p>
              <p className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">{partiallyCompletedCount}</p>
            </div>
            <div className="w-14 h-14 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
              <Activity className="text-amber-600 dark:text-amber-400" size={28} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Absent</p>
              <p className="text-3xl font-black text-red-600 dark:text-red-400 mt-2">{absentCount}</p>
            </div>
            <div className="w-14 h-14 bg-red-50 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
              <UserX className="text-red-600 dark:text-red-400" size={28} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Clock-Out Requests</p>
              <p className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">{clockOutRequests.length}</p>
            </div>
            <div className="w-14 h-14 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
              <Clock className="text-amber-600 dark:text-amber-400" size={28} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Delayed Clock-Ins</p>
              <p className="text-3xl font-black text-orange-600 dark:text-orange-400 mt-2">{delayedClockInsCount}</p>
            </div>
            <div className="w-14 h-14 bg-orange-50 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
              <AlertCircle className="text-orange-600 dark:text-orange-400" size={28} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-slate-700">
        <button
          onClick={() => setMainTab('employees')}
          className={`px-6 py-3 font-bold text-sm uppercase tracking-wider transition relative ${
            mainTab === 'employees'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <User size={18} />
            Employees
          </div>
          {mainTab === 'employees' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
          )}
        </button>
        <button
          onClick={() => setMainTab('requests')}
          className={`px-6 py-3 font-bold text-sm uppercase tracking-wider transition relative ${
            mainTab === 'requests'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock size={18} />
            Clock-Out Requests
            {clockOutRequests.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-amber-600 text-white text-xs font-bold rounded-full">
                {clockOutRequests.length}
              </span>
            )}
          </div>
          {mainTab === 'requests' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600 dark:bg-amber-400" />
          )}
        </button>
      </div>

      {/* Employees Tab */}
      {mainTab === 'employees' && (
        <>
        {/* Filters and Search */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Status Filter Dropdown */}
            <div className="flex gap-4 items-center">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Status:
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-medium min-w-[200px]"
              >
                <option value="all">All Employees ({users.length})</option>
                <option value="present">Present ({presentCount})</option>
                <option value="completed">Completed Work ({completedCount})</option>
                <option value="partially_completed">Partially Completed</option>
                <option value="absent">Absent ({absentCount})</option>
                <option value="delayed">Delayed Clock-In ({delayedClockInsCount})</option>
              </select>
              
              {/* Status Badge */}
              {statusFilter !== 'all' && (
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  statusFilter === 'present' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                  statusFilter === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                  statusFilter === 'partially_completed' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                  statusFilter === 'absent' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                }`}>
                  {filteredUsers.length} {statusFilter === 'delayed' ? 'delayed' : statusFilter.replace('_', ' ')}
                </span>
              )}
            </div>

            {/* Search */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Employee List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16">
            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
              <User className="text-gray-400" size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Employees Found</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Try adjusting your filter or search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b dark:border-slate-700">
                <tr className="text-left text-xs font-black text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Timeline</th>
                  <th className="px-6 py-4">Work Hours</th>
                  <th className="px-6 py-4">Idle Time</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-700">
                {filteredUsers.map((user) => {
                  const attendanceInfo = getAttendanceStatus(user.id);
                  const session = sessions[user.id] || { workingTime: 0, idleTime: 0 };
                  const hasClockOutRequest = getUserClockOutRequest(user.id);
                  const isTimelineExpanded = expandedTimeline === user.id;

                  return (
                    <React.Fragment key={user.id}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                              {user.username?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white">{user.username}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2">
                            {attendanceInfo.status === 'present' && (
                              <span className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-bold w-fit">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                Present
                              </span>
                            )}
                            {attendanceInfo.status === 'completed' && (
                              <span className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-bold w-fit">
                                <CheckCircle size={14} />
                                Completed Today's Session
                              </span>
                            )}
                            {attendanceInfo.status === 'partially_completed' && (
                              <span className="flex items-center gap-2 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-bold w-fit">
                                <Clock size={14} />
                                Partial Completed Today Session
                              </span>
                            )}
                            {attendanceInfo.status === 'absent' && (
                              <span className="flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-bold w-fit">
                                <UserX size={14} />
                                Absent
                              </span>
                            )}

                            {/* Delay info */}
                            {attendanceInfo.isDelayed && (
                              <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-[10px] font-bold border border-red-100 w-fit">
                                ⚠️ Late {attendanceInfo.lateBy}m
                              </span>
                            )}
                            
                            {/* Pending Request Badge */}
                            {hasClockOutRequest && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-[10px] font-bold border border-purple-200 w-fit animate-pulse">
                                Requesting Clock Out
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {attendanceInfo.timeline && attendanceInfo.timeline.length > 0 ? (
                            <div>
                              <button
                                onClick={() => setExpandedTimeline(isTimelineExpanded ? null : user.id)}
                                className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                <ChevronDown 
                                  size={16} 
                                  className={`transition-transform ${isTimelineExpanded ? 'rotate-180' : ''}`}
                                />
                                {Math.ceil(attendanceInfo.timeline.length / 2)} Session{Math.ceil(attendanceInfo.timeline.length / 2) !== 1 ? 's' : ''}
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">No Entries</span>
                          )}
                        </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                           <div className="flex items-center gap-2">
                              <Timer className="text-blue-500" size={16} />
                              <span className="font-bold text-gray-900 dark:text-white">
                                {formatTime(attendanceInfo.totalWorkDuration || session.workingTime || 0)}
                              </span>
                           </div>
                           {attendanceInfo.overtime > 0 && (
                            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                <Plus size={10} />
                                <span>{formatTime(attendanceInfo.overtime)} OT</span>
                            </div>
                           )}
                           {attendanceInfo.totalWorkDuration < (8 * 60 * 60 * 1000) && attendanceInfo.status !== 'absent' && (
                            <div className="text-xs text-amber-600 dark:text-amber-400">
                                Need {formatTime((8 * 60 * 60 * 1000) - (attendanceInfo.totalWorkDuration || 0))} more
                            </div>
                           )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Activity className="text-amber-500" size={16} />
                          <span className="font-bold text-gray-900 dark:text-white">
                            {formatTime(session.idleTime)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {attendanceInfo.location?.address ? (
                          <div className="flex items-start gap-2 max-w-[200px]">
                            <MapPin className="text-gray-400 flex-shrink-0 mt-0.5" size={14} />
                            <div className="flex flex-col">
                              <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${attendanceInfo.location.latitude},${attendanceInfo.location.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline text-xs text-gray-600 dark:text-gray-400 line-clamp-2"
                                title="View on Google Maps"
                              >
                                {attendanceInfo.location.address}
                              </a>
                              {attendanceInfo.location.accuracy && (
                                <span className={`text-[9px] font-medium ${attendanceInfo.location.accuracy < 100 ? 'text-green-500' : 'text-amber-500'}`}>
                                  +/- {attendanceInfo.location.accuracy.toFixed(0)}m accuracy
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleCaptureScreenshot(user.id, user.username)}
                            disabled={capturingScreenshot === user.id || attendanceInfo.status !== 'present'}
                            className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Capture Screenshot"
                          >
                            <Camera size={16} />
                          </button>
                          <button
                            onClick={() => window.open(`#/tracking?userId=${user.id}`, '_blank')}
                            className="p-2 bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition"
                            title="View Tracking Details"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expandable Timeline Row */}
                    {isTimelineExpanded && attendanceInfo.timeline && attendanceInfo.timeline.length > 0 && (
                      <tr className="bg-slate-50 dark:bg-slate-900/50">
                        <td colSpan="7" className="px-6 py-4">
                          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700 shadow-inner">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Activity size={16} className="text-blue-600" />
                                    Detailed Activity Log
                                    </h4>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Total Work: {formatTime(attendanceInfo.totalWorkDuration || 0)} 
                                        {attendanceInfo.overtime > 0 && ` • Overtime: ${formatTime(attendanceInfo.overtime)}`}
                                    </p>
                                </div>
                                <div className="text-right text-xs text-gray-400">
                                    {new Date().toLocaleDateString()}
                                </div>
                            </div>

                            <div className="relative">
                              {/* Timeline vertical line */}
                              <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-slate-700"></div>
                              
                              {/* Timeline events grouped by session logic */}
                              <div className="space-y-6">
                                {attendanceInfo.timeline.map((event, index) => {
                                  const isLast = index === attendanceInfo.timeline.length - 1;
                                  
                                  // Determine visual style based on event type
                                  const isClockIn = event.type === 'clock-in';
                                  const dotGradient = isClockIn 
                                    ? 'from-green-500 to-emerald-600'
                                    : 'from-orange-500 to-red-600';
                                  
                                  return (
                                  <div key={index} className="relative flex items-center gap-4 pl-10 group">
                                    {/* Timeline Dot */}
                                    <div className={`absolute left-0 w-8 h-8 rounded-full bg-gradient-to-br ${dotGradient} flex items-center justify-center text-white shadow-md z-10 ring-4 ring-white dark:ring-slate-800`}>
                                      {isClockIn ? <LogIn size={14} /> : <LogOut size={14} />}
                                    </div>
                                    
                                    {/* Content Card */}
                                    <div className="flex-1 bg-white dark:bg-slate-700/50 border border-gray-100 dark:border-slate-600 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow flex justify-between items-center">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold text-sm ${isClockIn ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                                    {isClockIn ? 'Started Session' : 'Ended Session'}
                                                </span>
                                                <span className="text-xs text-gray-400">• {formatTimestamp(event.timestamp)}</span>
                                            </div>
                                            
                                            {event.location?.address && (
                                                <div className="flex flex-col gap-0.5 mt-1">
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                        <MapPin size={12} />
                                                        <a 
                                                            href={`https://www.google.com/maps/search/?api=1&query=${event.location.latitude},${event.location.longitude}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="hover:underline truncate max-w-[300px]"
                                                            title="View on Google Maps"
                                                        >
                                                            {event.location.address}
                                                        </a>
                                                    </div>
                                                    {event.location.accuracy && (
                                                        <span className={`text-[9px] pl-4.5 ${event.location.accuracy < 100 ? 'text-green-500' : 'text-amber-500'}`}>
                                                            +/- {event.location.accuracy.toFixed(0)}m accuracy
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Clock-In specific badges */}
                                            {isClockIn && (
                                                <div className="flex gap-2 mt-2">
                                                    {event.isDelayed ? (
                                                        <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded text-[10px] font-bold">
                                                            Late ({event.delayMinutes}m)
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 bg-green-50 text-green-600 border border-green-100 rounded text-[10px] font-bold">
                                                            On Time
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Duration Display on Clock-Out */}
                                        {!isClockIn && event.workDuration && (
                                            <div className="text-right">
                                                <div className="text-[10px] text-gray-400 uppercase tracking-wide">Session Duration</div>
                                                <div className="font-mono font-bold text-gray-700 dark:text-gray-200">
                                                    {formatTime(event.workDuration)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                  </div>
                                )})}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        </div>
        </>
      )}

      {/* Clock-Out Requests Tab */}
      {mainTab === 'requests' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
          {clockOutRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                <Clock className="text-gray-400" size={40} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Pending Requests</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">There are no clock-out requests to review at this time.</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
                  <Clock className="text-white" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white">Pending Clock-Out Requests</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Review and approve/reject early clock-out requests</p>
                </div>
              </div>

              <div className="space-y-3">
                {paginatedRequests.map((request) => (
                  <div key={request._id} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 border border-gray-200 dark:border-slate-600">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{request.userName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Requested: {new Date(request.requestTime).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Clock-in:</p>
                        <p className="font-bold text-gray-900 dark:text-white">
                          {formatTimestamp(request.clockInTime)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Working Time:</p>
                        <p className="font-bold text-green-600">{formatTime(request.workingTime)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Reason:</p>
                        <p className="text-sm italic text-gray-700 dark:text-gray-300 line-clamp-2">"{request.reason}"</p>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleProcessClockOutRequest(request._id, 'approved', request.userId)}
                          disabled={processingId === request._id}
                          className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 text-sm"
                        >
                          <CheckCircle size={16} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleProcessClockOutRequest(request._id, 'rejected', request.userId)}
                          disabled={processingId === request._id}
                          className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 text-sm"
                        >
                          <XCircle size={16} />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Pagination for requests */}
                {totalRequestPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                      onClick={() => setRequestPage(p => Math.max(1, p - 1))}
                      disabled={requestPage === 1}
                      className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Page {requestPage} of {totalRequestPages}
                    </span>
                    <button
                      onClick={() => setRequestPage(p => Math.min(totalRequestPages, p + 1))}
                      disabled={requestPage === totalRequestPages}
                      className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
