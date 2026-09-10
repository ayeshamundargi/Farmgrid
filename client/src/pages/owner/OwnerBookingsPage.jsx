import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Calendar,
  Clock,
  Tractor,
  MapPin,
  Truck,
  CheckCircle2,
  RefreshCw,
  PlusCircle,
  AlertTriangle
} from 'lucide-react';

export default function OwnerBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/resources/my');
      const resources = res.data.data || [];
      const flatBookings = resources.flatMap((r) =>
        (r.bookings || []).map((b) => ({ ...b, resource: r }))
      );
      // Sort chronologically
      flatBookings.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
      setBookings(flatBookings);
    } catch (err) {
      console.error('Failed to load owner bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();

    const handleUpdate = () => loadBookings();
    window.addEventListener('farmgrid_schedule_updated', handleUpdate);
    window.addEventListener('farmgrid_resource_status_changed', handleUpdate);
    return () => {
      window.removeEventListener('farmgrid_schedule_updated', handleUpdate);
      window.removeEventListener('farmgrid_resource_status_changed', handleUpdate);
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-agri-600 block mb-1">
            Machinery Deployments
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Assigned Fleet Bookings
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Confirmed dispatch schedule across all your registered tractors, harvesters, and irrigation units.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadBookings}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/owner/resources"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition"
          >
            <Tractor className="w-4 h-4" />
            Manage Fleet
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-agri-600" />
          Loading assigned deployments...
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
          <Calendar className="w-12 h-12 mx-auto text-slate-300" />
          <h3 className="text-base font-bold text-slate-700">No Bookings Assigned Yet</h3>
          <p className="text-xs max-w-md mx-auto text-slate-500">
            When farmers submit requests matching your machinery type and operating hours, guaranteed slots will appear here with transit buffers.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const start = new Date(b.startTime);
            const end = new Date(b.endTime);

            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:border-slate-300 transition space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-agri-50 text-agri-700 flex items-center justify-center font-bold text-2xl">
                      🚜
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-slate-900">{b.resource?.name}</h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {b.status}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        Type: <strong>{b.resource?.type}</strong> • Booking #{b.id}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-500 block">Dispatch Window</span>
                    <div className="text-sm font-black text-slate-900">
                      {start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    <div className="text-xs font-bold text-emerald-700">
                      {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                      {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                {/* Logistics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-sky-600" />
                      Transit & Buffering Margins
                    </span>
                    <div className="font-bold text-slate-800">
                      Transit Time: {b.travelMinutes || 15} minutes
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Logistics pre-buffer: {b.bufferBeforeMinutes || 15}m | post-buffer: {b.bufferAfterMinutes || 15}m
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      Depot Coordinates
                    </span>
                    <div className="font-bold text-slate-800">
                      Base GPS: {b.resource?.latitude?.toFixed(4)}, {b.resource?.longitude?.toFixed(4)}
                    </div>
                    <div className="text-emerald-700 text-[11px] font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Zero Overlap Guaranteed
                    </div>
                  </div>
                </div>

                {b.allocationExplanation && (
                  <div className="text-xs bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 text-emerald-900">
                    <span className="font-bold">Scheduler Explanation:</span> {b.allocationExplanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
