import React, { useState } from "react";
import { requestPasswordReset } from "../services/api";
import { extractErrorMessage } from "../utils";
import { Mail, ArrowLeft } from "lucide-react";
import AuthCard from "../components/ui/AuthCard";
import Button from "../components/ui/Button";

export default function ForgotPassword({ onBack }) {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess(false);
        setLoading(true);

        try {
            await requestPasswordReset(email);
            setSuccess(true);
            setEmail("");
        } catch (err) {
            const message = extractErrorMessage(err);
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthCard title="Reset Password">
            <div className="flex justify-center mb-4">
                <div className="bg-blue-100 dark:bg-slate-700 p-3 rounded-full">
                    <Mail className="text-blue-600 dark:text-white" size={32} />
                </div>
            </div>

            <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
                Enter your email address and we'll send you a password reset link.
            </p>

            {error && (
                <div className="mb-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-100 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-4 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-100 px-4 py-3 rounded">
                    Password reset link sent! Check your email for instructions.
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email Address
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@example.com"
                        required
                        className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    />
                </div>

                <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                    {loading ? "Sending..." : "Send Reset Link"}
                </Button>
            </form>

            <div className="mt-6 text-center">
                <button
                    onClick={onBack}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center gap-1 mx-auto"
                >
                    <ArrowLeft size={16} />
                    Back to Login
                </button>
            </div>
        </AuthCard>
    );
}
