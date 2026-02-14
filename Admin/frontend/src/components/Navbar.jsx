import React from "react";
import { useAdmin } from "../context/AdminContext";
import { LogOut, Menu, X } from "lucide-react";
import ThemeToggle from "./ui/ThemeToggle";

export default function Navbar({
  currentPage,
  onNavigate,
  toggleSidebar,
  sidebarOpen,
}) {
  const { admin, logout } = useAdmin();

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 ">
      <div className="px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="lg:hidden text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {admin?.role === 'user' ? 'User Panel' : 'Admin Panel'}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {admin?.username || "Admin"}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                {admin?.role || "Administrator"}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 flex items-center gap-2 transition"
            >
              <LogOut size={20} /> Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
