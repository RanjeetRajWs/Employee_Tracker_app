import React, { useState, useEffect } from "react";
import { 
  Calendar, CheckCircle, XCircle, Clock, User, Filter, 
  ChevronDown, RefreshCw, FileText, ChevronLeft, ChevronRight, Eye 
} from "lucide-react";
import { getAllLeavesAdmin, updateLeaveStatus, getAllUsers } from "../services/api";

import { useAdmin } from "../context/AdminContext";

export default function Leaves() {
  const { notify } = useAdmin();
  const [leaves, setLeaves] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [activeTab, setActiveTab] = useState("Pending");
  const [filterUser, setFilterUser] = useState("");
  const [adminNotes, setAdminNotes] = useState({});

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchLeaves();
  }, [activeTab, filterUser]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const usersRes = await getAllUsers();
      setUsers(usersRes.data.data || []);
      await fetchLeaves();
    } catch (err) {
      setError("Failed to initialize data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaves = async () => {
    try {
      setFetching(true);
      const params = { status: activeTab };
      if (filterUser) params.userId = filterUser;
      
      const res = await getAllLeavesAdmin(params);
      setLeaves(res.data.data || []);
    } catch (err) {
      setError("Failed to fetch leave requests");
    } finally {
      setFetching(false);
    }
  };

  const handleAction = async (id, status) => {
    try {
      setProcessingId(id);
      await updateLeaveStatus(id, { 
        status, 
        adminComment: adminNotes[id] || "" 
      });
      
      // Refresh
      await fetchLeaves();
      setAdminNotes(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      notify("Action failed: " + (err.response?.data?.error || err.message), 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDayDiff = (start, end) => {
    const diff = Math.abs(new Date(end) - new Date(start));
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const tabs = [
    { id: 'Pending', icon: Clock, color: 'text-amber-500', bgColor: 'bg-amber-50' },
    { id: 'Approved', icon: CheckCircle, color: 'text-emerald-500', bgColor: 'bg-emerald-50' },
    { id: 'Rejected', icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-50' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
            <Calendar className="text-indigo-600" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Leave Management</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="pl-9 pr-10 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Employees</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={fetchLeaves}
            className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
          >
            <RefreshCw size={20} className={fetching ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-4 border-b-2 font-semibold text-sm transition ${
              activeTab === tab.id 
                ? `${tab.color} border-current` 
                : 'text-slate-400 border-transparent hover:text-slate-600'
            }`}
          >
            <tab.icon size={18} />
            {tab.id}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Employee</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Type & Duration</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Dates</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Reason</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Document</th>
                {activeTab === 'Pending' ? (
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Response</th>
                ) : (
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Admin Note</th>
                )}
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                    No leave requests found.
                  </td>
                </tr>
              ) : (
                leaves.map((leave) => (
                  <tr key={leave._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                          {leave.userId?.username?.[0] || 'U'}
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {leave.userId?.username || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{leave.leaveType}</span>
                        <span className="text-xs text-slate-500">
                          {leave.isHalfDay ? 'Half Day' : `${getDayDiff(leave.fromDate, leave.toDate)} Days`}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        {formatDate(leave.fromDate)} 
                        {!leave.isHalfDay && ` - ${formatDate(leave.toDate)}`}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600 dark:text-slate-400 italic line-clamp-1 max-w-[150px]">
                        "{leave.reason}"
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {leave.document ? (
                        <a 
                          href={`${import.meta.env.VITE_ADMIN_API_URL?.replace('/admin', '')}/${leave.document}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-medium text-xs"
                        >
                          <Eye size={14} /> View Doc
                        </a>
                      ) : (
                        <span className="text-slate-300 text-xs">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {activeTab === 'Pending' ? (
                        <input
                          type="text"
                          placeholder="Short comment..."
                          value={adminNotes[leave._id] || ""}
                          onChange={(e) => setAdminNotes({...adminNotes, [leave._id]: e.target.value})}
                          className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      ) : (
                        <p className="text-xs text-slate-500 italic max-w-[150px] line-clamp-1">
                          {leave.adminComment || "No comment."}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {activeTab === 'Pending' ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleAction(leave._id, 'Rejected')}
                            disabled={processingId === leave._id}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Reject"
                          >
                            <XCircle size={18} />
                          </button>
                          <button
                            onClick={() => handleAction(leave._id, 'Approved')}
                            disabled={processingId === leave._id}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="Approve"
                          >
                            <CheckCircle size={18} />
                          </button>
                        </div>
                      ) : (
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          leave.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {leave.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
