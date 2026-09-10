import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import FarmMap from '../../components/FarmMap';
import {
  Tractor,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  FileText
} from 'lucide-react';

export default function FarmerDashboard() {
  const { user, isOnline, pendingSyncCount } = useAuth();
  const [farms, setFarms] = useState([]);
  const [requests, setRequests] = useState([]);
  const [availableResources, setAvailableResources] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [farmsRes, requestsRes, resourcesRes] = await Promise.allSettled([
        api.get('/farms'),
        api.get('/requests/my'),
        api.get('/resources/available')
      ]);

      if (farmsRes.status === 'fulfilled') setFarms(farmsRes.value.data.data || []);
      if (requestsRes.status === 'fulfilled') setRequests(requestsRes.value.data.data || []);
      if (resourcesRes.status === 'fulfilled') setAvailableResources(resourcesRes.value.data.data || []);
    } catch (err) {
      console.error('Failed to load farmer dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('farmgrid_schedule_updated', handleUpdate);
    window.addEventListener('schedule_updated', handleUpdate);
    return () => {
      window.removeEventListener('farmgrid_schedule_updated', handleUpdate);
      window.removeEventListener('schedule_updated', handleUpdate);
    };
  }, []);

  const scheduledBookings = requests.filter((r) => r.status === 'SCHEDULED');
  const pendingRequests = requests.filter((r) => r.status === 'PENDING' || r.status === 'WAITLIST');
  const conflictRequests = requests.filter((r) => r.status === 'CONFLICT');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-agri-900 to-agri-800 rounded-2xl p-6 sm:p-8 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-agri-700/60 text-agri-200 mb-2">
            👨‍🌾 Farmer Command Terminal
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Welcome back, {user?.name || 'Farmer'}
          </h1>
          <p className="text-sm text-agri-100/90 mt-1 max-w-2xl">
            Coordinate tractors, harvesters, and irrigation under peak crop windows. Transparent priority scores ensure fair allocation during high demand.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/farmer/request"
            className="flex items-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl shadow-md transition transform active:scale-95"
          >
            <PlusCircle className="w-5 h-5" />
            Request Equipment
          </Link>
          <Link
            to="/farmer/schedule"
            className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm rounded-xl border border-white/20 transition"
          >
            <Calendar className="w-4 h-4 text-agri-300" />
            My Schedule
          </Link>
        </div>
      </div>

      {/* Offline Sync Notice */}
      {!isOnline && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <h4 className="text-sm font-bold text-amber-900">You are in Offline Staging Mode</h4>
              <p className="text-xs text-amber-700">
                You can still create resource requests. They will be stored locally in IndexedDB and queued for automatic sync once connection is restored.
              </p>
            </div>
          </div>
          {pendingSyncCount > 0 && (
            <span className="px-3 py-1 rounded-full bg-amber-200 text-amber-900 text-xs font-bold">
              {pendingSyncCount} Queued
            </span>
          )}
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered Farms</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{farms.length}</div>
            <span className="text-xs text-slate-400 mt-0.5 block">Managed Parcels</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-agri-50 text-agri-600 flex items-center justify-center font-bold text-xl">
            🌱
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Active Bookings</span>
            <div className="text-2xl font-black text-emerald-700 mt-1">{scheduledBookings.length}</div>
            <span className="text-xs text-emerald-600/80 mt-0.5 block">Guaranteed Slots</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">In Queue / Waitlist</span>
            <div className="text-2xl font-black text-amber-600 mt-1">{pendingRequests.length}</div>
            <span className="text-xs text-amber-600/80 mt-0.5 block">Awaiting Allocation</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-sky-600 uppercase tracking-wider">Available Fleet</span>
            <div className="text-2xl font-black text-sky-700 mt-1">{availableResources.length}</div>
            <span className="text-xs text-sky-600/80 mt-0.5 block">Nearby In Region</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Tractor className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Geospatial Map + Recent Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Map of Farms & Nearby Hubs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-agri-600" />
              <h2 className="text-lg font-bold text-slate-900">Geospatial Resource Coordination Map</h2>
            </div>
            <span className="text-xs text-slate-500">Green = Your Farms | Blue = Available Equipment</span>
          </div>

          <FarmMap
            farms={farms}
            resources={availableResources}
            height="440px"
          />
        </div>

        {/* Recent Requests Sidebar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-agri-600" />
              Recent Requests
            </h3>
            <Link to="/farmer/requests" className="text-xs text-agri-600 font-semibold hover:underline">
              View All
            </Link>
          </div>

          {requests.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No requests submitted yet. Click "Request Equipment" to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {requests.slice(0, 5).map((req) => {
                let badgeColor = 'bg-slate-100 text-slate-700';
                if (req.status === 'SCHEDULED') badgeColor = 'bg-emerald-100 text-emerald-800';
                else if (req.status === 'WAITLIST') badgeColor = 'bg-amber-100 text-amber-800';
                else if (req.status === 'CONFLICT') badgeColor = 'bg-rose-100 text-rose-800';

                return (
                  <div
                    key={req.id}
                    className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <Tractor className="w-3.5 h-3.5 text-slate-500" />
                        {req.resourceType}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {req.farm?.name || 'Farm parcel'} • {req.durationMinutes} min
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${badgeColor}`}>
                        {req.status}
                      </span>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Score: {req.priorityScore?.toFixed(1) || '—'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-2">
            <Link
              to="/farmer/requests"
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              See All Request Details & Priority Breakdown
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
