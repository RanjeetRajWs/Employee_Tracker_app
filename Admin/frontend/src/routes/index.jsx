/**
 * Application Routes
 * Defines all application routes and route protection
 * @module routes
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { ROUTES } from '../constants';

// Pages
import LoginPage from '../pages/LoginPage';
import SignupPage from '../pages/SignupPage';
import Dashboard from '../pages/Dashboard';
import UserManagement from '../pages/UserManagement';
import TrackingView from '../pages/TrackingView';
import Attendance from '../pages/Attendance';
import Reports from '../pages/Reports';
import Settings from '../pages/Settings';
import BreakRequests from '../pages/BreakRequests';
import Leaves from '../pages/Leaves';
import ChangePassword from '../pages/ChangePassword';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import UserDashboard from '../pages/User/UserDashboard';
import UserProfile from '../pages/User/UserProfile';

// Layout
import Layout from '../components/Layout';
import { ROLES } from '../constants';

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 * Also handles role-based access
 */
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, admin } = useAdmin();
  
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(admin?.role)) {
    return <Navigate to={admin?.role === ROLES.USER ? ROUTES.USER_DASHBOARD : ROUTES.DASHBOARD} replace />;
  }
  
  return children;
};

/**
 * Public Route Component
 * Redirects to dashboard if user is already authenticated
 */
const PublicRoute = ({ children }) => {
  const { isAuthenticated, admin } = useAdmin();
  
  if (isAuthenticated) {
    const dashboardRoute = admin?.role === ROLES.USER ? ROUTES.USER_DASHBOARD : ROUTES.DASHBOARD;
    return <Navigate to={dashboardRoute} replace />;
  }
  
  return children;
};

/**
 * Main App Routes
 */
export const AppRoutes = () => {
  const { admin, isAuthenticated } = useAdmin();

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path={ROUTES.LOGIN}
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path={ROUTES.SIGNUP}
        element={
          <PublicRoute>
            <SignupPage />
          </PublicRoute>
        }
      />
      <Route
        path={ROUTES.FORGOT_PASSWORD}
        element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        }
      />
      <Route
        path={ROUTES.RESET_PASSWORD}
        element={
          <PublicRoute>
            <ResetPassword />
          </PublicRoute>
        }
      />

      {/* Protected Routes with Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to={admin?.role === ROLES.USER ? 'user/dashboard' : 'dashboard'} replace />} />
        
        {/* Admin Only Routes */}
        <Route 
          path="dashboard" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.MANAGER]}>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="users" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPERADMIN, ROLES.ADMIN]}>
              <UserManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="tracking" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.MANAGER]}>
              <TrackingView />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="attendance" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.MANAGER]}>
              <Attendance />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="reports" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.MANAGER]}>
              <Reports />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="settings" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPERADMIN, ROLES.ADMIN]}>
              <Settings />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="breaks" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.MANAGER]}>
              <BreakRequests />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="leaves" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.MANAGER]}>
              <Leaves />
            </ProtectedRoute>
          } 
        />

        {/* User Specific Routes */}
        <Route 
          path="user/dashboard" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.USER]}>
              <UserDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="user/profile" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.USER]}>
              <UserProfile />
            </ProtectedRoute>
          } 
        />

        <Route path="change-password" element={<ChangePassword />} />
      </Route>

      {/* Catch all - redirect to appropriate dashboard or login */}
      <Route path="*" element={<Navigate to={!isAuthenticated ? ROUTES.LOGIN : (admin?.role === ROLES.USER ? ROUTES.USER_DASHBOARD : ROUTES.DASHBOARD)} replace />} />
    </Routes>
  );
};

