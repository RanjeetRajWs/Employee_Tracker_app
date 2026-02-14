import { useState } from "react";
import { useAuth } from "../../context/useAuth";
import { Eye, EyeOff, ShieldCheck, Lock, Mail, ArrowRight, Loader2 } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Credentials required for authentication");
      setLoading(false);
      return;
    }

    try {
      const { error, tempPassword } = await login(email, password);
      if (error) {
        setError(error);
      } else {
        if (tempPassword) {
          window.location.hash = "#/change-password";
        } else {
          window.location.hash = "#/dashboard";
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--ui-bg))] flex items-center justify-center p-6 transition-colors duration-300 font-sans titlebar-drag">
      <div className="w-full max-w-[420px] animate-slide-up titlebar-nodrag space-y-8">
        {/* Minimalist Branding */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-600/20">
            <span className="text-xl font-black text-white italic tracking-tighter">ET</span>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-[rgb(var(--ui-text-main))] tracking-tight uppercase italic">
              System Authorization
            </h1>
            <p className="text-[10px] text-[rgb(var(--ui-text-muted))] font-bold uppercase tracking-[0.4em] opacity-60">
              Enterprise Secure Node v1.2
            </p>
          </div>
        </div>

        <div className="prof-card p-10 space-y-8 h-full">
          {error && (
            <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl animate-fade-in flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <p className="text-[10px] text-rose-500 font-black uppercase tracking-wider">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[9px] font-black text-[rgb(var(--ui-text-muted))] uppercase tracking-[0.2em] ml-1">
                Identity Assignment
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgb(var(--ui-text-muted))] group-focus-within:text-indigo-600">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ID_CREDENTIAL@ORG.COM"
                  className="prof-input pl-12 text-xs font-bold uppercase tracking-wider placeholder:text-[rgb(var(--ui-text-muted))]/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[9px] font-black text-[rgb(var(--ui-text-muted))] uppercase tracking-[0.2em] ml-1">
                Security Key
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgb(var(--ui-text-muted))] group-focus-within:text-indigo-600">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="prof-input pl-12 pr-12 text-xs font-bold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--ui-text-muted))] hover:text-indigo-600 p-2"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="prof-btn-primary w-full py-4 text-[10px] uppercase tracking-[0.3em] font-black flex items-center justify-center gap-3 mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Initialize Auth</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          <div className="pt-8 border-t border-[rgb(var(--ui-border))] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/5 flex items-center justify-center text-indigo-600 border border-indigo-600/10">
                <ShieldCheck size={16} />
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] text-[rgb(var(--ui-text-main))] font-black uppercase tracking-widest">TLS 1.3 Active</p>
                <p className="text-[7px] text-[rgb(var(--ui-text-muted))] font-bold uppercase tracking-tighter">Identity Encrypted</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-[8px] text-[rgb(var(--ui-text-muted))] font-bold uppercase tracking-[0.5em] opacity-40">
          Precision Metrics &bull; 2026 Edition
        </p>
      </div>
    </div>
  );
}
