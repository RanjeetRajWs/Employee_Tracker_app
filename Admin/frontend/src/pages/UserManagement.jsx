import React, { useState, useEffect } from "react";
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../services/api";
import { extractErrorMessage } from "../utils";
import { socket, emitMessage } from "../services/socket";
import {
  Users,
  Search,
  Plus,
  Trash2,
  Edit,
  Loader,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Camera,
} from "lucide-react";
import UserModal from "../components/UserModal";
import ConfirmModal from "../components/ConfirmModal";
import { useAdmin } from "../context/AdminContext";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmState, setConfirmState] = useState({ show: false, action: null, userId: null, busy: false, message: '' });
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [limit] = useState(10);

  const { notify } = useAdmin();

  useEffect(() => {
    fetchUsers();
  }, [currentPage, roleFilter, statusFilter]);

  // Handle debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        fetchUsers();
      } else {
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const handleStatusChange = ({ userId, status }) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        if (status === 'online') next.add(userId);
        else next.delete(userId);
        return next;
      });
    };

    const handleInitialOnlineUsers = (userIds) => {
      // console.log('👥 Initial online users received:', userIds);
      setOnlineUsers(new Set(userIds));
    };

    socket.on('employee-status-changed', handleStatusChange);
    socket.on('initial-online-users', handleInitialOnlineUsers);

    // Request current online users in case we missed the initial emission
    socket.emit('get-online-users');

    return () => {
      socket.off('employee-status-changed', handleStatusChange);
      socket.off('initial-online-users', handleInitialOnlineUsers);
    };
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = { page: currentPage, limit, };

      if (roleFilter !== "all") params.role = roleFilter;
      if (statusFilter !== "all") {
        if (statusFilter === "online") {
          params.isOnline = true;
        } else {
          params.isActive = statusFilter === "active";
        }
      }
      if (searchTerm) params.search = searchTerm;

      const response = await getAllUsers(params);
      const data = response.data;
      // console.log("🚀 ~ fetchUsers ~ data:", data)
      setUsers(data.data || []);
      setTotalPages(data.pagination.totalPages || 1);
      setTotalUsers(data.pagination.total || 0);
      setError("");
    } catch (err) {
      setError(extractErrorMessage(err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (userId) => {
    // console.log("🚀 ~ handleEdit ~ userId:", userId)
    try {
      const response = await getUserById(userId);
      setSelectedUser(response.data.data.user);
      setShowModal(true);
    } catch (err) {
      notify(extractErrorMessage(err), "error");
    }
  };

  const handleDelete = (userId) => {
    setConfirmState({
      show: true,
      action: 'delete',
      userId,
      busy: false,
      message: 'This will deactivate the user. They will no longer be able to log in.'
    });
  };

  const performConfirmAction = async () => {
    const { action, userId } = confirmState;
    setConfirmState(s => ({ ...s, busy: true }));
    try {
      if (action === 'delete') {
        await deleteUser(userId);
        notify('User deactivated successfully', 'success');
      }
      await fetchUsers();
      setError('');
    } catch (err) {
      const message = extractErrorMessage(err);
      setError(message);
      notify(message, 'error');
    } finally {
      setConfirmState({ show: false, action: null, userId: null, busy: false, message: '' });
    }
  };

  const getStatusColor = (isActive) => {
    return isActive ? "bg-green-100 text-green-800 dark:bg-emerald-900 dark:text-emerald-200" : "bg-red-100 text-red-800 dark:bg-rose-900 dark:text-rose-200";
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "superadmin":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "admin":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "manager":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-200";
    }
  };

  // No client-side filtering needed anymore
  const filteredUsers = users;

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{height: '87vh', overflowY: 'auto' }}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage admin users and permissions</p>
        </div>
        <button
          onClick={() => {
            setSelectedUser(null);
            setShowModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 transition"
        >
          <Plus size={20} /> Add User
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-100 px-4 py-3 rounded flex items-center gap-2">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 space-y-4">
          {/* Search */}
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-700 rounded-lg px-4 py-2">
            <Search size={20} className="text-gray-400 dark:text-gray-300" />
            <input
              type="text"
              placeholder="Search by email or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Roles</option>
                <option value="superadmin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="user">User</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="online">Online</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700 border-b dark:border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-8 text-center text-gray-500 dark:text-gray-300"
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                    <td className="px-6 py-3 text-sm text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        {user.username || "N/A"}
                        {onlineUsers.has(user.id) && (
                          <div className="flex items-center gap-1.5 ml-2">
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                            </span>
                            <span className="text-[10px] font-medium text-green-600 dark:text-green-400 uppercase tracking-wider">Online</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {user.email}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(
                          user.role
                        )}`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          user.isActive
                        )}`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {user.lastLogin
                        ? new Date(user.lastLogin).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="px-6 py-3 text-sm font-medium">
                      {onlineUsers.has(user.id) ? (
                        <span className="text-green-600 dark:text-green-400">Active Now</span>
                      ) : (
                        <span className="text-gray-600 dark:text-gray-400">
                          {user.lastActive
                            ? new Date(user.lastActive).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : "Never"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm flex gap-2">
                      <button
                        onClick={() => handleEdit(user.id)}
                        className="text-blue-600 hover:text-blue-800 transition"
                        title="Edit"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => {
                          emitMessage("take-screenshot", {}, "project4", user.id);
                          notify(`Screenshot requested for ${user.username || user.email}`, "success");
                        }}
                        disabled={!onlineUsers.has(user.id)}
                        className={`transition ${onlineUsers.has(user.id) ? 'text-green-600 hover:text-green-800' : 'text-gray-300 cursor-not-allowed'}`}
                        title={onlineUsers.has(user.id) ? "Capture Screen Now" : "User is offline"}
                      >
                        <Camera size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 hover:text-red-800 transition"
                        title="Deactivate"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 bg-gray-50 border-t dark:bg-slate-700 dark:border-slate-700 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Showing {filteredUsers.length} of {totalUsers} user{totalUsers !== 1 ? "s" : ""}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-slate-600"
            >
              <ChevronLeft size={18} />
            </button>

            <span className="text-sm text-gray-600 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-slate-600"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <UserModal
          user={selectedUser}
          onClose={() => setShowModal(false)}
          onSave={fetchUsers}
        />
      )}

      <ConfirmModal
        open={confirmState.show}
        title={confirmState.action === 'delete' ? 'Deactivate User' : 'Confirm'}
        message={confirmState.message}
        busy={confirmState.busy}
        onCancel={() => setConfirmState({ show: false, action: null, userId: null, busy: false, message: '' })}
        onConfirm={performConfirmAction}
      />
    </div>
  );
}
