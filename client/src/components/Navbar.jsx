import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Tractor,
  Wifi,
  WifiOff,
  Bell,
  RefreshCw,
  LogOut,
  User,
  Shield,
  Layers,
  Calendar,
  AlertTriangle,
  PlusCircle,
  BarChart3
} from 'lucide-react';

export default function Navbar() {
  const { user, isOnline, pendingSyncCount, syncToast, quickDemoLogin, logout, toggleNetworkSimulation } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const handleRoleSwitch = async (role) => {
    setShowDemoMenu(false);
    await quickDemoLogin(role);
    if (role === 'farmer') navigate('/farmer/dashboard');
    else if (role === 'owner') navigate('/owner/dashboard');
    else if (role === 'admin') navigate('/admin/dashboard');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      {/* Synchronization Alert Banner */}
      {syncToast && (
        <div className="bg-emerald-600 text-white text-xs font-medium py-1.5 px-4 text-center flex items-center justify-center gap-2 animate-fadeIn">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>{syncToast}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-agri-600 flex items-center justify-center text-white shadow-sm shadow-agri-600/30">
                <Tractor className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-slate-900">Farm<span className="text-agri-600">Grid</span></span>
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 -mt-1">Scarcity Engine</span>
              </div>
            </Link>

            {/* Navigation links per role */}
            {user && (
              <nav className="hidden md:flex items-center gap-1">
                {user.role === 'FARMER' && (
                  <>
                    <Link
                      to="/farmer/dashboard"
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isActive('/farmer/dashboard') ? 'bg-agri-50 text-agri-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/farmer/request"
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isActive('/farmer/request') ? 'bg-agri-600 text-white' : 'text-agri-700 hover:bg-agri-50'}`}
                    >
                      <PlusCircle className="w-4 h-4" />
                      Request Resource
                    </Link>
                    <Link
                      to="/farmer/requests"
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isActive('/farmer/requests') ? 'bg-agri-50 text-agri-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                    >
                      My Requests
                    </Link>
                    <Link
                      to="/farmer/schedule"
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isActive('/farmer/schedule') ? 'bg-agri-50 text-agri-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                    >
                      My Schedule
                    </Link>
                  </>
                )}

                {user.role === 'OWNER' && (
                  <>
                    <Link
                      to="/owner/dashboard"
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isActive('/owner/dashboard') ? 'bg-agri-50 text-agri-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/owner/resources"
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isActive('/owner/resources') ? 'bg-agri-50 text-agri-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                    >
                      Fleet Equipment
                    </Link>
                    <Link
                      to="/owner/resources/new"
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isActive('/owner/resources/new') ? 'bg-agri-600 text-white' : 'text-agri-700 hover:bg-agri-50'}`}
                    >
                      <PlusCircle className="w-4 h-4" />
                      Add Resource
                    </Link>
                    <Link
                      to="/owner/bookings"
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isActive('/owner/bookings') ? 'bg-agri-50 text-agri-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                    >
                      Assigned Bookings
                    </Link>
                  </>
                )}

                {user.role === 'ADMIN' && (
                  <>
                    <Link
                      to="/admin/dashboard"
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isActive('/admin/dashboard') ? 'bg-agri-50 text-agri-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                    >
                      Overview
                    </Link>
                    <Link
                      to="/admin/schedule"
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isActive('/admin/schedule') ? 'bg-agri-50 text-agri-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                    >
                      Master Schedule
                    </Link>
                    <Link
                      to="/admin/conflicts"
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isActive('/admin/conflicts') ? 'bg-rose-50 text-rose-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                    >
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                      Conflicts
                    </Link>
                    <Link
                      to="/admin/disruptions"
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isActive('/admin/disruptions') ? 'bg-amber-50 text-amber-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                    >
                      Disruption Center
                    </Link>
                    <Link
                      to="/admin/resources"
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isActive('/admin/resources') ? 'bg-agri-50 text-agri-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                    >
                      All Resources
                    </Link>
                  </>
                )}
              </nav>
            )}
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            {/* Offline / Online Status Indicator & Sync Badge */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleNetworkSimulation}
                title="Click to toggle simulated online / offline staging mode"
                className="focus:outline-none transition transform active:scale-95"
              >
                {isOnline ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <Wifi className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Online</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 cursor-pointer shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                    <WifiOff className="w-3.5 h-3.5" />
                    <span>Offline Staging</span>
                  </span>
                )}
              </button>

              {/* Pending Offline Sync Badge */}
              {pendingSyncCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white shadow-sm" title="Requests stored locally waiting to sync">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Sync: {pendingSyncCount}</span>
                </span>
              )}
            </div>

            {/* Quick Demo Role Switcher Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
              >
                <Shield className="w-3.5 h-3.5 text-agri-600" />
                <span className="hidden sm:inline">Demo Switch:</span>
                <span className="font-bold text-slate-900 uppercase">{user ? user.role : 'LOGIN'}</span>
              </button>

              {showDemoMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50 animate-fadeIn">
                  <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Instant Demo Login
                  </div>
                  <button
                    onClick={() => handleRoleSwitch('farmer')}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2"
                  >
                    👨‍🌾 <div><span className="font-bold">Farmer</span> (Ramesh Kumar)</div>
                  </button>
                  <button
                    onClick={() => handleRoleSwitch('owner')}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2"
                  >
                    🚜 <div><span className="font-bold">Resource Owner</span> (Rajesh Hub)</div>
                  </button>
                  <button
                    onClick={() => handleRoleSwitch('admin')}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2"
                  >
                    👑 <div><span className="font-bold">Admin</span> (Master Scheduler)</div>
                  </button>
                </div>
              )}
            </div>

            {/* User Session & Logout */}
            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={logout}
                  title="Logout"
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 text-xs font-medium bg-agri-600 hover:bg-agri-700 text-white rounded-lg transition shadow-sm"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
