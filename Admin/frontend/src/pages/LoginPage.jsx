import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin } from "../services/api";
import { extractErrorMessage } from "../utils";
import { useAdmin } from "../context/AdminContext";
import { ROUTES, ROLES } from "../constants";
import SignupPage from "./SignupPage";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import { LogIn } from "lucide-react";
import AuthCard from "../components/ui/AuthCard";
import Button from "../components/ui/Button";

export default function LoginPage() {
  const navigate = useNavigate();
  const [view, setView] = useState("login"); // login, signup, forgot, reset
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, admin } = useAdmin();

  if (view === "signup") {
    return <SignupPage onBack={() => setView("login")} />;
  }

  if (view === "forgot") {
    return <ForgotPassword onBack={() => setView("login")} />;
  }

  if (view === "reset") {
    return <ResetPassword onBack={() => setView("login")} />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await adminLogin(email, password);
      // Backend returns: { success: true, data: { admin, token }, message: "..." }
      const responseData = response.data;
      const userData = responseData.data?.admin || responseData.admin;
      const tokenData = responseData.data?.token || responseData.token;
      
      if (!userData || !tokenData) {
        throw new Error('Invalid response from server');
      }
      
      // Update authentication state
      login(userData, tokenData);
      
      // Navigate immediately based on the freshly received role
      const dashboardRoute = userData.role === ROLES.USER ? ROUTES.USER_DASHBOARD : ROUTES.DASHBOARD;
      navigate(dashboardRoute, { replace: true });
      
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Admin Panel">
      <div className="flex justify-center mb-4">
        <div className="bg-blue-100 dark:bg-slate-700 p-3 rounded-full">
          <LogIn className="text-blue-600 dark:text-white" size={32} />
        </div>
      </div>

      <p className="text-center text-gray-600 dark:text-gray-300 mb-4">Employee Tracker Control Center</p>

      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-100 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            required
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
            <button
              type="button"
              onClick={() => setView("forgot")}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Forgot Password?
            </button>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            required
          />
        </div>

        <Button type="submit" variant="primary" className="w-full" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </Button>
      </form>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-slate-700 rounded border border-blue-200 dark:border-slate-600">
        <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-2">Demo Credentials:</p>
        <p className="text-xs text-gray-600 dark:text-gray-300">Email: <code>test@example.com</code></p>
        <p className="text-xs text-gray-600 dark:text-gray-300">Password: <code>Test123!@#</code></p>
      </div>

      <div className="mt-4 text-center space-y-2">
        <button onClick={() => setView("signup")} className="text-sm text-blue-600 dark:text-blue-400 hover:underline block w-full">
          Create an account
        </button>
        <button onClick={() => setView("reset")} className="text-xs text-gray-500 dark:text-gray-400 hover:underline block w-full">
          Have a reset token?
        </button>
      </div>
    </AuthCard>
  );
}
