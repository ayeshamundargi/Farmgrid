import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { getQueuedCount, syncQueuedRequests } from '../offline/requestQueue';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('farmgrid_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('farmgrid_token') || null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [syncToast, setSyncToast] = useState(null);

  // Refresh pending sync count
  const refreshPendingCount = async () => {
    try {
      const count = await getQueuedCount();
      setPendingSyncCount(count);
    } catch (e) {
      console.error(e);
    }
  };

  // Online / Offline synchronization listeners
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      console.log('[Network] Device came back online. Triggering sync...');
      const count = await getQueuedCount();
      if (count > 0) {
        setSyncToast(`Connection restored. Synchronizing ${count} offline request(s)...`);
        const result = await syncQueuedRequests(api);
        setPendingSyncCount(result.remainingCount);
        if (result.syncedCount > 0) {
          setSyncToast(`Successfully synchronized ${result.syncedCount} offline request(s)!`);
          setTimeout(() => setSyncToast(null), 5000);
          window.dispatchEvent(new Event('schedule_updated'));
        }
      } else {
        setSyncToast('Connection restored. You are back online.');
        setTimeout(() => setSyncToast(null), 3500);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncToast('Network connection lost. Offline mode activated.');
      setTimeout(() => setSyncToast(null), 4000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    refreshPendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 1-Click simulated offline toggle for demo & evaluation
  const toggleNetworkSimulation = async () => {
    if (isOnline) {
      setIsOnline(false);
      setSyncToast('Simulated Offline Mode: Requests will queue in IndexedDB.');
      setTimeout(() => setSyncToast(null), 4000);
    } else {
      setIsOnline(true);
      setSyncToast('Simulating connection restore. Synchronizing offline queue...');
      const count = await getQueuedCount();
      if (count > 0) {
        const result = await syncQueuedRequests(api);
        setPendingSyncCount(result.remainingCount);
        if (result.syncedCount > 0) {
          setSyncToast(`Successfully synchronized ${result.syncedCount} offline request(s)!`);
          setTimeout(() => setSyncToast(null), 5000);
          window.dispatchEvent(new Event('schedule_updated'));
        }
      } else {
        setSyncToast('Connection restored. You are back online.');
        setTimeout(() => setSyncToast(null), 3500);
      }
    }
  };

  // Check current session on mount
  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.data.user);
          localStorage.setItem('farmgrid_user', JSON.stringify(res.data.data.user));
        } catch (err) {
          console.error('Session verify failed:', err);
          logout();
        }
      }
      setLoading(false);
    }
    loadUser();

    const handleUnauthorized = () => logout();
    window.addEventListener('auth_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth_unauthorized', handleUnauthorized);
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data.data;
    localStorage.setItem('farmgrid_token', newToken);
    localStorage.setItem('farmgrid_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return newUser;
  };

  const register = async (name, email, password, role = 'FARMER', phone = '') => {
    const res = await api.post('/auth/register', { name, email, password, role, phone });
    const { token: newToken, user: newUser } = res.data.data;
    localStorage.setItem('farmgrid_token', newToken);
    localStorage.setItem('farmgrid_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return newUser;
  };

  const quickDemoLogin = async (roleType) => {
    const roleEmails = {
      farmer: 'farmer@farmgrid.demo',
      owner: 'owner@farmgrid.demo',
      admin: 'admin@farmgrid.demo'
    };
    const targetEmail = roleEmails[roleType] || 'farmer@farmgrid.demo';
    return await login(targetEmail, 'demo123');
  };

  const logout = () => {
    localStorage.removeItem('farmgrid_token');
    localStorage.removeItem('farmgrid_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isOnline,
        pendingSyncCount,
        refreshPendingCount,
        syncToast,
        setSyncToast,
        login,
        register,
        quickDemoLogin,
        toggleNetworkSimulation,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
