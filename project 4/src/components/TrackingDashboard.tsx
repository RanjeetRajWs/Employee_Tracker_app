import { useState, useEffect, useRef } from "react";
import {
  Clock,
  Coffee,
  Activity,
  MapPin,
  ArrowRight,
  PlusIcon,
  ShieldCheck,
  Loader2,
  Lock,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import Dialog from "./Ui/Dialog.tsx";
import { useTracking } from "../context/useTracking";
import adminSyncService from "../services/adminSyncService.ts";

function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

type ScheduledBreakItem = {
  taken?: boolean;
  windowEnd?: number;
  passed?: boolean;
  time?: string;
  duration?: number;
};

type ScheduledBreak = {
  afternoon?: ScheduledBreakItem;
  evening?: ScheduledBreakItem;
};

export default function TrackingDashboard() {
  const { 
    trackingData, 
    startTracking, 
    stopTracking, 
    isClockedIn, 
    isClocking, 
    clockIn, 
    clockOut, 
    locationPermission, 
    requestLocationPermission, 
    openLocationSettings,
    clockInDetails,
    requestClockOut,
    getCurrentLocation,
    isEarlyClockOutApproved,
    isClockOutRequestPending,
    lastSession
  } = useTracking();

  const [breakRemaining, setBreakRemaining] = useState<string | null>(null);
  const [breakCanStart, setBreakCanStart] = useState<boolean>(true);
  const [breakNextAvailable, setBreakNextAvailable] = useState<number | null>(null);
  const [scheduledState, setScheduledState] = useState<ScheduledBreak | null>(null);
  const scheduledRefreshRef = useRef<number | null>(null);

  // Offset Request State
  const [isBreakModalOpen, setIsBreakModalOpen] = useState(false);
  const [breakRequestLoading, setBreakRequestLoading] = useState(false);
  const [breakReqStartTime, setBreakReqStartTime] = useState("");
  const [breakReqEndTime, setBreakReqEndTime] = useState("");
  const [breakReqReason, setBreakReqReason] = useState("");

  // Terminate Session Request State
  const [isClockOutRequestModalOpen, setIsClockOutRequestModalOpen] = useState(false);
  const [clockOutReason, setClockOutReason] = useState("");
  const [clockOutRequestLoading, setClockOutRequestLoading] = useState(false);

  const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
  const canClockOutNormally = (trackingData?.workingTime || 0) >= EIGHT_HOURS_MS;

  const handleOpenClockOutRequest = async () => {
    setIsClockOutRequestModalOpen(true);
  };

  const handleSubmitClockOutRequest = async () => {
    if (!clockOutReason.trim()) return;
    setClockOutRequestLoading(true);
    try {
      const result = await requestClockOut(clockOutReason);
      if (result.success) {
        setIsClockOutRequestModalOpen(false);
        setClockOutReason("");
      }
    } finally {
      setClockOutRequestLoading(false);
    }
  };

  const handleRequestBreak = async () => {
    if (!breakReqStartTime || !breakReqEndTime || !breakReqReason) return;
    setBreakRequestLoading(true);
    try {
      const today = new Date();
      const [startH, startM] = breakReqStartTime.split(':').map(Number);
      const [endH, endM] = breakReqEndTime.split(':').map(Number);
      const startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startH, startM);
      const endTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endH, endM);
      const result = await adminSyncService.requestBreak(startTime, endTime, breakReqReason);
      if (result.success) {
        setIsBreakModalOpen(false);
        setBreakReqStartTime("");
        setBreakReqEndTime("");
        setBreakReqReason("");
      }
    } finally {
      setBreakRequestLoading(false);
    }
  };

  const handleStartBreak = async (minutes: number) => {
    if (!window.electronAPI) return;
    await window.electronAPI.startBreak(minutes);
  };

  const handleStopBreak = async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.stopBreak();
  };

  useEffect(() => {
    if (!window.electronAPI) return;
    const api = window.electronAPI;
    const refresh = async () => {
        try {
          const bs = await api.getBreakState();
          setBreakCanStart(Boolean(bs.canStart));
          setBreakNextAvailable(bs.nextAvailableAt ?? null);
          if (bs.scheduled) setScheduledState(bs.scheduled);
        } catch {}
    };
    refresh();
    scheduledRefreshRef.current = window.setInterval(refresh, 60000);
    return () => {
      if (scheduledRefreshRef.current) clearInterval(scheduledRefreshRef.current);
    };
  }, []);

  useEffect(() => {
    let tId: number | null = null;
    if (trackingData.onBreak && trackingData.breakEnd) {
      const update = () => {
        const diff = trackingData.breakEnd! - Date.now();
        if (diff <= 0) {
          setBreakRemaining(null);
          return;
        }
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setBreakRemaining(`${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
      };
      update();
      tId = window.setInterval(update, 1000);
    } else {
      setBreakRemaining(null);
    }
    return () => { if (tId) clearInterval(tId); };
  }, [trackingData.onBreak, trackingData.breakEnd]);

  const totalTime = trackingData.workingTime + trackingData.idleTime;
  const utilizationRate = totalTime > 0 ? (trackingData.workingTime / totalTime) * 100 : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* System Status Banner */}
      <div className="flex items-center justify-between pb-2">
         <div className="space-y-1">
            <h1 className="text-3xl font-black text-[rgb(var(--ui-text-main))] tracking-tight uppercase italic flex items-center gap-3">
              Operational Overview
            </h1>
            <p className="text-[10px] font-bold text-[rgb(var(--ui-text-muted))] uppercase tracking-[0.4em]">Integrated Performance Monitoring</p>
         </div>
      </div>

      {/* Permission Requirements */}
      {locationPermission !== 'granted' && (
        <div className="prof-card p-6 border-indigo-600/20 bg-indigo-500/5 flex items-center justify-between gap-6">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
                 <MapPin className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                 <p className="text-sm font-black text-[rgb(var(--ui-text-main))] uppercase tracking-wider">Spatial Authorization Required</p>
                 <p className="text-[11px] text-[rgb(var(--ui-text-muted))] font-medium uppercase tracking-tighter">Location services must be initialized for session compliance.</p>
              </div>
           </div>
           <button 
             onClick={locationPermission === 'prompt' ? requestLocationPermission : openLocationSettings}
             className="prof-btn-primary whitespace-nowrap text-xs uppercase tracking-widest px-8"
           >
             Initialize Auth
           </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Core Session Interface */}
        <div className="lg:col-span-8 flex flex-col gap-8">
            <div className="prof-card p-8 flex flex-col justify-between min-h-[400px]">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
                    <div className="flex items-start gap-6">
                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-inner ${
                            trackingData.onBreak ? "bg-amber-500/10 text-amber-500" :
                            !isClockedIn ? "bg-indigo-500/5 text-indigo-400" :
                            trackingData.isIdle ? "bg-amber-500/10 text-amber-500" : "bg-indigo-600 text-white"
                        }`}>
                           {trackingData.onBreak ? <Coffee size={32} /> : <Activity size={32} />}
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <h2 className="text-4xl font-black text-[rgb(var(--ui-text-main))] italic tracking-tighter uppercase">
                                    {trackingData.onBreak ? "Rest Mode" : 
                                     !isClockedIn ? "Inactive" : 
                                     trackingData.isIdle ? "Standby" : "Engaged"}
                                </h2>
                                {isClockedIn && (
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                )}
                            </div>
                            <p className="text-[10px] font-bold text-[rgb(var(--ui-text-muted))] uppercase tracking-[0.2em]">
                                {trackingData.onBreak ? "Personal interval in progress" :
                                 !isClockedIn ? "Ready for initialization" :
                                 `Focusing: ${trackingData.lastFocusedApp || "Primary Layer"}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 min-w-[200px]">
                        {!isClockedIn ? (
                            <button 
                              onClick={clockIn} 
                              disabled={isClocking}
                              className="prof-btn-primary flex items-center justify-center gap-3 py-4"
                            >
                                {isClocking ? <Loader2 className="animate-spin" size={18} /> : (
                                    <>
                                      <Clock size={18} />
                                      <span className="uppercase tracking-widest text-xs">Initialize Duty</span>
                                    </>
                                )}
                            </button>
                        ) : (
                            <>
                                <button 
                                  onClick={(canClockOutNormally || isEarlyClockOutApproved) ? clockOut : handleOpenClockOutRequest}
                                  className={`prof-btn-secondary py-4 uppercase tracking-widest text-[10px] font-black italic ${
                                      isClockOutRequestPending ? "opacity-50" : "hover:border-rose-500/50 hover:text-rose-500"
                                  }`}
                                  disabled={isClocking || isClockOutRequestPending}
                                >
                                    {isClockOutRequestPending ? "Request Pending" : (canClockOutNormally || isEarlyClockOutApproved) ? "Terminate Duty" : "Early Exit Request"}
                                </button>
                                {trackingData.isTrackingActive ? (
                                    <button 
                                      onClick={stopTracking}
                                      disabled={isClocking}
                                      className="prof-btn-secondary py-4 bg-slate-900 text-white border-transparent uppercase tracking-widest text-[10px] font-black disabled:opacity-50"
                                    >
                                        Stop Monitoring
                                    </button>
                                ) : (
                                    <button 
                                      onClick={startTracking}
                                      disabled={isClocking}
                                      className="prof-btn-primary py-4 uppercase tracking-widest text-[10px] disabled:opacity-50"
                                    >
                                        Resume Monitoring
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 pt-8 border-t border-[rgb(var(--ui-border))]">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-[rgb(var(--ui-text-muted))]">
                            <Clock size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Initialization Detail</span>
                        </div>
                        <div className="space-y-1">
                            <p className="text-2xl font-black text-[rgb(var(--ui-text-main))] italic tracking-tight">
                                {clockInDetails ? new Date(clockInDetails.time).toLocaleTimeString() : "--:--:--"}
                            </p>
                            <p className="text-[10px] text-[rgb(var(--ui-text-muted))] font-medium uppercase truncate opacity-70">
                                {clockInDetails?.address || "Location Data Unavailable"}
                            </p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-[rgb(var(--ui-text-muted))]">
                            <ShieldCheck size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Compliance Status</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                (canClockOutNormally || isEarlyClockOutApproved) ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            }`}>
                                {(canClockOutNormally || isEarlyClockOutApproved) ? "Requirement Met" : "Duration Pending"}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics Interface */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="prof-card p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/5 flex items-center justify-center text-indigo-600">
                                <Activity size={20} />
                            </div>
                            <span className="text-[10px] font-black text-[rgb(var(--ui-text-muted))] uppercase tracking-widest">Active Duty</span>
                        </div>
                        <span className="text-2xl font-black text-[rgb(var(--ui-text-main))] tabular-nums italic">{formatTime(trackingData.workingTime)}</span>
                    </div>
                    <div className="space-y-2">
                        <div className="w-full bg-indigo-500/5 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-indigo-600 h-full transition-all duration-1000" style={{ width: `${utilizationRate}%` }} />
                        </div>
                        <div className="flex justify-between text-[8px] font-bold text-[rgb(var(--ui-text-muted))] uppercase tracking-widest italic">
                            <span>Efficiency Scale</span>
                            <span>{utilizationRate.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>

                <div className="prof-card p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/5 flex items-center justify-center text-amber-500">
                                <Clock size={20} />
                            </div>
                            <span className="text-[10px] font-black text-[rgb(var(--ui-text-muted))] uppercase tracking-widest">Standby Duration</span>
                        </div>
                        <span className="text-2xl font-black text-[rgb(var(--ui-text-main))] tabular-nums italic">{formatTime(trackingData.idleTime)}</span>
                    </div>
                    <div className="space-y-2">
                        <div className="w-full bg-amber-500/5 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-amber-500 h-full transition-all duration-1000" style={{ width: `${(100 - utilizationRate).toFixed(1)}%` }} />
                        </div>
                        <div className="flex justify-between text-[8px] font-bold text-[rgb(var(--ui-text-muted))] uppercase tracking-widest italic">
                            <span>Passive Margin</span>
                            <span>{(100 - utilizationRate).toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Specialized Sub-systems */}
        <div className="lg:col-span-4 flex flex-col gap-8">
            <div className="prof-card p-8 flex flex-col justify-between h-full min-h-[500px] overflow-hidden relative">
                <div className="absolute top-0 right-0 p-10 opacity-[0.03] scale-150 rotate-12 pointer-events-none text-indigo-900 dark:text-white">
                    <Coffee size={200} />
                </div>
                
                <div className="space-y-8 relative z-10">
                    <div className="space-y-1">
                        <h3 className="text-xl font-black text-[rgb(var(--ui-text-main))] uppercase italic tracking-tight">Interval Management</h3>
                        <p className="text-[9px] font-bold text-[rgb(var(--ui-text-muted))] uppercase tracking-[0.3em]">Authorized Rest Protocol</p>
                    </div>

                    {!trackingData.onBreak ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-4">
                                <button 
                                  onClick={() => handleStartBreak(scheduledState?.afternoon?.duration || 45)}
                                  disabled={!isClockedIn || !breakCanStart || !!scheduledState?.afternoon?.taken || !!scheduledState?.afternoon?.passed}
                                  className="w-full p-6 prof-card border-dashed flex flex-col items-center gap-3 hover:border-emerald-600/30 group disabled:opacity-30"
                                >
                                    <span className="text-3xl font-black italic text-emerald-600 group-hover:scale-110 transition-transform">{scheduledState?.afternoon?.duration || 45}m</span>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-[rgb(var(--ui-text-muted))] uppercase tracking-widest">
                                        <Clock size={12} className="text-emerald-500" />
                                        Primary Offset ({scheduledState?.afternoon?.time || "13:15"})
                                    </div>
                                </button>

                                <button 
                                  onClick={() => handleStartBreak(scheduledState?.evening?.duration || 15)}
                                  disabled={!isClockedIn || !breakCanStart || !!scheduledState?.evening?.taken || !!scheduledState?.evening?.passed}
                                  className="w-full p-6 prof-card border-dashed flex flex-col items-center gap-3 hover:border-amber-600/30 group disabled:opacity-30"
                                >
                                    <span className="text-3xl font-black italic text-amber-600 group-hover:scale-110 transition-transform">{scheduledState?.evening?.duration || 15}m</span>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-[rgb(var(--ui-text-muted))] uppercase tracking-widest">
                                        <Clock size={12} className="text-amber-500" />
                                        Secondary Offset ({scheduledState?.evening?.time || "16:45"})
                                    </div>
                                </button>
                            </div>

                            <button 
                              onClick={() => setIsBreakModalOpen(true)}
                              className="w-full py-4 border-2 border-dashed border-[rgb(var(--ui-border))] rounded-xl text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ui-text-muted))] hover:text-indigo-600 hover:border-indigo-600/30 transition-all flex items-center justify-center gap-3"
                            >
                                <PlusIcon size={14} />
                                Administrative Request
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-10 py-10">
                            <div className="space-y-4 text-center">
                                <p className="text-[10px] font-black text-[rgb(var(--ui-text-muted))] uppercase tracking-widest">Offset Depletion Matrix</p>
                                <div className="text-7xl font-black text-indigo-600 tabular-nums tracking-tighter italic">
                                    {breakRemaining || "--:--"}
                                </div>
                            </div>
                            <button 
                              onClick={handleStopBreak}
                              className="w-full prof-btn-primary py-5 rounded-2xl shadow-xl shadow-indigo-600/20"
                            >
                                Re-initialize Monitor
                            </button>
                        </div>
                    )}
                </div>

                <div className="pt-6 border-t border-[rgb(var(--ui-border))]">
                   <div className="flex items-center gap-4 text-rose-500 bg-rose-500/5 p-4 rounded-xl border border-rose-500/10">
                      <AlertCircle size={16} className="shrink-0" />
                      <p className="text-[9px] font-bold uppercase tracking-widest leading-relaxed">
                        Session termination prior to quota completion requires administrative authorization.
                      </p>
                   </div>
                </div>
            </div>
        </div>
      </div>

      {/* Request Overlays */}
      <Dialog 
        show={isBreakModalOpen} 
        onCancel={() => setIsBreakModalOpen(false)} 
        title="OPERATIONAL OFFSET REQUEST"
      >
        <div className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-[rgb(var(--ui-text-muted))] uppercase tracking-widest ml-1">Offset Origin</label>
                    <input 
                      type="time" 
                      value={breakReqStartTime} 
                      onChange={(e) => setBreakReqStartTime(e.target.value)} 
                      className="prof-input font-black text-sm italic tabular-nums" 
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-[rgb(var(--ui-text-muted))] uppercase tracking-widest ml-1">Offset Termination</label>
                    <input 
                      type="time" 
                      value={breakReqEndTime} 
                      onChange={(e) => setBreakReqEndTime(e.target.value)} 
                      className="prof-input font-black text-sm italic tabular-nums" 
                    />
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-[9px] font-black text-[rgb(var(--ui-text-muted))] uppercase tracking-widest ml-1">Strategic Justification</label>
                <textarea 
                  value={breakReqReason} 
                  onChange={(e) => setBreakReqReason(e.target.value)} 
                  className="prof-input min-h-[120px] text-xs font-medium py-3 resize-none" 
                  placeholder="Rationale for operational interruption..."
                />
            </div>
            <button 
              onClick={handleRequestBreak} 
              disabled={breakRequestLoading}
              className="prof-btn-primary w-full py-4 mt-2"
            >
                {breakRequestLoading ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Submit To Governance"}
            </button>
        </div>
      </Dialog>

      <Dialog 
        show={isClockOutRequestModalOpen} 
        onCancel={() => setIsClockOutRequestModalOpen(false)} 
        title="SESSION TERMINATION REQUEST"
      >
        <div className="space-y-6 pt-4">
            <div className="flex items-center gap-4 text-amber-500 bg-amber-500/5 p-4 rounded-xl border border-amber-500/10">
                <AlertCircle size={20} className="shrink-0" />
                <div className="space-y-0.5">
                    <p className="text-[10px] font-black uppercase tracking-wider">Compliance Discrepancy</p>
                    <p className="text-[9px] font-medium uppercase tracking-tighter leading-relaxed">
                        Your current active duty does not meet the standardized 8-hour requirement. Justification is mandatory.
                    </p>
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-[9px] font-black text-[rgb(var(--ui-text-muted))] uppercase tracking-widest ml-1">Termination Rationale</label>
                <textarea 
                  value={clockOutReason} 
                  onChange={(e) => setClockOutReason(e.target.value)} 
                  className="prof-input min-h-[120px] text-xs font-medium py-3 resize-none" 
                  placeholder="Official reason for session termination..."
                />
            </div>
            <button 
              onClick={handleSubmitClockOutRequest} 
              disabled={clockOutRequestLoading}
              className="prof-btn-primary w-full py-4 bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
            >
                {clockOutRequestLoading ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Record Termination Request"}
            </button>
        </div>
      </Dialog>
    </div>
  );
}
