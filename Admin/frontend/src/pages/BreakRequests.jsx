import React, { useState, useEffect } from "react";
import { Coffee, CheckCircle, XCircle, Clock, User, Filter, ChevronDown, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { getAllBreaks, processBreakRequest, getAllUsers } from "../services/api";

import { useAdmin } from "../context/AdminContext";

export default function BreakRequests() {
  const { notify } = useAdmin();
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetchingData, setFetchingData] = useState(false);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [adminNotes, setAdminNotes] = useState({});
  const [filterUser, setFilterUser] = useState("");
  const [activeTab, setActiveTab] = useState("approved");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [limit] = useState(10);

  // Stats for tab badges (fetched separately without pagination)
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchBreaks();
  }, [activeTab, filterUser, currentPage]);

  const fetchInitialData = async () => {
    try {
      setInitialLoading(true);
      const usersRes = await getAllUsers();
      setUsers(usersRes.data.data || []);
      
      // Fetch stats for all statuses
      await fetchStats();
      await fetchBreaks();
    } catch (err) {
      setError("Failed to load data");
      console.error(err);
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        getAllBreaks({ status: 'pending', page: 1, limit: 1 }),
        getAllBreaks({ status: 'approved', page: 1, limit: 1 }),
        getAllBreaks({ status: 'rejected', page: 1, limit: 1 })
      ]);
      
      setStats({
        pending: pendingRes.data.pagination?.total || 0,
        approved: approvedRes.data.pagination?.total || 0,
        rejected: rejectedRes.data.pagination?.total || 0
      });
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  };

  const fetchBreaks = async () => {
    try {
      setFetchingData(true);
      const params = {
        status: activeTab,
        page: currentPage,
        limit: limit
      };
      
      if (filterUser) params.userId = filterUser;

      const response = await getAllBreaks(params);
      const data = response.data;
      
      setRequests(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalRecords(data.pagination?.total || 0);
      setError("");
    } catch (err) {
      setError("Failed to load breaks");
      console.error("Failed to fetch breaks", err);
    } finally {
      setFetchingData(false);
    }
  };

  const handleAction = async (id, status) => {
    try {
      setProcessingId(id);
      const notes = adminNotes[id] || "";
      await processBreakRequest(id, status, notes);
      
      // Refresh data
      await fetchStats();
      await fetchBreaks();
      setAdminNotes(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      notify("Failed to process request: " + (err.response?.data?.error || err.message), 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleNoteChange = (id, value) => {
    setAdminNotes(prev => ({ ...prev, [id]: value }));
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setCurrentPage(1); // Reset to page 1 when changing tabs
  };

  const handleUserFilterChange = (userId) => {
    setFilterUser(userId);
    setCurrentPage(1); // Reset to page 1 when changing filter
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const tabs = [
    { id: 'pending', label: 'Pending', count: stats.pending, icon: Clock, color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-900/20' },
    { id: 'approved', label: 'Approved', count: stats.approved, icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-50 dark:bg-green-900/20' },
    { id: 'rejected', label: 'Rejected', count: stats.rejected, icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-50 dark:bg-red-900/20' },
  ];

  const RequestTable = ({ data, type }) => {
    if (data.length === 0 && !fetchingData) {
      return (
        <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900/50 rounded-full flex items-center justify-center mb-4">
             <Coffee className="text-gray-300" size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No {type} requests</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Everything is current for this category.</p>
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden relative">
        {fetchingData && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b dark:border-slate-700">
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Timing</th>
                <th className="px-6 py-4">Reason</th>
                {type === 'pending' ? <th className="px-6 py-4">Response</th> : <th className="px-6 py-4">Admin Notes</th>}
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-700">
              {data.map((req) => (
                <tr key={req._id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold ring-2 ring-white dark:ring-slate-800">
                        {req.userName?.[0] || 'U'}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white truncate max-w-[150px]">{req.userName}</div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{formatDate(req.requestedAt)} @ {formatTime(req.requestedAt)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="font-black text-gray-900 dark:text-white text-sm">
                        {formatTime(req.startTime)} - {formatTime(req.endTime)}
                      </span>
                      <span className="text-[10px] text-amber-600 font-bold uppercase tracking-tight">{req.duration} mins duration</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="max-w-[220px]">
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 italic leading-relaxed">"{req.reason}"</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {type === 'pending' ? (
                      <textarea
                        value={adminNotes[req._id] || ""}
                        onChange={(e) => handleNoteChange(req._id, e.target.value)}
                        placeholder="Add response notes..."
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all text-sm resize-none h-12 min-w-[220px]"
                      />
                    ) : (
                      <div className="max-w-[220px]">
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{req.adminNotes || "No notes."}</p>
                        {req.processedAt && (
                          <div className="text-[9px] text-gray-400 uppercase tracking-tighter mt-1.5 font-bold">Processed: {formatDate(req.processedAt)} {formatTime(req.processedAt)}</div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    {type === 'pending' ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleAction(req._id, "rejected")}
                          disabled={processingId === req._id}
                          className="p-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-100 dark:hover:border-red-900/30 transition-all disabled:opacity-50"
                          title="Reject"
                        >
                          <XCircle size={20} />
                        </button>
                        <button
                          onClick={() => handleAction(req._id, "approved")}
                          disabled={processingId === req._id}
                          className="p-2.5 rounded-xl text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 border border-transparent hover:border-green-100 dark:hover:border-green-900/30 transition-all disabled:opacity-50"
                          title="Approve"
                        >
                          <CheckCircle size={20} />
                        </button>
                      </div>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        type === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {type === 'approved' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {type}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-2" style={{ height: '87vh', overflowY: 'auto', paddingRight: '8px' }}>
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                <Coffee className="text-amber-600" size={24} />
             </div>
             <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
               Break Requests
             </h1>
          </div>
          {/* <p className="text-gray-500 dark:text-gray-400 font-medium">
            Manage employee downtime and approval workflows.
          </p> */}
        </div>

        <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select
              value={filterUser}
              onChange={(e) => handleUserFilterChange(e.target.value)}
              className="pl-11 pr-10 py-2.5 rounded-xl border-none bg-slate-50 dark:bg-slate-900/50 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none cursor-pointer min-w-[220px] text-gray-700 dark:text-gray-200"
            >
              <option value="">All Employees</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>
          
          <div className="w-[1px] h-8 bg-gray-100 dark:bg-slate-700" />

          <button 
            onClick={() => {
              fetchStats();
              fetchBreaks();
            }}
            disabled={fetchingData}
            className={`p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all ${fetchingData ? 'animate-spin' : ''}`}
            title="Refresh Data"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 px-6 py-4 rounded-2xl flex items-center gap-3 font-bold">
          <XCircle size={20} />
          {error}
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b dark:border-slate-700 pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2.5 px-6 py-4 border-b-2 transition-all relative font-bold text-sm ${
                isActive 
                  ? `${tab.color} border-current` 
                  : 'text-gray-400 border-transparent hover:text-gray-600 dark:hover:text-gray-200'
              }`}
            >
              <Icon size={18} />
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isActive ? tab.bgColor : 'bg-gray-100 dark:bg-slate-800 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tab Content */}
      <div className="space-y-6">
        <RequestTable data={requests} type={activeTab} />

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 px-6 py-4">
            <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">
              Showing <span className="font-bold text-gray-900 dark:text-white">{requests.length}</span> of <span className="font-bold text-gray-900 dark:text-white">{totalRecords}</span> records
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || fetchingData}
                className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700 transition-all text-gray-700 dark:text-gray-200"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="flex items-center gap-2">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      disabled={fetchingData}
                      className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'
                      } disabled:opacity-40`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || fetchingData}
                className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700 transition-all text-gray-700 dark:text-gray-200"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Page <span className="font-bold text-gray-900 dark:text-white">{currentPage}</span> of <span className="font-bold text-gray-900 dark:text-white">{totalPages}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
