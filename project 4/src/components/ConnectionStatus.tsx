import { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertCircle, RefreshCcw } from 'lucide-react';

export default function ConnectionStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [backendStatus, setBackendStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
    const [lastSync, setLastSync] = useState<Date | null>(null);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        const ADMIN_API_URL = (import.meta as any).env?.VITE_ADMIN_API_URL || 'http://localhost:5000/admin';
        const checkBackend = async () => {
            try {
                const response = await fetch(`${ADMIN_API_URL}/health`, {
                    method: 'GET',
                    signal: AbortSignal.timeout(5000)
                });
                setBackendStatus(response.ok ? 'connected' : 'disconnected');
            } catch (error) {
                setBackendStatus('disconnected');
            }
        };
        checkBackend();
        const interval = setInterval(checkBackend, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleSyncStatus = (event: CustomEvent) => {
            if (event.detail.status === 'success') {
                setLastSync(new Date());
            }
        };
        window.addEventListener('sync-status', handleSyncStatus as EventListener);
        return () => window.removeEventListener('sync-status', handleSyncStatus as EventListener);
    }, []);

    const isConnected = isOnline && backendStatus === 'connected';

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in group">
            <div className="bg-[rgb(var(--ui-surface))] border border-[rgb(var(--ui-border))] rounded-2xl shadow-xl p-4 flex items-center gap-4 transition-all hover:-translate-y-1">
                <div className="relative">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'} shadow-[0_0_8px_rgba(0,0,0,0.1)]`} />
                    {isConnected && <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-40" />}
                </div>
                
                <div className="flex items-center gap-3 pr-2">
                    <div className="space-y-0.5">
                        <p className="text-[8px] font-black text-[rgb(var(--ui-text-muted))] uppercase tracking-widest leading-none">System Link</p>
                        <p className="text-[10px] font-black text-[rgb(var(--ui-text-main))] uppercase italic">
                            {isConnected ? 'Active Synchronization' : 'Link Interrupted'}
                        </p>
                    </div>
                </div>

                {lastSync && isConnected && (
                    <div className="border-l border-[rgb(var(--ui-border))] pl-4 flex items-center gap-3">
                        <RefreshCcw size={12} className="text-[rgb(var(--ui-text-muted))] opacity-40 group-hover:rotate-180 transition-transform duration-700" />
                        <div className="space-y-0.5">
                            <p className="text-[8px] font-black text-[rgb(var(--ui-text-muted))] uppercase tracking-widest leading-none">Last Audit</p>
                            <p className="text-[10px] text-[rgb(var(--ui-text-main))] font-bold tabular-nums italic">
                                {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
