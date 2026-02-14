import { useState } from "react";
import { useAuth } from "../../context/useAuth";
import { Eye, EyeOff, Lock } from "lucide-react";

export default function ChangePassword() {
    const { user, changePassword, logout } = useAuth();
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess(false);
        setLoading(true);

        // Validation
        if (!oldPassword || !newPassword || !confirmPassword) {
            setError("Please fill in all fields");
            setLoading(false);
            return;
        }

        if (newPassword.length < 8) {
            setError("New password must be at least 8 characters");
            setLoading(false);
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match");
            setLoading(false);
            return;
        }

        if (oldPassword === newPassword) {
            setError("New password must be different from old password");
            setLoading(false);
            return;
        }

        try {
            const { error } = await changePassword(oldPassword, newPassword);
            if (error) {
                setError(error);
            } else {
                setSuccess(true);
                // Redirect to dashboard after 2 seconds
                setTimeout(() => {
                    window.location.hash = "#/dashboard";
                }, 2000);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        window.location.hash = "#/login";
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Dynamic Background Elements */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/10 blur-[120px] rounded-full animate-pulse-slow"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

            <div className="w-full max-w-[480px] z-10 animate-slide-up">
                <div className="bg-white/[0.03] backdrop-blur-xl rounded-[32px] p-8 md:p-10 border border-white/10 shadow-2xl shadow-black/50">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-amber-500 to-amber-400 rounded-2xl mb-6 shadow-lg shadow-amber-500/20 rotate-3 transform transition-transform hover:rotate-6">
                            <Lock className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-white mb-3 tracking-tight uppercase italic leading-none">
                            Credential Reset
                        </h1>
                        <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">
                            {user?.tempPassword
                                ? "Mandatory temporary password replacement"
                                : "Security protocol upgrade required"}
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl animate-fade-in">
                            <p className="text-sm text-rose-400 font-bold text-center">{error}</p>
                        </div>
                    )}

                    {/* Success Message */}
                    {success && (
                        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl animate-fade-in">
                            <p className="text-sm text-emerald-400 font-bold text-center">
                                Telemetry Link Restored. Redirecting...
                            </p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleChangePassword} className="space-y-6">
                        {/* Current Password */}
                        <div className="space-y-2">
                            <label htmlFor="oldPassword" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                Existing Key
                            </label>
                            <div className="relative group">
                                <input
                                    id="oldPassword"
                                    type={showOldPassword ? "text" : "password"}
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    placeholder="Enter current password"
                                    className="w-full bg-white/[0.05] border border-white/10 text-white px-5 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all placeholder:text-slate-600 font-medium group-hover:bg-white/[0.08]"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowOldPassword(!showOldPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-2"
                                >
                                    {showOldPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* New Password */}
                        <div className="space-y-2">
                            <label htmlFor="newPassword" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                Next-Gen Identifier
                            </label>
                            <div className="relative group">
                                <input
                                    id="newPassword"
                                    type={showNewPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Minimum 8 characters"
                                    className="w-full bg-white/[0.05] border border-white/10 text-white px-5 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all placeholder:text-slate-600 font-medium group-hover:bg-white/[0.08]"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-2"
                                >
                                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <label htmlFor="confirmPassword" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                Verify Identifier
                            </label>
                            <div className="relative group">
                                <input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Duplicate for verification"
                                    className="w-full bg-white/[0.05] border border-white/10 text-white px-5 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all placeholder:text-slate-600 font-medium group-hover:bg-white/[0.08]"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-2"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex flex-col gap-3 pt-4">
                            <button
                                type="submit"
                                disabled={loading || success}
                                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>RE-ENCRYPTING...</span>
                                    </>
                                ) : (
                                    "Authorize Update"
                                )}
                            </button>

                            <button
                                onClick={handleLogout}
                                type="button"
                                className="w-full py-4 bg-white/[0.05] border border-white/10 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/[0.08] hover:text-white transition-all active:scale-[0.98]"
                            >
                                De-Authorize Session
                            </button>
                        </div>
                    </form>

                    {/* Requirements */}
                    <div className="mt-8 p-5 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-3">Protocol Requirements</p>
                        <ul className="text-[11px] text-slate-500 font-bold space-y-2 list-none">
                            <li className="flex items-center gap-2 italic">
                                <div className="w-1 h-1 bg-blue-500 rounded-full" />
                                {"> 8 Character Entropy"}
                            </li>
                            <li className="flex items-center gap-2 italic">
                                <div className="w-1 h-1 bg-blue-500 rounded-full" />
                                {"Distinct from previous key"}
                            </li>
                            <li className="flex items-center gap-2 italic text-slate-600">
                                <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                                {"High complexity recommended"}
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="text-center mt-10">
                    <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">
                        Security Verification Node v1.2.0 • End-to-End Encryption Enabled
                    </p>
                </div>
            </div>
        </div>
    );
}
