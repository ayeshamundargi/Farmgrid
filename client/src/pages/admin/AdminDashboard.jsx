import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import AnalyticsCharts from '../../components/AnalyticsCharts';
import {
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Tractor,
  Layers,
  Calendar,
  Wrench,
  CloudRain,
  RefreshCw,
  ArrowRight,
  Zap,
  Activity,
  Award
} from 'lucide-react';

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reallocating, setReallocating] = useState(false);
  const [reallocateMsg, setReallocateMsg] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/dashboard');
      setDashboardData(res.data.data);
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('farmgrid_schedule_updated', handleUpdate);
    window.addEventListener('farmgrid_disruption_created', handleUpdate);
    window.addEventListener('farmgrid_conflict_detected', handleUpdate);
    window.addEventListener('farmgrid_booking_reallocated', handleUpdate);
    return () => {
      window.removeEventListener('farmgrid_schedule_updated', handleUpdate);
      window.removeEventListener('farmgrid_disruption_created', handleUpdate);
      window.removeEventListener('farmgrid_conflict_detected', handleUpdate);
      window.removeEventListener('farmgrid_booking_reallocated', handleUpdate);
    };
  }, []);

  const handleGlobalReallocate = async () => {
    try {
      setReallocating(true);
      setReallocateMsg(null);
      const res = await api.post('/admin/reallocate');
      setReallocateMsg(res.data.message || 'Global re-allocation completed successfully.');
      await loadData();
      setTimeout(() => setReallocateMsg(null), 6000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to execute global reallocation.');
    } finally {
      setReallocating(false);
    }
  };

  const summary = dashboardData?.summary || {};
  const charts = dashboardData?.charts || {};
  const disruptions = dashboardData?.recentDisruptions || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-agri-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-agri-600/30 text-agri-300 border border-agri-500/40 mb-2">
            👑 Master Coordinator & Algorithmic Dispatch
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Central Resource Coordination Command
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Real-time algorithmic oversight of regional agricultural machinery, conflict prevention, dynamic reallocations, and fairness scoring.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={reallocating}
            onClick={handleGlobalReallocate}
            className="flex items-center gap-2 px-5 py-3 bg-agri-600 hover:bg-agri-700 text-white font-bold text-sm rounded-xl shadow-md transition disabled:opacity-50 transform active:scale-95"
          >
            <Zap className={`w-4 h-4 ${reallocating ? 'animate-spin text-amber-300' : ''}`} />
            {reallocating ? 'Executing Reallocation...' : 'Run Global Reallocation'}
          </button>
          <Link
            to="/admin/schedule"
            className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm rounded-xl border border-white/20 transition"
          >
            <Clock className="w-4 h-4 text-agri-300" />
            Master Timeline
          </Link>
        </div>
      </div>

      {/* Global Reallocation Flash Message */}
      {reallocateMsg && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex items-center justify-between text-xs font-bold text-emerald-900 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{reallocateMsg}</span>
          </div>
          <button onClick={() => setReallocateMsg(null)} className="text-emerald-700 hover:text-emerald-950 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Fleet</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{summary.totalResources ?? '—'}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Machinery Units</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Available</span>
          <div className="text-2xl font-black text-emerald-700 mt-1">{summary.availableResources ?? '—'}</div>
          <span className="text-[11px] text-emerald-600/80 mt-0.5 block">Ready For Use</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Active Bookings</span>
          <div className="text-2xl font-black text-sky-700 mt-1">{summary.activeBookings ?? '—'}</div>
          <span className="text-[11px] text-sky-600/80 mt-0.5 block">Dispatched in Field</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">In Waitlist</span>
          <div className="text-2xl font-black text-amber-600 mt-1">{summary.waitlistedRequests ?? '—'}</div>
          <span className="text-[11px] text-amber-600/80 mt-0.5 block">Queued by Priority</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Conflicts</span>
          <div className="text-2xl font-black text-rose-700 mt-1">{summary.activeConflictsCount ?? 0}</div>
          <span className="text-[11px] text-rose-600/80 mt-0.5 block">Double Bookings Blocked</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">High Priority</span>
          <div className="text-2xl font-black text-purple-700 mt-1">{summary.highPriorityCount ?? 0}</div>
          <span className="text-[11px] text-purple-600/80 mt-0.5 block">Urgency Score ≥ 80</span>
        </div>
      </div>

      {/* Analytics Charts Suite */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-agri-600" />
            <h2 className="text-lg font-bold text-slate-900">Algorithmic Analytics & Demand Visuals</h2>
          </div>
          <span className="text-xs text-slate-500">Live aggregated metrics</span>
        </div>

        <AnalyticsCharts charts={charts} />
      </div>

      {/* Navigation Quick Links Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link
          to="/admin/schedule"
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-agri-500 hover:shadow-md transition group space-y-2"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 group-hover:text-agri-600 transition">
            Master Timeline Schedule →
          </h3>
          <p className="text-xs text-slate-500">
            14-hour operational timeline (06:00 – 20:00) with logistics buffers and travel margins.
          </p>
        </Link>

        <Link
          to="/admin/conflicts"
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-rose-500 hover:shadow-md transition group space-y-2"
        >
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 group-hover:text-rose-600 transition">
            Conflict Resolution Center →
          </h3>
          <p className="text-xs text-slate-500">
            Strict double-booking prevention engine and feasible alternative recommendations.
          </p>
        </Link>

        <Link
          to="/admin/disruptions"
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-amber-500 hover:shadow-md transition group space-y-2"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Wrench className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 group-hover:text-amber-600 transition">
            Disruption Simulator →
          </h3>
          <p className="text-xs text-slate-500">
            Simulate sudden equipment breakdowns, flash storms, and last-minute cancellations.
          </p>
        </Link>

        <Link
          to="/admin/resources"
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-sky-500 hover:shadow-md transition group space-y-2"
        >
          <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
            <Tractor className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 group-hover:text-sky-600 transition">
            Geospatial Fleet Map →
          </h3>
          <p className="text-xs text-slate-500">
            Regional Leaflet map of all farmer parcels, equipment depots, and live operating statuses.
          </p>
        </Link>
      </div>

      {/* Recent Disruptions Feed */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Recent Disruption & Dynamic Reallocation Events
          </h3>
          <Link to="/admin/disruptions" className="text-xs text-agri-600 font-semibold hover:underline">
            Open Disruption Center
          </Link>
        </div>

        {disruptions.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">
            No disruption incidents recorded. System running stably.
          </div>
        ) : (
          <div className="space-y-3">
            {disruptions.map((d) => (
              <div
                key={d.id}
                className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{d.title}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 uppercase">
                      {d.severity}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                      {d.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Resource: <strong>{d.resource?.name}</strong> • {d.description}
                  </p>
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  {new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
