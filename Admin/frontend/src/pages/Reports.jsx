import { useState, useEffect } from "react";
import { getAllUsers, getDailyReports, getWeeklyReports, getMonthlyReports } from "../services/api";
import { Calendar, Download, TrendingUp, Clock, Activity, Coffee, Database, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import Modal from "../components/Modal"; // Assuming you have a Modal component or create one
import ScreenshotViewer from "../components/ScreenshotViewer";

export default function Reports() {
    const [users, setUsers] = useState([]);
    // console.log("🚀 ~ Reports ~ users:", users)
    const [selectedUser, setSelectedUser] = useState("");
    const [reportType, setReportType] = useState("daily"); // daily, weekly, monthly
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [useDemoData, setUseDemoData] = useState(false);
    const [selectedSession, setSelectedSession] = useState(null);
    const [selectedDay, setSelectedDay] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [visibleScreenshots, setVisibleScreenshots] = useState({});

    const toggleScreenshots = (id) => {
        setVisibleScreenshots(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortedData = (data) => {
        if (!data || !sortConfig.key) return data;

        return [...data].sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            // Custom handling for specific fields
            if (sortConfig.key === 'productivity') {
                aValue = parseFloat(calculateProductivity(a.workingTime, a.idleTime));
                bValue = parseFloat(calculateProductivity(b.workingTime, b.idleTime));
            } else if (sortConfig.key === 'sessionStart' || sortConfig.key === 'date') {
                aValue = new Date(aValue).getTime();
                bValue = new Date(bValue).getTime();
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        setSortConfig({ key: null, direction: 'asc' });
    }, [reportType]);

    useEffect(() => {
        // console.log("selectedUser", selectedUser);
        if (selectedUser) {
            fetchReports();
        }
    }, [selectedUser, reportType, selectedDate, useDemoData]);

    const fetchUsers = async () => {
        try {
            const response = await getAllUsers();
            if (response?.data?.success) {
                setUsers(response?.data?.data);
            }
            if (response?.data?.data?.length > 0) {
                setSelectedUser(response?.data?.data[0].id || response?.data?.data[0]._id);
            }
        } catch (error) {
            console.error("Failed to fetch users:", error);
        }
    };

    // Generate demo data
    // const generateDemoData = () => {
    //     if (reportType === "daily") {
    //         const date = new Date(selectedDate);
    //         const sessions = [];
    //         const sessionCount = Math.floor(Math.random() * 3) + 2; // 2-4 sessions

    //         for (let i = 0; i < sessionCount; i++) {
    //             const startHour = 9 + Math.floor(Math.random() * 3); // 9 AM - 11 AM
    //             const startMinute = Math.floor(Math.random() * 60);
    //             const sessionStart = new Date(date);
    //             sessionStart.setHours(startHour, startMinute, 0);

    //             const duration = (4 + Math.random() * 4) * 3600000; // 4-8 hours in ms
    //             const sessionEnd = new Date(sessionStart.getTime() + duration);

    //             const workingTime = duration * (0.7 + Math.random() * 0.2); // 70-90% working
    //             const idleTime = duration - workingTime;
    //             const productivity = (workingTime / duration) * 100;

    //             const screenshotCount = Math.floor(duration / (30 * 60 * 1000)) + Math.floor(Math.random() * 20); // ~1 per 30 min + random
    //             const breaksTaken = Math.floor(Math.random() * 3) + 1; // 1-3 breaks

    //             // build screenshots array (dummy images with timestamps)
    //             const screenshots = Array.from({ length: screenshotCount }).map((_, si) => {
    //                 // distribute timestamps across the session
    //                 const ts = new Date(sessionStart.getTime() + Math.floor((si / Math.max(1, screenshotCount)) * duration));
    //                 return {
    //                     url: `https://picsum.photos/seed/${encodeURIComponent("demo")}_${i}_${si}/800/450`,
    //                     alt: `Screenshot ${si + 1}`,
    //                     timestamp: ts.toISOString(),
    //                 };
    //             });

    //             // build breaks array with start/end timestamps
    //             const breaks = Array.from({ length: breaksTaken }).map(() => {
    //                 const breakStartOffset = Math.floor(Math.random() * Math.max(1, duration - 5 * 60 * 1000));
    //                 const breakDuration = (5 + Math.floor(Math.random() * 16)) * 60 * 1000; // 5-20 minutes
    //                 const start = new Date(sessionStart.getTime() + breakStartOffset);
    //                 const end = new Date(Math.min(start.getTime() + breakDuration, sessionEnd.getTime()));
    //                 return {
    //                     start: start.toISOString(),
    //                     end: end.toISOString(),
    //                 };
    //             });

    //             const activityMetrics = {
    //                 keyPresses: Math.floor(Math.random() * 5000) + 1000,
    //                 mouseClicks: Math.floor(Math.random() * 2000) + 500,
    //                 mouseMovements: Math.floor(Math.random() * 10000) + 2000,
    //                 mouseScrolls: Math.floor(Math.random() * 5000) + 1000,
    //             };

    //             const apps = ["VS Code", "Chrome", "Slack", "Terminal", "Spotify"];
    //             const applications = apps.map(app => ({
    //                 name: app,
    //                 duration: Math.floor(duration * Math.random() * 0.4 / 1000), // simplistic duration share
    //                 lastActive: new Date(sessionStart.getTime() + Math.random() * duration).toISOString()
    //             }));

    //             sessions.push({
    //                 _id: `demo_${i}`,
    //                 userId: selectedUser,
    //                 date: selectedDate,
    //                 sessionStart: sessionStart.toISOString(),
    //                 sessionEnd: sessionEnd.toISOString(),
    //                 workingTime: Math.floor(workingTime),
    //                 idleTime: Math.floor(idleTime),
    //                 screenshotCount,
    //                 screenshots,
    //                 breaksTaken,
    //                 breaks,
    //                 productivity: productivity.toFixed(1),
    //                 activityMetrics,
    //                 applications,
    //             });
    //         }
    //         return sessions;
    //     } else if (reportType === "weekly") {
    //         const date = new Date(selectedDate);
    //         const dayOfWeek = date.getDay();
    //         const weekStart = new Date(date);
    //         weekStart.setDate(date.getDate() - dayOfWeek);
    //         const weekEnd = new Date(weekStart);
    //         weekEnd.setDate(weekStart.getDate() + 6);

    //         const totalSessions = Math.floor(Math.random() * 15) + 20; // 20-35 sessions
    //         const totalWorkingTime = (totalSessions * 6 + Math.random() * totalSessions * 2) * 3600000; // ~6-8 hours per session
    //         const totalIdleTime = totalWorkingTime * (0.1 + Math.random() * 0.15); // 10-25% idle
    //         const totalScreenshots = Math.floor(totalWorkingTime / (30 * 60 * 1000)) + Math.floor(Math.random() * 50);
    //         const totalBreaks = Math.floor(totalSessions * 1.5) + Math.floor(Math.random() * 10);

    //         return {
    //             weekStart: weekStart.toISOString().split('T')[0],
    //             weekEnd: weekEnd.toISOString().split('T')[0],
    //             summary: {
    //                 totalSessions,
    //                 totalWorkingTime: Math.floor(totalWorkingTime),
    //                 totalIdleTime: Math.floor(totalIdleTime),
    //                 totalScreenshots,
    //                 totalBreaks
    //             },
    //             sessions: []
    //         };
    //     } else { // monthly
    //         const date = new Date(selectedDate);
    //         const month = date.getMonth() + 1;
    //         const year = date.getFullYear();
    //         const daysInMonth = new Date(year, month, 0).getDate();

    //         const dailyData = [];
    //         let totalSessions = 0;
    //         let totalWorkingTime = 0;
    //         let totalIdleTime = 0;
    //         let totalScreenshots = 0;
    //         let totalBreaks = 0;

    //         for (let day = 1; day <= daysInMonth; day++) {
    //             const dayDate = new Date(year, month - 1, day);
    //             const dayStr = dayDate.toISOString().split('T')[0];
    //             const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;

    //             if (isWeekend && Math.random() > 0.3) continue; // Skip some weekends

    //             const sessionsCount = isWeekend ? Math.floor(Math.random() * 2) : Math.floor(Math.random() * 3) + 1;
    //             const dayWorkingTime = (sessionsCount * (4 + Math.random() * 4)) * 3600000;
    //             const dayIdleTime = dayWorkingTime * (0.1 + Math.random() * 0.15);
    //             const dayScreenshots = Math.floor(dayWorkingTime / (30 * 60 * 1000)) + Math.floor(Math.random() * 5);
    //             const dayBreaks = Math.floor(sessionsCount * 1.5) + Math.floor(Math.random() * 2);

    //             // Build detailed sessions for the day
    //             const sessions = Array.from({ length: sessionsCount }).map((_, si) => {
    //                 const sStart = new Date(year, month - 1, day, 9 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60));
    //                 const sDuration = (3 + Math.random() * 5) * 3600000; // 3-8 hours
    //                 const sEnd = new Date(sStart.getTime() + sDuration);

    //                 const sWorking = sDuration * (0.65 + Math.random() * 0.25);
    //                 const sIdle = sDuration - sWorking;

    //                 const sScreenshotCount = Math.floor(sDuration / (30 * 60 * 1000)) + Math.floor(Math.random() * 5);
    //                 const sScreenshots = Array.from({ length: sScreenshotCount }).map((_, k) => {
    //                     const t = new Date(sStart.getTime() + Math.floor((k / Math.max(1, sScreenshotCount)) * sDuration));
    //                     return { url: `https://picsum.photos/seed/${encodeURIComponent("month")}_${day}_${si}_${k}/800/450`, alt: `Screenshot ${k + 1}`, timestamp: t.toISOString() };
    //                 });

    //                 const sBreaksCount = Math.floor(Math.random() * 3);
    //                 const sBreaks = Array.from({ length: sBreaksCount }).map(() => {
    //                     const bStartOffset = Math.floor(Math.random() * Math.max(1, sDuration - 5 * 60 * 1000));
    //                     const bDuration = (5 + Math.floor(Math.random() * 16)) * 60 * 1000;
    //                     const bStart = new Date(sStart.getTime() + bStartOffset);
    //                     const bEnd = new Date(Math.min(bStart.getTime() + bDuration, sEnd.getTime()));
    //                     return { start: bStart.toISOString(), end: bEnd.toISOString() };
    //                 });

    //                 const sProductivity = ((sWorking / sDuration) * 100).toFixed(1);

    //                 return {
    //                     _id: `demo_${day}_${si}`,
    //                     sessionStart: sStart.toISOString(),
    //                     sessionEnd: sEnd.toISOString(),
    //                     workingTime: Math.floor(sWorking),
    //                     idleTime: Math.floor(sIdle),
    //                     screenshotCount: sScreenshotCount,
    //                     screenshots: sScreenshots,
    //                     breaksTaken: sBreaksCount,
    //                     breaks: sBreaks,
    //                     productivity: sProductivity,
    //                 };
    //             });

    //             dailyData.push({
    //                 date: dayStr,
    //                 sessions,
    //                 workingTime: Math.floor(dayWorkingTime),
    //                 idleTime: Math.floor(dayIdleTime),
    //                 screenshots: dayScreenshots,
    //                 breaks: dayBreaks
    //             });

    //             totalSessions += sessionsCount;
    //             totalWorkingTime += dayWorkingTime;
    //             totalIdleTime += dayIdleTime;
    //             totalScreenshots += dayScreenshots;
    //             totalBreaks += dayBreaks;
    //         }

    //         return {
    //             month,
    //             year,
    //             summary: {
    //                 totalSessions,
    //                 totalWorkingTime: Math.floor(totalWorkingTime),
    //                 totalIdleTime: Math.floor(totalIdleTime),
    //                 totalScreenshots,
    //                 totalBreaks
    //             },
    //             dailyData
    //         };
    //     }
    // };

    const fetchReports = async () => {
        if (!selectedUser) return;

        setLoading(true);
        try {
            // if (useDemoData) {
            //     // Use demo data
            //     setTimeout(() => {
            //         // setReportData(generateDemoData());
            //         setLoading(false);
            //     }, 500); // Simulate API delay
            //     return;
            // }

            let response;
            if (reportType === "daily") {
                response = await getDailyReports(selectedUser, selectedDate);
            } else if (reportType === "weekly") {
                response = await getWeeklyReports(selectedUser, selectedDate);
            } else {
                const date = new Date(selectedDate);
                response = await getMonthlyReports(
                    selectedUser,
                    date.getMonth() + 1,
                    date.getFullYear()
                );
            }
            setReportData(response?.data?.data);
        } catch (error) {
            console.error("Failed to fetch reports:", error);
            // If API fails, show no data instead of confusing demo data
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (s) => {
        if (!s) return "0s";
        const hours = Math.floor(s / 3600);
        const minutes = Math.floor((s % 3600) / 60);
        const seconds = Math.floor(s % 60);

        if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
        if (minutes > 0) return `${minutes}m ${seconds}s`;
        return `${seconds}s`;
    };

    const calculateProductivity = (workingTime, idleTime) => {
        const total = workingTime + idleTime;
        if (total === 0) return 0;
        return ((workingTime / total) * 100).toFixed(1);
    };

    const exportToCSV = () => {
        if (!reportData) return;

        let csvContent = "data:text/csv;charset=utf-8,";

        if (reportType === "daily" && Array.isArray(reportData)) {
            csvContent += "Date,Working Time,Idle Time,Productivity,Screenshots,Breaks\n";
            reportData.forEach(session => {
                const productivity = calculateProductivity(session.workingTime, session.idleTime);
                csvContent += `${session.date || 'N/A'},${formatTime(session.workingTime)},${formatTime(session.idleTime)},${productivity}%,${session.screenshotCount || 0},${session.breaksTaken || 0}\n`;
            });
        } else if (reportType === "monthly" && reportData.dailyData) {
            csvContent += "Date,Working Time,Idle Time,Productivity,Screenshots,Breaks\n";
            reportData.dailyData.forEach(day => {
                const productivity = calculateProductivity(day.workingTime, day.idleTime);
                csvContent += `${day.date},${formatTime(day.workingTime)},${formatTime(day.idleTime)},${productivity}%,${day.screenshots},${day.breaks}\n`;
            });
        } else if (reportType === "weekly" && reportData.summary) {
            csvContent += "Range,Working Time,Idle Time,Productivity,Screenshots,Breaks,Total Sessions\n";
            const productivity = calculateProductivity(reportData.summary.totalWorkingTime, reportData.summary.totalIdleTime);
            csvContent += `${reportData.weekStart} to ${reportData.weekEnd},${formatTime(reportData.summary.totalWorkingTime)},${formatTime(reportData.summary.totalIdleTime)},${productivity}%,${reportData.summary.totalScreenshots},${reportData.summary.totalBreaks},${reportData.summary.totalSessions}\n`;
            
            if (reportData.sessions && reportData.sessions.length > 0) {
                csvContent += "\nDetailed Sessions\n";
                csvContent += "Date,Working Time,Idle Time,Productivity,Screenshots,Breaks\n";
                reportData.sessions.forEach(session => {
                    const sProd = calculateProductivity(session.workingTime, session.idleTime);
                    csvContent += `${session.date || 'N/A'},${formatTime(session.workingTime)},${formatTime(session.idleTime)},${sProd}%,${session.screenshotCount || 0},${session.breaksTaken || 0}\n`;
                });
            }
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `report_${reportType}_${selectedDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const renderDailyReport = () => {
        if (!Array.isArray(reportData) || reportData.length === 0) {
            return (
                <div className="bg-white dark:bg-slate-800 rounded-xl  border border-gray-200 dark:border-slate-700 p-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                        <Calendar className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                        <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No sessions found for this date</p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm">Try selecting a different date.</p>
                    </div>
                </div>
            );
        }

        const sortedSessions = getSortedData(reportData.map((s, i) => ({ ...s, originalIndex: i })));

        return (
            <div className="space-y-4 ">
                <div className="flex flex-wrap items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                    <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <ArrowUpDown size={16} /> Sort By:
                    </span>
                    {[
                        { key: 'sessionStart', label: 'Time' },
                        { key: 'workingTime', label: 'Working' },
                        { key: 'idleTime', label: 'Idle' },
                        { key: 'productivity', label: 'Productivity' }
                    ].map((btn) => (
                        <button
                            key={btn.key}
                            onClick={() => requestSort(btn.key)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${sortConfig.key === btn.key
                                ? 'bg-purple-600 text-white shadow-sm'
                                : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                                }`}
                        >
                            {btn.label}
                            {sortConfig.key === btn.key && (
                                sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                            )}
                        </button>
                    ))}
                </div>
                <div className="max-h-[calc(75vh-200px)] overflow-y-auto scrollbar-hide p-3 space-y-3 border border-gray-200 dark:border-slate-700 rounded-xl">
                    {sortedSessions.map((session) => {
                        const productivity = calculateProductivity(session.workingTime, session.idleTime);
                        return (
                            <div
                                key={session._id || session.originalIndex}
                                className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 shadow-sm hover: transition-all duration-200 cursor-pointer group"
                                onClick={() => setSelectedSession(session)}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                                            <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                            Session {session.originalIndex + 1}
                                        </h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                                            <Clock size={14} />
                                            {new Date(session.sessionStart).toLocaleTimeString()} - {session.sessionEnd ? new Date(session.sessionEnd).toLocaleTimeString() : 'Ongoing'}
                                        </p>
                                    </div>
                                    <div className={`px-4 py-2 rounded-full text-sm font-bold shadow-sm ${productivity >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' :
                                        productivity >= 60 ? 'bg-gradient-to-r from-yellow-400 to-amber-400 text-gray-900' :
                                            'bg-gradient-to-r from-red-400 to-rose-400 text-white'
                                        }`}>
                                        {productivity}% Productive
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                                        <Clock className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Working</p>
                                            <p className="font-bold text-gray-900 dark:text-white">{formatTime(session.workingTime)}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                                        <Activity className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Idle</p>
                                            <p className="font-bold text-gray-900 dark:text-white">{formatTime(session.idleTime)}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                                        <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Screenshots</p>
                                            <p className="font-bold text-gray-900 dark:text-white">{session.screenshotCount || 0}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                                        <Coffee className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Breaks</p>
                                            <p className="font-bold text-gray-900 dark:text-white">{session.breaksTaken || 0}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
               </div>
            </div>
        );
    };

    const renderWeeklyReport = () => {
        if (!reportData || !reportData.sessions) {
            return (
                <div className="bg-white dark:bg-slate-800 rounded-xl  border border-gray-200 dark:border-slate-700 p-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                        <TrendingUp className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                        <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No data available</p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm">Try selecting a different week.</p>
                    </div>
                </div>
            );
        }

        const { summary, weekStart, weekEnd } = reportData;
        const productivity = calculateProductivity(summary.totalWorkingTime, summary.totalIdleTime);

        return (
            <div className="space-y-6">
                <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white rounded-lg p-2 ">
                    {/* <div className="flex items-center gap-3 mb-3">
                        <TrendingUp className="w-6 h-6" />
                        <h3 className="text-2xl font-bold">Week Summary</h3>
                    </div> */}
                    <p className="text-blue-100 text-sm">
                        {new Date(weekStart).toLocaleDateString()} - {new Date(weekEnd).toLocaleDateString()}
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-5">
                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover: transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Sessions</p>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary.totalSessions}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover: transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Working Time</p>
                        </div>
                        {/* totalWorkingTime is in seconds converting it into hours */}
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatTime(summary.totalWorkingTime)}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover: transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                <Activity className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Productivity</p>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{productivity}%</p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover: transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Screenshots</p>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary.totalScreenshots}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover: transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                <Coffee className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                            </div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Breaks Taken</p>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary.totalBreaks}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover: transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-gray-100 dark:bg-gray-700/30 rounded-lg">
                                <Activity className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                            </div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Idle Time</p>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatTime(summary.totalIdleTime)}</p>
                    </div>
                </div>

                {reportData.dailyData && reportData.dailyData.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm transition-all duration-300">
                        <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-gray-50/50 to-white dark:from-slate-800/50 dark:to-slate-800 flex items-center justify-between">
                            <h4 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                                <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                Weekly Daily Breakdown
                            </h4>
                            <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-full">
                                {reportData.dailyData.length} Day{reportData.dailyData.length !== 1 ? 's' : ''} Tracked
                            </span>
                        </div>
                        <div className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50/50 dark:bg-slate-900/20 text-xs uppercase text-gray-500 dark:text-gray-400 border-b dark:border-slate-700">
                                        <tr>
                                            <th className="px-6 py-4 font-bold">Date</th>
                                            <th className="px-6 py-4 font-bold text-center">Sessions</th>
                                            <th className="px-6 py-4 font-bold text-right">Working Time</th>
                                            <th className="px-6 py-4 font-bold text-right">Productivity</th>
                                            <th className="px-6 py-4 font-bold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                        {getSortedData(reportData.dailyData).map((day, index) => {
                                            const dayProductivity = calculateProductivity(day.workingTime, day.idleTime);
                                            return (
                                                <tr key={index} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                                {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 dark:bg-slate-700 text-xs font-medium text-gray-600 dark:text-gray-400">
                                                            {day.sessions.length} sessions
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                            {formatTime(day.workingTime)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${dayProductivity >= 80 ? 'bg-green-100 text-green-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                                dayProductivity >= 60 ? 'bg-yellow-100 text-yellow-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                                    'bg-red-100 text-red-700 dark:bg-rose-900/30 dark:text-rose-400'
                                                                }`}>
                                                                {dayProductivity}%
                                                            </span>
                                                            <div className="w-20 h-1 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                <div 
                                                                    className={`h-full rounded-full ${dayProductivity >= 80 ? 'bg-green-500' : dayProductivity >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                                    style={{ width: `${dayProductivity}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => setSelectedDay(day)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 font-bold text-xs rounded-lg transition-all duration-200 border border-blue-200/50 dark:border-blue-800/30"
                                                        >
                                                            View Details
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderMonthlyReport = () => {
        if (!reportData || !reportData.dailyData) {
            return (
                <div className="bg-white dark:bg-slate-800 rounded-xl  border border-gray-200 dark:border-slate-700 p-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                        <Calendar className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                        <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No data available</p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm">Try selecting a different month.</p>
                    </div>
                </div>
            );
        }

        const { summary, month, year, dailyData } = reportData;
        const productivity = calculateProductivity(summary.totalWorkingTime, summary.totalIdleTime);

        return (
            <div className="space-y-2">
                <div className="bg-gradient-to-br from-purple-500 via-purple-600 to-pink-600 text-white rounded-lg p-2 ">
                    {/* <div className="flex items-center gap-3 mb-3">
                        <Calendar className="w-6 h-6" />
                        <h3 className="text-2xl font-bold">Monthly Summary</h3>
                    </div> */}
                    <p className="text-purple-100 text-sm">
                        {new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover: transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Sessions</p>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary.totalSessions}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover: transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Working Time</p>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatTime(summary.totalWorkingTime)}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover: transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                <Activity className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Productivity</p>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{productivity}%</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl  overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-800">
                        <h4 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            Daily Breakdown
                        </h4>
                    </div>
                    <div className="p-4">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 border-b dark:border-slate-700">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold cursor-pointer hover:text-purple-600 transition-colors" onClick={() => requestSort('date')}>
                                            <div className="flex items-center gap-2">
                                                Date
                                                {sortConfig.key === 'date' ? (
                                                    sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                                ) : <ArrowUpDown size={12} className="opacity-50" />}
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 font-semibold text-right cursor-pointer hover:text-purple-600 transition-colors" onClick={() => requestSort('workingTime')}>
                                            <div className="flex items-center justify-end gap-2">
                                                Working Time
                                                {sortConfig.key === 'workingTime' ? (
                                                    sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                                ) : <ArrowUpDown size={12} className="opacity-50" />}
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 font-semibold text-right cursor-pointer hover:text-purple-600 transition-colors" onClick={() => requestSort('productivity')}>
                                            <div className="flex items-center justify-end gap-2">
                                                Productivity
                                                {sortConfig.key === 'productivity' ? (
                                                    sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                                ) : <ArrowUpDown size={12} className="opacity-50" />}
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 font-semibold text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                    {getSortedData(dailyData).map((day, index) => {
                                        const dayProductivity = calculateProductivity(day.workingTime, day.idleTime);
                                        return (
                                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group">
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-900 dark:text-white">{day.date}</span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">{day.sessions.length} session{day.sessions.length !== 1 ? 's' : ''}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatTime(day.workingTime)}</span>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <span className={`inline-flex px-3 py-1.5 rounded-full text-xs font-bold ${dayProductivity >= 80 ? 'bg-green-100 text-green-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                        dayProductivity >= 60 ? 'bg-yellow-100 text-yellow-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                            'bg-red-100 text-red-700 dark:bg-rose-900/30 dark:text-rose-400'
                                                        }`}>
                                                        {dayProductivity}%
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <button
                                                        onClick={() => setSelectedDay(day)}
                                                        className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium text-sm transition-colors"
                                                    >
                                                        Details
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const closeModal = () => {
        setSelectedSession(null);
    };

    return (
        <div className="space-y-3" style={{height: '87vh', overflowY: 'auto' }}>
            {/* Header Section */}
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 ">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Reports & Analytics</h1>
                        <p className="text-gray-600 dark:text-gray-400">Comprehensive employee productivity insights and metrics</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* <button
                            onClick={() => setUseDemoData(!useDemoData)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${useDemoData
                                ? 'bg-green-600 hover:bg-green-700 text-white  shadow-green-500/30'
                                : 'bg-gray-200/20 hover:bg-gray-200/30 border border-gray-200 dark:border-slate-700 dark:bg-slate-700/50 dark:hover:bg-slate-700/60  backdrop-blur-sm'
                                }`}
                            aria-label={useDemoData ? 'Disable demo mode' : 'Enable demo mode'}
                        >
                            <Database className="w-4 h-4" />
                            <span className="text-sm">Demo {useDemoData ? 'ON' : 'OFF'}</span>
                        </button> */}
                        <button
                            onClick={exportToCSV}
                            disabled={!reportData}
                            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-slate-700 dark:bg-slate-700/50 dark:hover:bg-slate-700/60  backdrop-blur-sm rounded-lg disabled:cursor-not-allowed transition-all duration-200 font-medium "
                            aria-label="Export report to CSV"
                        >
                            <Download className="w-4 h-4" />
                            <span className="text-sm">Export CSV</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Demo Mode Banner */}
            {/* {useDemoData && (
                <div className="bg-green-50 dark:bg-green-900/50 border-l-4 border-green-500 text-green-800 dark:text-green-200 px-6 py-4 rounded-lg shadow-sm flex items-start gap-3">
                    <Database className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-semibold">Demo Mode Active</p>
                        <p className="text-sm mt-1">Showing sample data for demonstration purposes</p>
                    </div>
                </div>
            )} */}

            {/* Filters Section */}
            <div className="bg-white dark:bg-slate-800 rounded-xl  border border-gray-200 ">
                <div className="p-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Select User
                            </label>
                            <select
                                value={selectedUser}
                                onChange={(e) => setSelectedUser(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors hover:border-purple-400 dark:hover:border-purple-500"
                            >
                                {users?.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.username} ({user.email})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Report Type
                            </label>
                            <select
                                value={reportType}
                                onChange={(e) => setReportType(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors hover:border-purple-400 dark:hover:border-purple-500"
                            >
                                <option value="daily">Daily Report</option>
                                <option value="weekly">Weekly Report</option>
                                <option value="monthly">Monthly Report</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                {reportType === "daily" ? "Date" : reportType === "weekly" ? "Week Start" : "Month"}
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors hover:border-purple-400 dark:hover:border-purple-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Report Content */}
            {loading ? (
                <div className="flex flex-col justify-center items-center py-16">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 dark:border-purple-900 border-t-purple-600 dark:border-t-purple-400"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Loading report data...</p>
                </div>
            ) : (
                <div>
                    {reportType === "daily" && renderDailyReport()}
                    {reportType === "weekly" && renderWeeklyReport()}
                    {reportType === "monthly" && renderMonthlyReport()}
                </div>
            )}

            {selectedSession && (
                <Modal onClose={closeModal} title={`Session Details — ${new Date(selectedSession.sessionStart).toLocaleDateString()}`}>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Start</p>
                                <p className="font-medium text-gray-900 dark:text-white">{new Date(selectedSession.sessionStart).toLocaleString()}</p>
                            </div>

                            <div className="text-center">
                                <p className="text-sm text-gray-500">Productivity</p>
                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${calculateProductivity(selectedSession.workingTime, selectedSession.idleTime) >= 80 ? 'bg-green-100 text-green-700 dark:bg-emerald-900 dark:text-emerald-200' : calculateProductivity(selectedSession.workingTime, selectedSession.idleTime) >= 60 ? 'bg-yellow-100 text-yellow-700 dark:bg-amber-900 dark:text-amber-200' : 'bg-red-100 text-red-700 dark:bg-rose-900 dark:text-rose-200'}`}>
                                    {calculateProductivity(selectedSession.workingTime, selectedSession.idleTime)}%
                                </div>
                            </div>

                            <div className="text-right">
                                <p className="text-sm text-gray-500">End</p>
                                <p className="font-medium text-gray-900 dark:text-white">{selectedSession.sessionEnd ? new Date(selectedSession.sessionEnd).toLocaleString() : 'Ongoing'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
                                <p className="text-xs text-gray-500">Working Time</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatTime(selectedSession.workingTime)}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
                                <p className="text-xs text-gray-500">Idle Time</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatTime(selectedSession.idleTime)}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
                                <p className="text-xs text-gray-500">Productivity</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedSession.productivity || 0}%</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
                                <p className="text-xs text-gray-500">Screenshots</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedSession.screenshotCount || (selectedSession.screenshots?.length || 0)}</p>
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

                        {/* Application Usage (New/Premium) */}
                        {selectedSession.applications && selectedSession.applications.length > 0 && (
                            <div>
                                <h4 className="font-semibold mb-3 text-gray-900 dark:text-white flex items-center justify-between">
                                    <span>Applications Used</span>
                                    <span className="text-xs font-normal text-gray-500">
                                        Tracked: {formatTime(selectedSession.applications.reduce((sum, app) => sum + app.duration, 0))} / {formatTime(selectedSession.workingTime)}
                                    </span>
                                </h4>
                                <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
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
                                                
                                                // Add an "Other / System" entry if there's a significant gap
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
                                                                            className={`h-full rounded-full ${app.isUnaccounted ? 'bg-gray-400 dark:bg-slate-600' : 'bg-purple-500 dark:bg-purple-400'}`} 
                                                                            style={{ width: `${percentage}%` }}
                                                                        ></div>
                                                                    </div>
                                                                    <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 w-8 text-right">
                                                                        {percentage}%
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-200">
                                                                {formatTime(app.duration)}
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

                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                    Screenshots
                                </h4>
                                <button
                                    onClick={() => toggleScreenshots(selectedSession._id || 'session-modal')}
                                    className="flex items-center gap-2 px-4 py-2 border border-purple-200 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all duration-200 text-sm font-semibold shadow-sm"
                                >
                                    <Activity className={`w-4 h-4 transition-transform duration-300 ${visibleScreenshots[selectedSession._id || 'session-modal'] ? 'rotate-180' : ''}`} />
                                    {visibleScreenshots[selectedSession._id || 'session-modal'] ? 'Hide Screenshots' : 'View Screenshots'}
                                    <span className="ml-1 px-2 py-0.5 bg-purple-200/50 dark:bg-purple-800/50 rounded-full text-xs">
                                        {selectedSession.screenshots?.length || 0}
                                    </span>
                                </button>
                            </div>
                            
                            {visibleScreenshots[selectedSession._id || 'session-modal'] && (
                                <div className="bg-gray-50 dark:bg-slate-900/30 rounded-xl p-4 border border-gray-100 dark:border-slate-700/50">
                                    <ScreenshotViewer images={selectedSession.screenshots || []} />
                                </div>
                            )}
                        </div>

                        <div>
                            <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Break Details</h4>
                            {selectedSession.breaks && selectedSession.breaks.length > 0 ? (
                                <ul className="divide-y divide-gray-100 dark:divide-slate-700 rounded-lg overflow-hidden border dark:border-slate-700">
                                    {selectedSession.breaks.map((b, i) => (
                                        <li key={i} className="p-3 flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-gray-700 dark:text-gray-200">Break {i + 1}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(b.start).toLocaleString()} — {new Date(b.end).toLocaleString()}</p>
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-300">{formatTime((new Date(b.end) - new Date(b.start)) / 1000)}</div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-500">No breaks recorded for this session.</p>
                            )}
                        </div>
                    </div>
                </Modal>
            )}
            {selectedDay && (
                <Modal onClose={() => setSelectedDay(null)} title={`Day Details — ${selectedDay.date}`}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
                                <p className="text-xs text-gray-500">Total Sessions</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedDay.sessions.length}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
                                <p className="text-xs text-gray-500">Working Time</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatTime(selectedDay.workingTime / 1000)}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
                                <p className="text-xs text-gray-500">Idle Time</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatTime(selectedDay.idleTime / 1000)}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
                                <p className="text-xs text-gray-500">Screenshots</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedDay.screenshots}</p>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Sessions</h4>
                            <div className="space-y-3">
                                {selectedDay.sessions.map((s, idx) => (
                                    <div key={s._id || idx} className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-3 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <div>
                                                <p className="text-md font-medium text-gray-500 dark:text-gray-400">Session {idx + 1}</p>
                                                <p className="font-medium text-gray-900 dark:text-white">{new Date(s.sessionStart).toLocaleTimeString()} - {s.sessionEnd ? new Date(s.sessionEnd).toLocaleTimeString() : 'Ongoing'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-md font-medium text-gray-500 dark:text-gray-400">Productivity</p>
                                                <p className="font-semibold text-gray-900 dark:text-white">{calculateProductivity(s.workingTime, s.idleTime)}%</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Working</p>
                                                <p className="font-medium text-gray-900 dark:text-white">{formatTime(s.workingTime)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Idle</p>
                                                <p className="font-medium text-gray-900 dark:text-white">{formatTime(s.idleTime)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Screenshots</p>
                                                <p className="font-medium text-gray-900 dark:text-white">{s.screenshotCount || (s.screenshots?.length || 0)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Breaks</p>
                                                <p className="font-medium text-gray-900 dark:text-white">{s.breaksTaken || (s.breaks?.length || 0)}</p>
                                            </div>
                                        </div>

                                        {/* Application Usage in Day Details (New) */}
                                        {s.applications && s.applications.length > 0 && (
                                            <div className="mt-4">
                                                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Application Breakdown</p>
                                                <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg overflow-hidden border dark:border-slate-700">
                                                    <table className="w-full text-[11px] text-left">
                                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                                            {(() => {
                                                                const trackedTime = s.applications.reduce((sum, a) => sum + a.duration, 0);
                                                                const displayApps = [...s.applications].sort((a,b) => b.duration - a.duration);
                                                                if (s.workingTime > trackedTime + 5) {
                                                                    displayApps.push({ name: "Other", duration: s.workingTime - trackedTime, isUnaccounted: true });
                                                                }
                                                                return displayApps.map((app, aidx) => (
                                                                    <tr key={aidx}>
                                                                        <td className="px-3 py-1.5 font-medium text-gray-700 dark:text-gray-300">{app.name}</td>
                                                                        <td className="px-3 py-1.5 text-right font-bold text-gray-900 dark:text-gray-100">{formatTime(app.duration)}</td>
                                                                    </tr>
                                                                ));
                                                            })()}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {s.screenshots && s.screenshots.length > 0 && (
                                            <div className="mt-3">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleScreenshots(s._id || `session-${idx}`);
                                                    }}
                                                    className="flex items-center gap-2 px-4 py-2.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-all duration-300 text-sm font-bold w-full justify-center group border border-purple-200/50 dark:border-purple-800/30"
                                                >
                                                    <Activity className={`w-4 h-4 transition-transform duration-300 ${visibleScreenshots[s._id || `session-${idx}`] ? 'rotate-180' : ''}`} />
                                                    {visibleScreenshots[s._id || `session-${idx}`] ? 'Hide Screenshots' : 'View Screenshots'}
                                                    <span className="ml-1 px-2 py-0.5 bg-white/50 dark:bg-slate-800/50 rounded-full text-xs">
                                                        {s.screenshots.length}
                                                    </span>
                                                </button>
                                                
                                                {visibleScreenshots[s._id || `session-${idx}`] && (
                                                    <div className="mt-4 p-3 bg-gray-50/50 dark:bg-slate-900/40 rounded-xl border border-gray-100 dark:border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-300">
                                                        <ScreenshotViewer images={s.screenshots} />
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {s.breaks && s.breaks.length > 0 && (
                                            <div className="mt-3">
                                                <p className="text-sm text-gray-500">Breaks</p>
                                                <ul className="mt-1 text-sm">
                                                    {s.breaks.map((b, bi) => (
                                                        <li key={bi}>{new Date(b.start).toLocaleTimeString()} - {new Date(b.end).toLocaleTimeString()} ({formatTime((new Date(b.end) - new Date(b.start)) / 1000)})</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
