import { useState, useEffect } from "react";
import { 
  Plus, Calendar, Clock, CheckCircle, XCircle, FileText, ChevronRight,
  Loader2
} from "lucide-react";
import Dialog from "../components/Ui/Dialog";
import { leaveService } from "../services/leaveService";

interface Leave {
  _id: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  isHalfDay: boolean;
  status: string;
  reason: string;
  createdAt: string;
}

interface LeaveBalance {
  annual: {
    accrued: number;
    used: number;
    available: number;
    totalYearly: number;
  };
  compOff: {
    total: number;
    used: number;
    available: number;
  };
}

export default function Leaves() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'week' | 'month' | 'year'>('year');
  
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: "Annual",
    fromDate: "",
    toDate: "",
    isHalfDay: false,
    reason: "",
    document: null as File | null
  });

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [balanceRes, leavesRes] = await Promise.all([
        leaveService.getLeaveBalance(),
        leaveService.getMyLeaves(filter)
      ]);
      setBalance(balanceRes.data);
      setLeaves(leavesRes.data);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplying(true);
    try {
      const data = new FormData();
      data.append('leaveType', formData.leaveType);
      data.append('fromDate', formData.fromDate);
      data.append('toDate', formData.isHalfDay ? formData.fromDate : formData.toDate);
      data.append('isHalfDay', String(formData.isHalfDay));
      data.append('reason', formData.reason);
      if (formData.document) data.append('document', formData.document);

      await leaveService.applyLeave(data);
      setIsApplyModalOpen(false);
      setFormData({ leaveType: "Annual", fromDate: "", toDate: "", isHalfDay: false, reason: "", document: null });
      fetchData();
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-10 animate-fade-in font-sans pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-[rgb(var(--ui-text-main))] tracking-tight uppercase italic">
            Absence Governance
          </h1>
          <p className="text-[10px] font-bold text-[rgb(var(--ui-text-muted))] uppercase tracking-[0.4em]">Integrated Leave Authorization</p>
        </div>
        <button
          onClick={() => setIsApplyModalOpen(true)}
          className="prof-btn-primary flex items-center justify-center gap-3 px-10 text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/20"
        >
          <Plus size={16} />
          <span>New Authorization Request</span>
        </button>
      </div>

      {/* Quota Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="prof-card p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/5 flex items-center justify-center text-indigo-600 border border-indigo-600/10">
              <Calendar size={22} />
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1">Available Allocation</p>
              <p className="text-4xl font-black text-[rgb(var(--ui-text-main))] italic tabular-nums leading-none">{balance?.annual.available || 0}</p>
            </div>
          </div>
          <p className="text-[10px] font-bold text-[rgb(var(--ui-text-muted))] uppercase tracking-widest">Compensated Absence Quota</p>
        </div>

        <div className="prof-card p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/5 flex items-center justify-center text-indigo-600 border border-indigo-600/10">
              <Clock size={22} />
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1">Earned Credits</p>
              <p className="text-4xl font-black text-[rgb(var(--ui-text-main))] italic tabular-nums leading-none">{balance?.compOff.available || 0}</p>
            </div>
          </div>
          <p className="text-[10px] font-bold text-[rgb(var(--ui-text-muted))] uppercase tracking-widest">Strategic Offset Credits</p>
        </div>

        <div className="prof-card p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/5 flex items-center justify-center text-indigo-600 border border-indigo-600/10">
              <CheckCircle size={22} />
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1">Utilized Total</p>
              <p className="text-4xl font-black text-[rgb(var(--ui-text-main))] italic tabular-nums leading-none">
                {(balance?.annual.used || 0) + (balance?.compOff.used || 0)}
              </p>
            </div>
          </div>
          <p className="text-[10px] font-bold text-[rgb(var(--ui-text-muted))] uppercase tracking-widest">Aggregated Absence Logs</p>
        </div>
      </div>

      {/* Audit Logs */}
      <div className="prof-card overflow-hidden">
        <div className="p-8 border-b border-[rgb(var(--ui-border))] flex items-center justify-between bg-indigo-500/5">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                    <FileText size={18} />
                </div>
                <div className="space-y-0.5">
                    <h2 className="text-lg font-black text-[rgb(var(--ui-text-main))] uppercase italic tracking-tight leading-none">Authorization Register</h2>
                    <p className="text-[9px] text-[rgb(var(--ui-text-muted))] font-bold uppercase tracking-widest">Comprehensive Absence Audit Logs</p>
                </div>
            </div>
            
            <div className="relative">
              <select 
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="prof-input py-2 text-[9px] pr-10 appearance-none font-black uppercase tracking-widest min-w-[140px]"
              >
                <option value="week">Weekly Review</option>
                <option value="month">Monthly Audit</option>
                <option value="year">Annual Summary</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                <ChevronRight size={14} className="rotate-90" />
              </div>
            </div>
        </div>
        
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left">
            <thead className="bg-[rgb(var(--ui-surface))] border-b border-[rgb(var(--ui-border))]">
              <tr className="text-[rgb(var(--ui-text-muted))] font-black text-[9px] uppercase tracking-[0.2em]">
                <th className="px-8 py-4">Submission Date</th>
                <th className="px-8 py-4">Operational Interval</th>
                <th className="px-8 py-4">Classification</th>
                <th className="px-8 py-4">Scale</th>
                <th className="px-8 py-4">Governance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgb(var(--ui-border))]">
              {leaves.map((l) => (
                <tr key={l._id} className="hover:bg-indigo-500/5 transition-colors">
                  <td className="px-8 py-6 text-xs font-bold text-[rgb(var(--ui-text-main))] tabular-nums">
                    {new Date(l.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-8 py-6 text-xs font-black text-[rgb(var(--ui-text-main))] flex items-center gap-2 italic">
                    {new Date(l.fromDate).toLocaleDateString()}
                    {!l.isHalfDay && l.toDate !== l.fromDate && (
                        <span className="text-[rgb(var(--ui-text-muted))] opacity-40">-</span>
                    )}
                    {!l.isHalfDay && l.toDate !== l.fromDate && new Date(l.toDate).toLocaleDateString()}
                    {l.isHalfDay && <span className="text-[8px] text-indigo-600 bg-indigo-600/10 px-1.5 py-0.5 rounded border border-indigo-600/20">0.5D</span>}
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 px-3 py-1 bg-indigo-600/10 rounded-full border border-indigo-600/10">
                      {l.leaveType}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-xs font-bold text-[rgb(var(--ui-text-muted))] lowercase italic">
                    {l.isHalfDay ? '0.5d duration' : 'consolidated period'}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                             l.status === 'Approved' ? 'bg-emerald-500' :
                             l.status === 'Rejected' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'
                        }`} />
                        <span className={`text-[9px] font-black uppercase tracking-widest ${
                            l.status === 'Approved' ? 'text-emerald-600' :
                            l.status === 'Rejected' ? 'text-rose-600' : 'text-amber-600'
                        }`}>
                            {l.status}
                        </span>
                    </div>
                  </td>
                </tr>
              ))}
              {leaves.length === 0 && (
                <tr>
                   <td colSpan={5} className="py-20 text-center space-y-4">
                      <p className="text-[9px] font-black text-[rgb(var(--ui-text-muted))] uppercase tracking-[0.4em] opacity-40 italic">No Synchronization Records Detected</p>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog show={isApplyModalOpen} onCancel={() => setIsApplyModalOpen(false)} title="ABSENCE AUTHORIZATION REQUEST">
        <form onSubmit={handleApplyLeave} className="space-y-6 pt-4 h-full">
            <div className="space-y-2">
                <label className="text-[9px] font-black text-[rgb(var(--ui-text-muted))] uppercase tracking-widest ml-1">Classification Category</label>
                <div className="grid grid-cols-2 gap-4">
                    <button type="button" onClick={() => setFormData({...formData, leaveType: 'Annual'})} 
                        className={`p-4 prof-card flex items-center justify-center gap-3 transition-all ${formData.leaveType === 'Annual' ? 'border-indigo-600 bg-indigo-600/5 text-indigo-600' : 'opacity-40'}`}>
                        <Calendar size={16} /> <span className="text-[10px] font-black uppercase tracking-widest">Standard Absence</span>
                    </button>
                    <button type="button" onClick={() => setFormData({...formData, leaveType: 'Comp Off'})} 
                        className={`p-4 prof-card flex items-center justify-center gap-3 transition-all ${formData.leaveType === 'Comp Off' ? 'border-indigo-600 bg-indigo-600/5 text-indigo-600' : 'opacity-40'}`}>
                        <Clock size={16} /> <span className="text-[10px] font-black uppercase tracking-widest">Strategic Offset</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-[rgb(var(--ui-text-muted))] uppercase tracking-widest ml-1">Origin Date</label>
                    <input type="date" value={formData.fromDate} onChange={(e) => setFormData({...formData, fromDate: e.target.value})} className="prof-input text-xs font-bold uppercase" required />
                </div>
                {!formData.isHalfDay && (
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-[rgb(var(--ui-text-muted))] uppercase tracking-widest ml-1">Termination Date</label>
                        <input type="date" value={formData.toDate} onChange={(e) => setFormData({...formData, toDate: e.target.value})} className="prof-input text-xs font-bold uppercase" required />
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <label className="text-[9px] font-black text-[rgb(var(--ui-text-muted))] uppercase tracking-widest ml-1">Strategic Justification</label>
                <textarea value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} className="prof-input min-h-[100px] text-xs font-medium py-3 resize-none" placeholder="Rationale for operational interruption..." required />
            </div>

            <button type="submit" disabled={applying} className="prof-btn-primary w-full py-4 mt-4 uppercase tracking-[0.3em] text-[10px]">
                {applying ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Submit To Governance"}
            </button>
        </form>
      </Dialog>
    </div>
  );
}
