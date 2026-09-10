import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Calendar,
  Clock,
  Tractor,
  MapPin,
  Phone,
  User,
  CheckCircle2,
  RefreshCw,
  PlusCircle,
  Truck,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export default function FarmerSchedulePage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const res = await api.get('/requests/my');
      const requests = res.data.data || [];
      const scheduled = requests
        .filter((r) => r.booking && r.status === 'SCHEDULED')
        .map((r) => ({
          ...r.booking,
          request: r,
          farm: r.farm
        }));
      setBookings(scheduled);
    } catch (err) {
      console.error('Failed to load schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule();

    const handleUpdate = () => loadSchedule();
    window.addEventListener('farmgrid_schedule_updated', handleUpdate);
    window.addEventListener('schedule_updated', handleUpdate);
    return () => {
      window.removeEventListener('farmgrid_schedule_updated', handleUpdate);
      window.removeEventListener('schedule_updated', handleUpdate);
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-agri-600 block mb-1">
            Guaranteed Operational Windows
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            My Equipment Schedule
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Confirmed equipment slots with transit buffers, operator specifications, and owner dispatch details.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadSchedule}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/farmer/request"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-agri-600 hover:bg-agri-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            Book More Equipment
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-agri-600" />
          Loading your confirmed equipment slots...
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
          <Calendar className="w-12 h-12 mx-auto text-slate-300" />
          <h3 className="text-base font-bold text-slate-700">No Confirmed Bookings Yet</h3>
          <p className="text-xs max-w-md mx-auto text-slate-500">
            Submit a resource request to secure high-priority allocation slots during your peak harvesting or tilling window.
          </p>
          <Link
            to="/farmer/request"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-agri-600 rounded-lg hover:bg-agri-700 shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            Request Equipment Now
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const start = new Date(booking.startTime);
            const end = new Date(booking.endTime);
            const resource = booking.resource || {};
            const farm = booking.farm || booking.request?.farm || {};

            return (
              <div
                key={booking.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:border-slate-300 transition space-y-4"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-agri-50 text-agri-700 flex items-center justify-center font-bold text-2xl">
                      🚜
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-slate-900">{resource.name || 'Resource'}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
                          {booking.status}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        Type: <strong>{resource.type}</strong> • Fuel: {resource.fuelRequirement || 'Diesel'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-500 block">Date & Time</span>
                    <div className="text-sm font-black text-slate-900">
                      {start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    <div className="text-xs font-bold text-emerald-700">
                      {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                      {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  {/* Farm Location */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-agri-600" />
                      Destination Parcel
                    </span>
                    <div className="font-bold text-slate-800">{farm.name || 'Farm parcel'}</div>
                    <div className="text-slate-500 text-[11px]">
                      {farm.crop} ({farm.cropStage}) • {farm.cropArea} Acres
                    </div>
                    <div className="text-[11px] text-slate-400">
                      GPS: {farm.latitude?.toFixed(4)}, {farm.longitude?.toFixed(4)}
                    </div>
                  </div>

                  {/* Logistics & Buffer */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-sky-600" />
                      Transit & Clearance Buffer
                    </span>
                    <div className="font-bold text-slate-800">
                      {booking.travelMinutes || 15} min travel window
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Pre-buffer: {booking.bufferBeforeMinutes || 15}m • Post-buffer: {booking.bufferAfterMinutes || 15}m
                    </div>
                    <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Cleared for field delivery
                    </div>
                  </div>

                  {/* Operator & Contact */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                      Dispatch & Operator
                    </span>
                    <div className="font-bold text-slate-800">
                      {resource.operatorRequired ? 'Certified Operator Assigned' : 'Self-Operated Equipment'}
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Owner: {resource.owner?.name || 'Agri Hub Partner'}
                    </div>
                    {resource.owner?.phone && (
                      <div className="text-agri-700 font-bold flex items-center gap-1 text-[11px]">
                        <Phone className="w-3 h-3" />
                        {resource.owner.phone}
                      </div>
                    )}
                  </div>
                </div>

                {/* Explanation notes */}
                {booking.allocationExplanation && (
                  <div className="text-xs bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 text-emerald-900">
                    <span className="font-bold">Algorithmic Allocation Note:</span> {booking.allocationExplanation}
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
