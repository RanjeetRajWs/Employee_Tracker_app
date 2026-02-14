/**
 * Layout Component
 * Main layout wrapper with sidebar and navbar
 * @module components/Layout
 */

import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { ROUTES } from '../constants';

/**
 * Main Layout Component
 */
export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Get current page from route
  const getCurrentPage = () => {
    const path = location.pathname;
    if (path === ROUTES.DASHBOARD || path === '/') return 'dashboard';
    if (path === ROUTES.USER_DASHBOARD) return 'userDashboard';
    if (path === ROUTES.PROFILE) return 'profile';
    if (path === ROUTES.USERS) return 'users';
    if (path === ROUTES.TRACKING) return 'tracking';
    if (path === ROUTES.ATTENDANCE) return 'attendance';
    if (path === ROUTES.REPORTS) return 'reports';
    if (path === ROUTES.SETTINGS) return 'settings';
    if (path === ROUTES.CHANGE_PASSWORD) return 'change-password';
    if (path === ROUTES.BREAK_REQUESTS) return 'breaks';
    if (path === ROUTES.LEAVES) return 'leaves';
    return 'dashboard';
  };

  const currentPage = getCurrentPage();

  const handleNavigate = (page) => {
    const routeMap = {
      dashboard: ROUTES.DASHBOARD,
      userDashboard: ROUTES.USER_DASHBOARD,
      profile: ROUTES.PROFILE,
      users: ROUTES.USERS,
      tracking: ROUTES.TRACKING,
      attendance: ROUTES.ATTENDANCE,
      reports: ROUTES.REPORTS,
      settings: ROUTES.SETTINGS,
      'change-password': ROUTES.CHANGE_PASSWORD,
      breaks: ROUTES.BREAK_REQUESTS,
      leaves: ROUTES.LEAVES,
    };
    
    const route = routeMap[page];
    if (route) {
      navigate(route);
    }
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-slate-900 text-gray-900 dark:text-gray-100">
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        sidebarOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
      />

      <div className="flex flex-col flex-1 overflow-hidden h-full">
        <Navbar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          toggleSidebar={toggleSidebar}
          sidebarOpen={sidebarOpen}
        />

        <main className="flex-1 overflow-auto">
          <div className="p-6 mx-auto bg-white dark:bg-slate-800">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

