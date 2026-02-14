import { useTracking } from "../../context/useTracking";
import { useAuth } from "../../context/useAuth";
import { User, Mail, Shield, Calendar as CalendarIcon, Clock, Activity } from "lucide-react";

function formatTime(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export default function Profile(): JSX.Element {
  const { trackingData } = useTracking();
  const { user } = useAuth();

  const totalTime = trackingData.workingTime + trackingData.idleTime;
  const utilizationRate = totalTime > 0 ? (trackingData.workingTime / totalTime) * 100 : 0;

  const appUser = localStorage.getItem('appUser');
  const backendUser = appUser ? JSON.parse(appUser) : null;

  const userData = {
    name: backendUser?.username || user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User",
    role: "Professional Associate",
    email: backendUser?.email || user?.email || "",
    userId: backendUser?.id || backendUser?.userId || "N/A",
    lastAuth: backendUser?.lastLogin ? new Date(backendUser.lastLogin).toLocaleString() : "N/A"
  };

  return (
    <div className="space-y-10 animate-fade-in font-sans">
      <div className="space-y-1">
        <h1 className="text-3xl font-black text-[rgb(var(--ui-text-main))] tracking-tight uppercase italic">
          Identity Records
        </h1>
        <p className="text-[10px] font-bold text-[rgb(var(--ui-text-muted))] uppercase tracking-[0.4em]">Administrative Profile Data</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Verification Card */}
        <div className="lg:col-span-4 space-y-8">
            <div className="prof-card p-10 flex flex-col items-center text-center space-y-8">
                <div className="w-24 h-24 rounded-3xl bg-indigo-600 flex items-center justify-center text-white text-3xl font-black italic shadow-xl shadow-indigo-600/20">
                    {userData.name.charAt(0)}
                </div>
                
                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-[rgb(var(--ui-text-main))] uppercase italic tracking-tight">{userData.name}</h2>
                    <span className="px-4 py-1 rounded-full bg-indigo-500/5 border border-indigo-600/20 text-[9px] font-black text-indigo-600 uppercase tracking-widest">
                        {userData.role}
                    </span>
                </div>

                <div className="w-full space-y-6 pt-6 border-t border-[rgb(var(--ui-border))]">
                    <div className="flex items-center gap-4 text-left">
                        <div className="w-10 h-10 rounded-xl bg-[rgb(var(--ui-surface))] border border-[rgb(var(--ui-border))] flex items-center justify-center text-[rgb(var(--ui-text-muted))]">
                            <Mail size={18} />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                            <p className="text-[8px] font-black text-[rgb(var(--ui-text-muted))] uppercase tracking-widest">Network Identity</p>
                            <p className="text-xs font-bold text-[rgb(var(--ui-text-main))] truncate">{userData.email}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-left">
                        <div className="w-10 h-10 rounded-xl bg-[rgb(var(--ui-surface))] border border-[rgb(var(--ui-border))] flex items-center justify-center text-[rgb(var(--ui-text-muted))]">
                            <Shield size={18} />
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[8px] font-black text-[rgb(var(--ui-text-muted))] uppercase tracking-widest">Administrative ID</p>
                            <p className="text-xs font-bold text-[rgb(var(--ui-text-main))] truncate">#{userData.userId}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="prof-card p-6 bg-indigo-600 text-white border-transparent">
                <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">Security Note</p>
                <p className="text-[10px] font-medium leading-relaxed italic">
                    Identity records are synchronized with the central governance node to ensure system integrity and compliance.
                </p>
            </div>
        </div>

        {/* Operational Metrics */}
        <div className="lg:col-span-8 flex flex-col gap-8">
            <div className="prof-card p-10 h-full flex flex-col justify-between">
                <div className="space-y-10">
                    <div className="space-y-1">
                        <h3 className="text-xl font-black text-[rgb(var(--ui-text-main))] uppercase italic tracking-tight">Utilization Indices</h3>
                        <p className="text-[9px] font-bold text-[rgb(var(--ui-text-muted))] uppercase tracking-[0.2em]">Real-time shift metrics verification</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="p-6 bg-[rgb(var(--ui-surface))] border border-[rgb(var(--ui-border))] rounded-2xl space-y-4">
                            <div className="flex items-center gap-3 text-indigo-600">
                                <Clock size={16} />
                                <span className="text-[9px] font-black uppercase tracking-widest">Active Duty</span>
                            </div>
                            <p className="text-3xl font-black text-[rgb(var(--ui-text-main))] tabular-nums italic leading-none">{formatTime(trackingData.workingTime)}</p>
                        </div>
                        <div className="p-6 bg-[rgb(var(--ui-surface))] border border-[rgb(var(--ui-border))] rounded-2xl space-y-4">
                            <div className="flex items-center gap-3 text-amber-500">
                                <Activity size={16} />
                                <span className="text-[9px] font-black uppercase tracking-widest">Log Duration</span>
                            </div>
                            <p className="text-3xl font-black text-[rgb(var(--ui-text-main))] tabular-nums italic leading-none">{formatTime(trackingData.idleTime)}</p>
                        </div>
                        <div className="p-6 bg-[rgb(var(--ui-surface))] border border-[rgb(var(--ui-border))] rounded-2xl space-y-4">
                            <div className="flex items-center gap-3 text-emerald-500">
                                <Shield size={16} />
                                <span className="text-[9px] font-black uppercase tracking-widest">Efficiency</span>
                            </div>
                            <p className="text-3xl font-black text-[rgb(var(--ui-text-main))] tabular-nums italic leading-none">{utilizationRate.toFixed(1)}%</p>
                        </div>
                    </div>

                    <div className="space-y-6 pt-10 border-t border-[rgb(var(--ui-border))]">
                        <div className="flex justify-between items-end">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-[rgb(var(--ui-text-muted))] uppercase tracking-widest">Quota Progress</p>
                                <p className="text-xs font-bold text-[rgb(var(--ui-text-main))] uppercase italic">Consolidated Daily Metrics</p>
                            </div>
                            <span className="text-sm font-black text-indigo-600 italic">{utilizationRate.toFixed(1)}% Utilization</span>
                        </div>
                        <div className="w-full bg-[rgb(var(--ui-surface))] rounded-full h-2 overflow-hidden border border-[rgb(var(--ui-border))]">
                            <div className="bg-indigo-600 h-full transition-all duration-1000" style={{ width: `${utilizationRate}%` }} />
                        </div>
                    </div>
                </div>

                <div className="mt-12 flex items-center justify-between text-[8px] font-black text-[rgb(var(--ui-text-muted))] uppercase tracking-[0.3em] opacity-40">
                    <span>Identity Verified: {new Date().toLocaleDateString()}</span>
                    <span>System Integrity: SECURE</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
