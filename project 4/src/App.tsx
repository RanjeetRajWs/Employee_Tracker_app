import { useEffect, useState } from "react";
import Navbar from "./components/Navbar/Navbar";
import TrackingDashboard from "./components/TrackingDashboard";
import Profile from "./components/Profile/Profile";
import Leaves from "./pages/Leaves";
import Login from "./components/login_Signup/Login";
import ChangePassword from "./components/login_Signup/ChangePassword";
import ConnectionStatus from "./components/ConnectionStatus";
import { TrackingProvider } from "./context/TrackingContext";
import { ThemeProvider } from "./context/ThemeContext";
import { useAuth } from "./context/useAuth";

type Route =
  | "operational-overview"
  | "identity-records"
  | "absence-records"
  | "authentication"
  | "security-update";

function getRouteFromHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, "");
  if (hash.startsWith("profile")) return "identity-records";
  if (hash.startsWith("leaves")) return "absence-records";
  if (hash.startsWith("login")) return "authentication";
  if (hash.startsWith("change-password")) return "security-update";
  return "operational-overview";
}

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [route, setRoute] = useState<Route>(getRouteFromHash());

  useEffect(() => {
    const onHash = () => setRoute(getRouteFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const handleNavigate = (r: string) => {
    let hash = r;
    if (r === "operational-overview") hash = "dashboard";
    if (r === "identity-records") hash = "profile";
    if (r === "absence-records") hash = "leaves";
    
    window.location.hash = `/${hash}`;
    setRoute(r as Route);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--ui-bg))] animate-fade-in relative overflow-hidden">
        <div className="text-center z-10 space-y-10">
          <div className="relative inline-block">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl">
              <span className="text-2xl font-black text-white italic tracking-tighter">ET</span>
            </div>
          </div>
          <div className="space-y-2">
             <p className="text-[10px] font-black text-[rgb(var(--ui-text-muted))] uppercase tracking-[0.4em] italic">System Initialization</p>
             <div className="flex items-center justify-center gap-2">
               <div className="w-1 h-1 rounded-full bg-indigo-600 animate-pulse" style={{ animationDelay: '0s' }} />
               <div className="w-1 h-1 rounded-full bg-indigo-600 animate-pulse" style={{ animationDelay: '0.2s' }} />
               <div className="w-1 h-1 rounded-full bg-indigo-600 animate-pulse" style={{ animationDelay: '0.4s' }} />
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (route === "authentication") return <Login />;
  if (route === "security-update") return <ChangePassword />;

  if (!isAuthenticated) {
    window.location.hash = "#/login";
    return null;
  }

  return (
    <TrackingProvider>
      <div className="min-h-screen bg-[rgb(var(--ui-bg))]">
        <Navbar active={route} onNavigate={handleNavigate} />
        <main className="max-w-[1440px] mx-auto px-6 pt-10">
          {route === "operational-overview" && <TrackingDashboard />}
          {route === "identity-records" && <Profile />}
          {route === "absence-records" && <Leaves />}
        </main>
        <ConnectionStatus />
      </div>
    </TrackingProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
