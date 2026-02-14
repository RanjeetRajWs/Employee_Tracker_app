import React, { useState, useEffect } from "react";
import { confirmPasswordReset } from "../services/api";
import { extractErrorMessage } from "../utils";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import AuthCard from "../components/ui/AuthCard";
import Button from "../components/ui/Button";

export default function ResetPassword({ onBack }) {
    const [token, setToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // Extract token from URL query params
        const params = new URLSearchParams(window.location.search);
        const resetToken = params.get("token");
        if (resetToken) {
            setToken(resetToken);
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess(false);

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (!token) {
            setError("Invalid or missing reset token");
            return;
        }

        setLoading(true);
        try {
            await confirmPasswordReset(token, newPassword);
            setSuccess(true);
            setNewPassword("");
            setConfirmPassword("");

            // Redirect to login after 3 seconds
            setTimeout(() => {
                if (onBack) onBack();
            }, 3000);
        } catch (err) {
            const message = extractErrorMessage(err);
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <AuthCard title="Password Reset Successful">
                <div className="flex flex-col items-center justify-center py-8">
                    <div className="bg-green-100 dark:bg-green-900 p-4 rounded-full mb-4">
                        <CheckCircle className="text-green-600 dark:text-green-200" size={48} />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Password Reset Complete!
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-center mb-4">
                        Your password has been successfully reset.
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Redirecting to login page...
                    </p>
                </div>
            </AuthCard>
        );
    }

    return (
        <AuthCard title="Reset Your Password">
            <div className="flex justify-center mb-4">
                <div className="bg-blue-100 dark:bg-slate-700 p-3 rounded-full">
                    <Lock className="text-blue-600 dark:text-white" size={32} />
                </div>
            </div>

            <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
                Enter your new password below.
            </p>

            {error && (
                <div className="mb-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-100 px-4 py-3 rounded">
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Reset Token
                    </label>
                    <input
                        type="text"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="Enter reset token from email"
                        required
                        className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        New Password
                    </label>
                    <div className="relative">
                        <input
                            type={showNew ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={8}
                            pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"
                            title="Password must meet all requirements listed above"
                            className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        />
                        <button
                            type="button"
                            onClick={() => setShowNew(!showNew)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Confirm New Password
                    </label>
                    <div className="relative">
                        <input
                            type={showConfirm ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={8}
                            className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                    {loading ? "Resetting Password..." : "Reset Password"}
                </Button>
            </form>

            <div className="mt-6 text-center">
                <button
                    onClick={onBack}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                    Back to Login
                </button>
            </div>
        </AuthCard>
    );
}
