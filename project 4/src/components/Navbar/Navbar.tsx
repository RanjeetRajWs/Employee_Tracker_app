import { FC, useState, useEffect, useRef } from "react";
import { 
  Activity, 
  ClipboardList, 
  UserCircle, 
  LogOut, 
  ChevronDown, 
  Sun,
  Moon,
  Menu,
  X
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { useTheme } from "../../context/ThemeContext";

interface NavbarProps {
  active?: string;
  onNavigate: (route: string) => void;
}

const LINKS = [
  { key: "operational-overview", label: "Operations", Icon: Activity },
  { key: "absence-records", label: "Absence", Icon: ClipboardList },
  { key: "identity-records", label: "Identity", Icon: UserCircle },
];

const Navbar: FC<NavbarProps> = ({ active = "operational-overview", onNavigate }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userData = {
    name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User",
    role: "Professional Associate",
    avatar: user?.user_metadata?.avatar_url || null
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNavigate = (key: string) => {
    onNavigate(key);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="w-full sticky top-0 z-50 px-6 pt-6 titlebar-drag">
      <div className="mx-auto max-w-[1440px]">
        <div className="bg-[rgb(var(--ui-surface))] border border-[rgb(var(--ui-border))] rounded-2xl shadow-sm px-6 h-16 flex items-center justify-between transition-colors duration-300">
          
          {/* Brand Identity */}
          <div 
            className="flex items-center gap-3 cursor-pointer titlebar-nodrag" 
            onClick={() => handleNavigate('operational-overview')}
          >
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/10">
              <span className="text-white font-black italic text-sm tracking-tighter">ET</span>
            </div>
            <div className="hidden sm:block">
              <div className="text-[rgb(var(--ui-text-main))] font-bold text-xs tracking-tight uppercase">
                Enterprise <span className="text-indigo-600">Core</span>
              </div>
              <div className="text-[8px] font-bold text-[rgb(var(--ui-text-muted))] uppercase tracking-widest mt-0.5 opacity-60">System v1.2.0</div>
            </div>
          </div>

          {/* Navigation Systems */}
          <nav className="hidden lg:flex items-center gap-1 titlebar-nodrag">
            {LINKS.map((l) => (
              <button
                key={l.key}
                onClick={() => handleNavigate(l.key)}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2.5 ${
                  active === l.key
                    ? "text-indigo-600 bg-indigo-500/5 font-black"
                    : "text-[rgb(var(--ui-text-muted))] hover:text-indigo-600 hover:bg-indigo-500/5"
                }`}
              >
                <l.Icon className={`w-3.5 h-3.5 ${active === l.key ? 'text-indigo-600' : 'text-[rgb(var(--ui-text-muted))]'}`} />
                <span>{l.label}</span>
              </button>
            ))}
          </nav>

          {/* System Actions */}
          <div className="flex items-center gap-4 titlebar-nodrag">
            {/* Theme Interface Control */}
            <button 
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl border border-[rgb(var(--ui-border))] flex items-center justify-center text-[rgb(var(--ui-text-muted))] hover:text-indigo-600 hover:border-indigo-600/30 transition-all active:scale-95"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* Profile Interface */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className={`flex items-center gap-3 p-1 rounded-xl transition-all border ${
                  isProfileOpen ? "border-indigo-600/50 bg-indigo-500/5" : "border-transparent hover:bg-indigo-500/5"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-600/10 flex items-center justify-center border border-indigo-600/20 text-indigo-600 overflow-hidden font-bold text-[10px] uppercase italic">
                   {userData.name.charAt(0)}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-[10px] font-bold text-[rgb(var(--ui-text-main))] leading-none uppercase tracking-widest">{userData.name}</p>
                  <p className="text-[8px] font-bold text-[rgb(var(--ui-text-muted))] mt-1 uppercase tracking-tighter opacity-60">Professional Associate</p>
                </div>
                <ChevronDown className={`w-3 h-3 text-[rgb(var(--ui-text-muted))] transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Account Dropdown */}
              {isProfileOpen && (
                <div className={`absolute right-0 mt-3 w-64 bg-[rgb(var(--ui-surface))] border border-[rgb(var(--ui-border))] rounded-2xl shadow-xl py-3 animate-slide-up origin-top-right overflow-hidden`}>
                   <div className="px-5 py-4 border-b border-[rgb(var(--ui-border))] bg-indigo-500/5 mb-2">
                      <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest mb-1.5 leading-none">Account Status</p>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-[rgb(var(--ui-text-main))] leading-none uppercase italic">Active Session</span>
                      </div>
                   </div>

                   <button 
                    onClick={() => { handleNavigate('identity-records'); setIsProfileOpen(false); }}
                    className="w-full px-5 py-3 text-left hover:bg-indigo-500/5 flex items-center gap-3 text-[rgb(var(--ui-text-main))] transition-colors group"
                   >
                     <UserCircle className="w-4 h-4 text-[rgb(var(--ui-text-muted))] group-hover:text-indigo-600" />
                     <span className="text-[11px] font-bold uppercase tracking-wider">Identity Records</span>
                   </button>
                   
                   <div className="h-px bg-[rgb(var(--ui-border))] mx-5 my-2" />

                   <button
                    onClick={logout}
                    className="w-full px-5 py-3 text-left hover:bg-rose-500/5 flex items-center gap-3 text-rose-500 transition-colors group"
                   >
                     <LogOut className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                     <span className="text-[11px] font-black uppercase tracking-widest italic">Terminate Session</span>
                   </button>
                </div>
              )}
            </div>

            {/* Mobile Interface Toggle */}
            <button 
              className="lg:hidden w-10 h-10 rounded-xl border border-[rgb(var(--ui-border))] flex items-center justify-center text-[rgb(var(--ui-text-muted))] transition-all active:scale-95"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Interface */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-24 left-6 right-6 bg-[rgb(var(--ui-surface))] border border-[rgb(var(--ui-border))] rounded-2xl shadow-xl p-4 animate-slide-up z-[60]">
            <div className="flex flex-col gap-1">
              {LINKS.map((l) => (
                <button
                  key={l.key}
                  onClick={() => handleNavigate(l.key)}
                  className={`w-full px-5 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-4 transition-all ${
                    active === l.key ? "bg-indigo-500/10 text-indigo-600" : "text-[rgb(var(--ui-text-muted))] hover:bg-indigo-500/5"
                  }`}
                >
                  <l.Icon className="w-4 h-4" />
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
