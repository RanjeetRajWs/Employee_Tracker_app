import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardStats } from "../services/api";
import { Users, Activity, Clock, TrendingUp, RefreshCw, Coffee, ExternalLink } from "lucide-react";
import StatCard from "../components/StatCard";
import { DashboardSkeleton } from "../components/LoadingSkeleton";
import { ROUTES } from "../constants";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await getDashboardStats();
      // Backend returns: { success: true, data: { totalUsers, activeUsers, ... } }
      const payload = response?.data;
      const normalized =
        (payload && (payload.data || payload.stats)) || payload || null;
      setStats(normalized);
      setError("");
    } catch (err) {
      setError("Failed to load dashboard stats");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6" style={{height: '87vh', overflowY: 'auto' }}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Welcome to the Employee Tracker Admin Panel
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          disabled={loading}
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-100 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard
            icon={Users}
            label="Total Users"
            value={stats.totalUsers || 0}
            color="blue"
          />
          <StatCard
            icon={Activity}
            label="Active Users (24h)"
            value={stats.activeUsers || 0}
            color="green"
          />
          <StatCard
            icon={Clock}
            label="Active Sessions"
            value={stats.activeSessions || 0}
            color="purple"
          />
          <StatCard
            icon={TrendingUp}
            label="Total Sessions"
            value={stats.totalSessions || 0}
            color="orange"
          />
          <StatCard
            icon={Coffee}
            label="Pending Breaks"
            value={stats.pendingBreaks || 0}
            color="amber"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <button
              onClick={() => navigate(ROUTES.USERS)}
              className="p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition text-center"
            >
              <Users className="mx-auto mb-2 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Manage Users
              </span>
            </button>
            <button
              onClick={() => navigate(ROUTES.TRACKING)}
              className="p-4 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition text-center"
            >
              <Activity className="mx-auto mb-2 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                View Tracking
              </span>
            </button>
            <button
              onClick={() => navigate(ROUTES.REPORTS)}
              className="p-4 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition text-center"
            >
              <TrendingUp className="mx-auto mb-2 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                View Reports
              </span>
            </button>
            <button
              onClick={() => navigate(ROUTES.SETTINGS)}
              className="p-4 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition text-center"
            >
              <Clock className="mx-auto mb-2 text-orange-600 dark:text-orange-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Settings
              </span>
            </button>
            <button
              onClick={() => navigate(ROUTES.BREAK_REQUESTS)}
              className="p-4 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition text-center relative"
            >
              <Coffee className="mx-auto mb-2 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Breaks
              </span>
              {stats?.pendingBreaks > 0 && (
                <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {stats.pendingBreaks}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Break Requests Notification */}
        {stats?.pendingBreaks > 0 ? (
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-lg p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600">
                <Coffee size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100">
                  {stats.pendingBreaks} Pending Break Request{stats.pendingBreaks > 1 ? 's' : ''}
                </h3>
                <p className="text-amber-700 dark:text-amber-400 text-sm">
                  Employees are waiting for break approvals.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(ROUTES.BREAK_REQUESTS)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition font-bold text-sm shadow-sm"
            >
              Review Now
              <ExternalLink size={16} />
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              System Status
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Server Status</span>
                <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-emerald-900 dark:text-emerald-200 rounded-full text-sm font-semibold">
                  Online
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Database</span>
                <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-emerald-900 dark:text-emerald-200 rounded-full text-sm font-semibold">
                  Connected
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Last Updated</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
