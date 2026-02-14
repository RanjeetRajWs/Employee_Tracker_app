import { createContext, useEffect, useState, ReactNode } from "react";
import adminSyncService from "../services/adminSyncService";

export type User = {
  id: string;
  email: string;
  tempPassword?: boolean;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
  role?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null; tempPassword?: boolean }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = async () => {
    try {
      // Stop Electron session (tracking, screenshots)
      if (window.electronAPI) {
        await window.electronAPI.stopSession();
      }

      // Clear localStorage
      setUser(null);
      localStorage.removeItem("appUser");
      localStorage.removeItem("adminAuthToken");
      
      // Stop periodic sync and clear its token
      adminSyncService.stopPeriodicSync();
      adminSyncService.clearAuthToken();
    } catch (err) {
      console.error("Error logging out:", err);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      try {
        const storedUser = localStorage.getItem("appUser");
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);

            // Sync with backend on mount
            if (window.electronAPI) {
              const token = localStorage.getItem('adminAuthToken');
              if (token) {
                adminSyncService.setAuthToken(token);
              }
              
              adminSyncService.startPeriodicSync();
              await adminSyncService.performPeriodicSync();
              await window.electronAPI.setUserInfo({ 
                userId: parsedUser.id, 
                userName: parsedUser.username || parsedUser.email || 'Unknown',
                token: token || undefined
              });
              await window.electronAPI.startSession();
            }

            setLoading(false);
            return;
          } catch (e) {
            console.error("Failed to parse stored user:", e);
          }
        }
      } catch (error) {
        console.error("Error checking user session:", error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    const handleUserSuspended = () => {
      console.warn('User suspended event received - logging out');
      logout();
      window.location.hash = '#/login';
      alert('Your account has been suspended by the administrator.');
    };

    const handleTokenExpired = () => {
      console.warn('Token expired event received - logging out');
      logout();
      window.location.hash = '#/login';
      alert('Your session has expired. Please log in again.');
    };

    window.addEventListener('user-suspended', handleUserSuspended);
    window.addEventListener('token-expired', handleTokenExpired);

    let removeForceLogout: (() => void) | undefined;
    if (window.electronAPI?.onForceLogout) {
      removeForceLogout = window.electronAPI.onForceLogout((reason: string) => {
        console.warn('Force logout received from main process:', reason);
        logout();
        window.location.hash = '#/login';
        alert(reason || 'Your account has been deactivated by the administrator.');
      });
    }

    return () => {
      window.removeEventListener('user-suspended', handleUserSuspended);
      window.removeEventListener('token-expired', handleTokenExpired);
      if (removeForceLogout) removeForceLogout();
    };
  }, []);


  const login = async (email: string, password: string) => {
    try {
      // Try Admin backend authentication first
      const authResult = await adminSyncService.authenticateUser(email, password);

      if (authResult.success && authResult.user) {
        // Store complete user data from backend
        const userData = {
          id: authResult.user.userId || authResult.user.id,
          userId: authResult.user.userId || authResult.user.id,
          email: authResult.user.email,
          username: authResult.user.username,
          role: authResult.user.role,
          tempPassword: authResult.user.tempPassword,
          lastLogin: authResult.user.lastLogin,
          isActive: authResult.user.isActive,
          createdAt: authResult.user.createdAt,
          user_metadata: authResult.user.user_metadata || {},
        };
        setUser(userData);
        localStorage.setItem("appUser", JSON.stringify(userData));

        if (authResult.token) {
          adminSyncService.setAuthToken(authResult.token);
        }

        adminSyncService.startPeriodicSync();
        await adminSyncService.performPeriodicSync();

        if (window.electronAPI) {
          await window.electronAPI.setUserInfo({ 
            userId: userData.id, 
            userName: userData.username || userData.email || 'Unknown',
            token: authResult.token
          });
          await window.electronAPI.startSession();
        }

        return {
          error: null,
          tempPassword: authResult.user.tempPassword
        };
      }

      // Fallback: Check localStorage for offline mode
      const storedUser = localStorage.getItem("appUser");
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser.email === email) {
            setUser(parsedUser);
            return { error: null, tempPassword: parsedUser.tempPassword };
          }
        } catch (e) {
          console.error("Failed to parse stored user:", e);
        }
      }

      return { error: authResult.error || "Invalid email or password" };
    } catch (err) {
      return { error: (err as Error).message };
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    try {
      if (!user) {
        return { error: "No user logged in" };
      }

      const result = await adminSyncService.changePassword(
        user.id,
        oldPassword,
        newPassword
      );

      if (result.success) {
        const updatedUser = { ...user, tempPassword: false };
        setUser(updatedUser);
        localStorage.setItem("appUser", JSON.stringify(updatedUser));
        return { error: null };
      }

      return { error: result.error || "Failed to change password" };
    } catch (err) {
      return { error: (err as Error).message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        changePassword,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
