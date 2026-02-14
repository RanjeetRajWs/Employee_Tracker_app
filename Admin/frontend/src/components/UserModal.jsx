import React, { useState } from "react";
import { createUser, updateUser } from "../services/api";
import { extractErrorMessage } from "../utils";
import { X } from "lucide-react";
import { useAdmin } from "../context/AdminContext";

export default function UserModal({ user, onClose, onSave }) {
  const { notify } = useAdmin();
  const [formData, setFormData] = useState(
    user || {
      username: "",
      email: "",
      password: "",
      role: "user",
    }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Get user ID - backend returns 'id' but some places may use '_id'
    const userId = user?.id || user?._id;

    try {
      if (userId) {
        // Update existing user
        await updateUser(userId, {
          username: formData.username,
          email: formData.email,
          role: formData.role,
        });
        notify("User updated successfully", "success");
        onSave();
        onClose();
      } else {
        // Create new user
        await createUser({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          role: "user", // Enforce user role for employees
        });
        notify("User created successfully", "success");
        onSave();
        onClose();
      }
    } catch (err) {
      const message = extractErrorMessage(err);
      setError(message);
      notify(message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Regular form for editing user
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 dark:text-gray-100 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b dark:border-slate-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {user ? "Edit User" : "Create New User"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded dark:bg-red-900 dark:border-red-700 dark:text-red-100">
            {error}
          </div>
        )}



        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white disabled:dark:bg-slate-600"
              required
              minLength={3}
              maxLength={30}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white disabled:dark:bg-slate-600"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Role
            </label>
            <input
              type="text"
              value="Employee"
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 dark:border-slate-600 dark:bg-slate-600 dark:text-gray-300"
            />
          </div>

          {!user && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                required
                minLength={6}
              />
            </div>
          )}

          {user && (
            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                <strong>Note:</strong> To change the password, the user should use the "Change Password" feature
                or request a password reset.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              {loading ? (user ? "Updating..." : "Creating...") : (user ? "Update User" : "Create User")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
