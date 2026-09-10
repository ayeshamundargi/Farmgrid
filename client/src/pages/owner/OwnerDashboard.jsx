import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import FarmMap from '../../components/FarmMap';
import {
  Tractor,
  PlusCircle,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Clock,
  ShieldCheck
} from 'lucide-react';

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/resources/my');
      setResources(res.data.data || []);
    } catch (err) {
      console.error('Failed to load owner data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('farmgrid_resource_status_changed', handleUpdate);
    window.addEventListener('farmgrid_schedule_updated', handleUpdate);
    return () => {
      window.removeEventListener('farmgrid_resource_status_changed', handleUpdate);
      window.removeEventListener('farmgrid_schedule_updated', handleUpdate);
    };
  }, []);

  const totalUnits = resources.length;
  const availableUnits = resources.filter((r) => r.status === 'AVAILABLE').length;
  const bookedUnits = resources.filter((r) => r.status === 'BOOKED').length;
  const maintenanceUnits = resources.filter((r) => r.status === 'MAINTENANCE' || r.maintenanceStatus !== 'NORMAL').length;

  // Collect all active bookings across fleet
  const allBookings = resources.flatMap((r) =>
    (r.bookings || []).map((b) => ({ ...b, resource: r }))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-900/60 text-emerald-300 mb-2">
            🚜 Equipment Hub & Fleet Management
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {user?.name || 'Equipment Hub Owner'}
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Maximize machinery utilization, manage maintenance schedules, and monitor field deployments across regional farmer clusters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/owner/resources/new"
            className="flex items-center gap-2 px-5 py-3 bg-agri-600 hover:bg-agri-700 text-white font-bold text-sm rounded-xl shadow-md transition transform active:scale-95"
          >
            <PlusCircle className="w-5 h-5" />
            Add Resource
          </Link>
          <Link
            to="/owner/resources"
            className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm rounded-xl border border-white/20 transition"
          >
            <Wrench className="w-4 h-4 text-amber-400" />
            Fleet & Breakdowns
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Fleet Size</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{totalUnits}</div>
            <span className="text-xs text-slate-400 mt-0.5 block">Managed Machines</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xl">
            🚜
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Available Now</span>
            <div className="text-2xl font-black text-emerald-700 mt-1">{availableUnits}</div>
            <span className="text-xs text-emerald-600/80 mt-0.5 block">Ready For Deployment</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-sky-600 uppercase tracking-wider">Actively Booked</span>
            <div className="text-2xl font-black text-sky-700 mt-1">{bookedUnits}</div>
            <span className="text-xs text-sky-600/80 mt-0.5 block">Operating in Fields</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Under Maintenance</span>
            <div className="text-2xl font-black text-rose-700 mt-1">{maintenanceUnits}</div>
            <span className="text-xs text-rose-600/80 mt-0.5 block">Off Duty / Service</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Wrench className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Fleet Map + Fleet Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Map of Owner Fleet */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tractor className="w-5 h-5 text-agri-600" />
              <h2 className="text-lg font-bold text-slate-900">Fleet Deployment Map</h2>
            </div>
            <Link to="/owner/resources" className="text-xs font-bold text-agri-600 hover:underline">
              Manage Equipment Table →
            </Link>
          </div>

          <FarmMap
            farms={[]}
            resources={resources}
            height="440px"
          />
        </div>

        {/* Assigned Bookings Sidebar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-agri-600" />
              Assigned Bookings Today
            </h3>
            <Link to="/owner/bookings" className="text-xs text-agri-600 font-semibold hover:underline">
              View All
            </Link>
          </div>

          {allBookings.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No active bookings on your equipment right now.
            </div>
          ) : (
            <div className="space-y-3">
              {allBookings.slice(0, 5).map((booking) => (
                <div
                  key={booking.id}
                  className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{booking.resource?.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                      {booking.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                    {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Buffer: {booking.travelMinutes || 15}m transit
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2">
            <Link
              to="/owner/resources"
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Inspect Fleet Equipment
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
