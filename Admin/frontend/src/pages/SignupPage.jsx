import React, { useState } from "react";
import { adminRegister } from "../services/api";
import { extractErrorMessage } from "../utils";
import { useAdmin } from "../context/AdminContext";
import AuthCard from "../components/ui/AuthCard";
import Button from "../components/ui/Button";

export default function SignupPage({ onBack }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { notify } = useAdmin();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await adminRegister(username, email, password, "admin");
      notify("Account created successfully — please login.", "success");
      if (onBack) onBack();
    } catch (err) {
      const message = extractErrorMessage(err);
      setError(message);
      notify(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Create Admin Account">
      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-100 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-4 p-3 bg-blue-50 dark:bg-slate-700 rounded border border-blue-200 dark:border-slate-600">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password Requirements:</p>
        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <li>• Minimum 8 characters</li>
          <li>• At least one uppercase letter</li>
          <li>• At least one lowercase letter</li>
          <li>• At least one number</li>
          <li>• At least one special character (@$!%*?&)</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={30}
            pattern="[a-zA-Z0-9_-]+"
            title="Username can only contain letters, numbers, underscores, and hyphens"
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"
            title="Password must meet all requirements listed above"
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          />
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" type="button" className="flex-1" onClick={onBack}>Back</Button>
          <Button variant="primary" type="submit" className="flex-1" disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </Button>
        </div>
      </form>
    </AuthCard>
  );
}
