import React, { createContext, useState, useCallback, useEffect, useRef } from "react";
import { 
  Users, 
  Clock, 
  Layers, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Calendar as CalendarIcon,
  ArrowRight,
  TrendingUp,
  Award,
  Zap,
  LayoutDashboard,
  User,
  Settings,
  Bell,
  Search,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Calendar
} from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { getUserAttendance, getUserProductivity, getLeaveBalance } from "../../services/api";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { socket, emitMessage } from "../../services/socket";

// Helper to format milliseconds to HH:MM:SS
const formatDuration = (ms) => {
  if (!ms && ms !== 0) return "00:00:00";
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export default function UserDashboard() {
  const { admin: user } = useAdmin();
  const [attendanceData, setAttendanceData] = useState([]);
  const [productivity, setProductivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [liveTracking, setLiveTracking] = useState({
    workingTime: 0,
    idleTime: 0,
    onBreak: false,
    breakInProgress: false,
    onBreak: false,
    breakInProgress: false,
    isIdle: false,
    isClockedIn: false,
    isTrackingActive: false
  });
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [socketConnected, setSocketConnected] = useState(socket.connected);
  const [leaveBalance, setLeaveBalance] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Socket listener for live updates from tracker app
    const handleTrackingUpdate = (data) => {
      // Normalize our local user identifiers
      const myId = String(user?.id || user?._id || '').toLowerCase();
      const myName = String(user?.username || user?.userName || '').toLowerCase();
      
      // Normalize incoming data identifiers
      const incomingId = String(data.userId || '').toLowerCase();
      const incomingName = String(data.userName || '').toLowerCase();
      
      // Match on ID (primary) or Username (fallback) to be extremely robust
      const isMatch = (incomingId && incomingId === myId) || 
                      (incomingName && myName && incomingName === myName);
      
      if (isMatch) {
        setLiveTracking({
          ...data,
          lastUpdate: Date.now()
        });
      }
    };

    socket.on('tracking-update', handleTrackingUpdate);

    return () => {
      clearInterval(timer);
      socket.off('tracking-update', handleTrackingUpdate);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Calculate date range slightly wider to cover padding days in the 6-row grid
        const firstDay = new Date(selectedYear, selectedMonth, 1);
        const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
        
        // Subtract 7 days from start and add 7 days to end to be safe
        const fetchStart = new Date(firstDay);
        fetchStart.setDate(fetchStart.getDate() - 7);
        const fetchEnd = new Date(lastDay);
        fetchEnd.setDate(fetchEnd.getDate() + 7);

        const startDate = fetchStart.toISOString().split('T')[0];
        const endDate = fetchEnd.toISOString().split('T')[0];

        const [attendanceRes, productivityRes, leaveRes] = await Promise.all([
          getUserAttendance(user.id || user._id, { startDate, endDate }),
          getUserProductivity(user.id || user._id),
          getLeaveBalance()
        ]);
        
        setAttendanceData(attendanceRes.data?.data || []);
        setProductivity(productivityRes.data?.data || null);
        setLeaveBalance(leaveRes.data?.data || null);
      } catch (error) {
        console.error("Error fetching user dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user, selectedMonth, selectedYear]);

  const handleClockIn = () => {
    // Send remote clock-in command
    const userId = user?.id || user?._id;
    if (userId) {
      emitMessage('remote-clock-in', { userId }, 'project4', userId);
    }
  };

  const handleBreakToggle = () => {
    const userId = user?.id || user?._id;
    if (!userId) return;

    if (liveTracking.onBreak) {
      emitMessage('remote-break-stop', { userId }, 'project4', userId);
    } else {
      emitMessage('remote-break-start', { userId, duration: 15 }, 'project4', userId);
    }
  };

  const handleClockOut = () => {
    // Send remote clock-out command
    const userId = user?.id || user?._id;
    if (userId) {
      if (window.confirm("Are you sure you want to clock out? This will stop tracking in the app.")) {
        emitMessage('remote-clock-out', { userId }, 'project4', userId);
      }
    }
  };

  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  // Helper to generate the full 42-day calendar grid (6 rows x 7 days)
  const generateCalendarDays = () => {
    const totalDays = 42;
    const days = [];
    
    const firstDayIdx = getFirstDayOfMonth(selectedMonth, selectedYear);
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
    
    // Previous month days
    const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    const daysInPrevMonth = getDaysInMonth(prevMonth, prevYear);
    
    for (let i = firstDayIdx - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        month: prevMonth,
        year: prevYear,
        isCurrentMonth: false
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        month: selectedMonth,
        year: selectedYear,
        isCurrentMonth: true
      });
    }
    
    // Next month days
    const nextMonth = selectedMonth === 11 ? 0 : selectedMonth + 1;
    const nextYear = selectedMonth === 11 ? selectedYear + 1 : selectedYear;
    const remainingDays = totalDays - days.length;
    
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        month: nextMonth,
        year: nextYear,
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  const getAttendanceForDate = (day, month, year) => {
    const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return attendanceData.find(item => item.date === dateStr);
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handlePrevYear = () => setSelectedYear(selectedYear - 1);
  const handleNextYear = () => setSelectedYear(selectedYear + 1);

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  // Calculate attendance summary from real data
  const attendanceSummary = {
    present: attendanceData.filter(r => r.status === 'Present' || r.status === 'Completed Work').length,
    lateIn: attendanceData.filter(r => r.isDelayed).length,
    absent: attendanceData.filter(r => r.status === 'Absent').length,
    partial: attendanceData.filter(r => r.status === 'Partially Completed').length
  };

  const holidays = [
    { title: "New Year", date: "01 Jan, 2026", day: "Thursday", color: "blue" },
    { title: "Republic Day", date: "26 Jan, 2026", day: "Monday", color: "blue" },
    { title: "Independence Day", date: "15 Aug, 2026", day: "Saturday", color: "orange" },
    { title: "Gandhi Jayanti", date: "02 Oct, 2026", day: "Friday", color: "purple" },
    { title: "Gandhi Jayanti", date: "02 Oct, 2026", day: "Friday", color: "purple" },
  ];



  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans p-6 lg:p-10">
      {/* Header with Socket Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 rotate-3 transform transition-transform hover:rotate-0">
            <LayoutDashboard size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic leading-none">User Panel</h1>
            <div className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2 flex items-center gap-2">
              Precision Workspace Synchronization
              {socketConnected ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 text-[8px] font-black border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> SYSTEM ONLINE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-500 text-[8px] font-black border border-rose-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> RECONNECTING...
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Current Session</p>
            <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums leading-none uppercase italic">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
            </p>
          </div>
          <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block"></div>
          <Button variant="outline" className="rounded-2xl h-14 px-6 border-slate-200 dark:border-slate-700">
            <Settings size={20} className="text-slate-500" />
          </Button>
          <div className="relative">
            <Button variant="primary" className="rounded-2xl h-14 w-14 p-0 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20">
              <Bell size={20} />
            </Button>
            <span className="absolute top-3 right-3 w-3 h-3 bg-rose-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-premium border border-white dark:border-slate-700">
            <div className="h-32 bg-blue-600/10 dark:bg-blue-600/5 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent"></div>
            </div>
            <div className="px-8 pb-8 -mt-16 relative">
              <div className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-700 mx-auto overflow-hidden bg-slate-100 mb-4 shadow-lg">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600">
                    <User size={40} />
                  </div>
                )}
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1 uppercase tracking-tight italic">
                  {user?.username || "Alyona Kumar"}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mb-8">
                  {user?.role === 'user' ? 'Web Developer' : user?.role || 'User'}
                </p>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-50 dark:border-slate-700/50">
                <div className="flex items-center gap-3 text-slate-400 mb-2">
                  <Clock size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">My Timing</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[10px] font-bold text-blue-500 uppercase">Work Duration</p>
                      {liveTracking.lastUpdate && (currentTime.getTime() - liveTracking.lastUpdate < 5000) && (
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      )}
                    </div>
                    <p className="text-lg font-black text-slate-800 dark:text-white tabular-nums flex items-center gap-2">
                      {formatDuration(liveTracking.workingTime)}
                      {liveTracking.lastUpdate && (currentTime.getTime() - liveTracking.lastUpdate < 5000) && (
                        <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">Live</span>
                      )}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-rose-500 uppercase mb-1">Idle Time</p>
                    <p className="text-lg font-black text-slate-800 dark:text-white tabular-nums">
                      {formatDuration(liveTracking.idleTime)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={handleBreakToggle}
                    disabled={!liveTracking.isClockedIn}
                    className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold text-xs uppercase transition-all ${
                      !liveTracking.isClockedIn 
                        ? "opacity-50 cursor-not-allowed border-slate-200 text-slate-400"
                        : liveTracking.onBreak 
                          ? "bg-amber-100 border-amber-500 text-amber-600 hover:bg-amber-200" 
                          : "border-blue-500 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    }`}
                  >
                    {liveTracking.onBreak ? "End Break" : "Start Break"}
                  </button>
                  
                  {liveTracking.isClockedIn ? (
                    <button 
                      onClick={handleClockOut}
                      className="flex-1 py-3 px-4 rounded-xl bg-orange-600 text-white font-bold text-xs uppercase hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/20"
                    >
                      Clock Out
                    </button>
                  ) : (
                    <button 
                      onClick={handleClockIn}
                      className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs uppercase hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/20"
                    >
                      Clock In
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-[32px] p-8 shadow-premium border border-white dark:border-slate-700">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <CalendarIcon size={20} className="text-blue-500" />
                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight italic">My Leave</h3>
              </div>
              <button className="p-1 px-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase flex items-center gap-1">
                View All <ArrowRight size={12} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-[24px] bg-slate-50 dark:bg-slate-700/30 border border-slate-50 dark:border-slate-700">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Available</p>
                <p className="text-3xl font-black text-slate-800 dark:text-white italic tracking-tighter">
                  {leaveBalance?.annual?.available !== undefined ? String(leaveBalance.annual.available).padStart(2, '0') : "00"}
                </p>
              </div>
              <div className="p-6 rounded-[24px] bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Used</p>
                <p className="text-3xl font-black text-blue-600 dark:text-blue-400 italic tracking-tighter">
                  {leaveBalance?.annual?.used !== undefined ? String(leaveBalance.annual.used).padStart(2, '0') : "00"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white dark:bg-slate-800 rounded-[32px] p-8 lg:p-10 shadow-premium border border-white dark:border-slate-700 h-full">
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <CalendarIcon size={24} className="text-slate-400" />
                <h2 className="text-2xl font-black text-slate-500 dark:text-slate-300 uppercase tracking-tight italic">Attendance Calendar</h2>
              </div>
              <div className="relative w-full h-[1px] bg-slate-100 dark:bg-slate-700 flex items-center justify-between">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-600"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-600"></div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 mb-10">
              <div className="flex items-center gap-4 p-1 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                <button onClick={handlePrevMonth} className="w-10 h-10 flex items-center justify-center hover:bg-white dark:hover:bg-slate-600 rounded-xl transition-all"><ChevronLeft size={18} className="text-slate-400" /></button>
                <span className="text-sm font-bold uppercase tracking-tight min-w-[120px] text-center text-slate-500 dark:text-slate-300 italic">{months[selectedMonth]}</span>
                <button onClick={handleNextMonth} className="w-10 h-10 flex items-center justify-center hover:bg-white dark:hover:bg-slate-600 rounded-xl transition-all"><ChevronRight size={18} className="text-slate-400" /></button>
              </div>
              <div className="flex items-center gap-4 p-1 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                <button onClick={handlePrevYear} className="w-10 h-10 flex items-center justify-center hover:bg-white dark:hover:bg-slate-600 rounded-xl transition-all"><ChevronLeft size={18} className="text-slate-400" /></button>
                <span className="text-sm font-bold uppercase tracking-tight min-w-[80px] text-center text-slate-500 dark:text-slate-300 italic">{selectedYear}</span>
                <button onClick={handleNextYear} className="w-10 h-10 flex items-center justify-center hover:bg-white dark:hover:bg-slate-600 rounded-xl transition-all"><ChevronRight size={18} className="text-slate-400" /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-4 mb-10">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                <div key={d} className="text-center text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-2">{d}</div>
              ))}
              
              {generateCalendarDays().map((dateObj, i) => {
                const { day, month, year, isCurrentMonth } = dateObj;
                const attendance = getAttendanceForDate(day, month, year);
                const isWeekend = (i % 7 === 0 || i % 7 === 6);
                
                let bgColor = "bg-white dark:bg-slate-800";
                let textColor = isCurrentMonth ? "text-slate-700 dark:text-slate-200" : "text-slate-400 dark:text-slate-500";
                
                if (attendance) {
                  if (attendance.status === 'Present' || attendance.status === 'Completed Work') {
                    bgColor = "bg-[#3b82f6]";
                    textColor = "text-white";
                  } else if (attendance.isDelayed) {
                    bgColor = "bg-[#f87171]"; // Late In (Salmon)
                    textColor = "text-white";
                  } else if (attendance.status === 'Absent') {
                    bgColor = "bg-[#ef4444]";
                    textColor = "text-white";
                  } else if (attendance.status === 'Partially Completed') {
                    bgColor = "bg-[#d97706]"; // Late Outish/Partial (Tan/Orange)
                    textColor = "text-white";
                  }
                } else if (isWeekend) {
                  bgColor = "bg-slate-50 dark:bg-slate-700/30";
                } else if (!isCurrentMonth) {
                  // Muted look for other month days handled by textColor above
                }

                return (
                  <div key={`${month}-${day}`} className={`aspect-square sm:h-20 flex items-center justify-center rounded-xl border border-slate-50 dark:border-slate-700 shadow-sm transition-all hover:scale-105 hover:z-10 ${bgColor} ${textColor} text-sm sm:text-lg font-bold tabular-nums italic`}>
                    {day.toString().padStart(2, '0')}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 pt-10 border-t border-slate-50 dark:border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-[#3b82f6] shadow-sm"></div>
                <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Present</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-[#ef4444] shadow-sm"></div>
                <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Absent</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-600"></div>
                <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Weekend</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-[#f87171] shadow-sm"></div>
                <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Late In</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-[#d97706] shadow-sm"></div>
                <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Late Out</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-8">
        {[
          { icon: TrendingUp, label: "Efficiency", val: "94.2%", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/10" },
          { icon: Award, label: "Top Skill", val: "React", color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/10" },
          { icon: Zap, label: "Active Now", val: socketConnected ? "Connected" : "Syncing...", color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/10" },
          { icon: Layers, label: "Projects", val: "2 Live", color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/10" }
        ].map((stat, i) => (
          <div key={i} className={`p-8 rounded-[32px] overflow-hidden shadow-premium border border-white dark:border-slate-700 bg-white dark:bg-slate-800 group hover:scale-[1.02] transition-all`}>
            <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center mb-6`}>
              <stat.icon className={stat.color} size={24} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white italic tracking-tight">{stat.val}</p>
          </div>
        ))}
      </div>

      <div className="text-center mt-12 p-8 border-t border-slate-100 dark:border-slate-800">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[.2em]">Employee Tracker Workspace • v2.1.0 • Session Secured</p>
      </div>
    </div>
  );
}
