import React from "react";
import { LayoutDashboard, Users, Activity, Settings, X, FileText, Key, Coffee, Clock, Calendar, User as UserIcon } from "lucide-react";
import { useAdmin } from "../context/AdminContext";
import { ROLES } from "../constants";

export default function Sidebar({
  currentPage,
  onNavigate,
  sidebarOpen,
  toggleSidebar,
}) {
  const { admin } = useAdmin();
  const role = admin?.role || ROLES.ADMIN;

  const adminItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "users", label: "User Management", icon: Users },
    { id: "tracking", label: "Tracking Data", icon: Activity },
    { id: "attendance", label: "Attendance", icon: Clock },
    { id: "leaves", label: "Leave Requests", icon: Calendar },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "breaks", label: "Break Requests", icon: Coffee },
    { id: "settings", label: "App Settings", icon: Settings },
  ];

  const userItems = [
    { id: "userDashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "profile", label: "My Profile", icon: UserIcon },
    { id: "attendance", label: "Attendance", icon: Clock },
  ];

  const menuItems = role === ROLES.USER ? userItems : adminItems;

  return (
    <>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-40"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={` border-r fixed lg:static inset-y-0 left-0 w-64 bg-white text-gray-900 dark:bg-slate-900 dark:text-white transform transition-transform duration-300 z-50 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {/* Close button for mobile */}
        <div className="lg:hidden flex justify-end p-4">
          <button onClick={toggleSidebar} className="text-gray-600 dark:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Logo */}
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold">Employee Tracker</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            {role === ROLES.USER ? 'Employee Dashboard' : 'Admin Control Panel'}
          </p>
        </div>

        {/* Menu Items */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                toggleSidebar(); // Close sidebar on mobile after click
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${currentPage === item.id
                ? "bg-blue-600 text-white"
                : "text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950">
          <p className="text-xs text-gray-500 dark:text-slate-400">Version 1.0.0</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">Connected: MongoDB ✓</p>
        </div>
      </aside>
    </>
  );
}
