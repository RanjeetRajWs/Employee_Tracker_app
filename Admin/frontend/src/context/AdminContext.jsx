import React, { createContext, useState, useCallback, useEffect, useRef } from "react";
import ToastContainer from "../components/Toast";

export const AdminContext = createContext();

export function AdminProvider({ children }) {
  const storedAdmin = (() => {
    try {
      const v = localStorage.getItem('admin');
      return v ? JSON.parse(v) : null;
    } catch (e) {
      return null;
    }
  })();

  const [admin, setAdmin] = useState(storedAdmin);
  const [token, setToken] = useState(() => localStorage.getItem("adminToken"));
  const [loading, setLoading] = useState(false);

  // Toasts state
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(1);

  const addToast = useCallback((message, type = 'success', ttl = 5000) => {
    const id = idRef.current++;
    const t = { id, message, type };
    setToasts((s) => [...s, t]);
    if (ttl > 0) setTimeout(() => setToasts((s) => s.filter(x => x.id !== id)), ttl);
    return id;
  }, []);

  const removeToast = useCallback((id) => setToasts((s) => s.filter(t => t.id !== id)), []);

  const login = useCallback((adminData, token) => {
    setAdmin(adminData);
    setToken(token);
    localStorage.setItem("adminToken", token);
    localStorage.setItem("admin", JSON.stringify(adminData));
    addToast('Logged in', 'success');
  }, [addToast]);

  const logout = useCallback(() => {
    setAdmin(null);
    setToken(null);
    localStorage.removeItem("adminToken");
    localStorage.removeItem("admin");
    addToast('Logged out', 'success');
  }, [addToast]);

  // listen for global logout events (emitted by API interceptor on 401)
  useEffect(() => {
    function onGlobalLogout() {
      logout();
      addToast('Session expired. Please login again.', 'error');
    }
    window.addEventListener('admin-logout', onGlobalLogout);
    return () => window.removeEventListener('admin-logout', onGlobalLogout);
  }, [logout, addToast]);

  const isAuthenticated = !!token && !!admin;

  return (
    <AdminContext.Provider
      value={{
        admin,
        token,
        loading,
        login,
        logout,
        isAuthenticated,
        setLoading,
        notify: addToast,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} remove={removeToast} />
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = React.useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within AdminProvider");
  }
  return context;
}
