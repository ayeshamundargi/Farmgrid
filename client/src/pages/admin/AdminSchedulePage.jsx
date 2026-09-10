import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import MasterTimeline from '../../components/MasterTimeline';
import {
  Clock,
  Filter,
  RefreshCw,
  Tractor,
  Calendar,
  Layers,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';

export default function AdminSchedulePage() {
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedBooking, setSelectedBooking] = useState(null);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/schedule');
      const data = Array.isArray(res.data.data) ? res.data.data : (res.data.data?.timeline || []);
      setScheduleData(data);
    } catch (err) {
      console.error('Failed to load master schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule();

    const handleUpdate = () => loadSchedule();
    window.addEventListener('farmgrid_schedule_updated', handleUpdate);
    window.addEventListener('farmgrid_booking_reallocated', handleUpdate);
    window.addEventListener('farmgrid_disruption_created', handleUpdate);
    return () => {
      window.removeEventListener('farmgrid_schedule_updated', handleUpdate);
      window.removeEventListener('farmgrid_booking_reallocated', handleUpdate);
      window.removeEventListener('farmgrid_disruption_created', handleUpdate);
    };
  }, []);

  const types = ['ALL', ...new Set(scheduleData.map((s) => s.resourceType || s.type).filter(Boolean))];

  const filteredData = scheduleData.filter((item) => {
    if (selectedType === 'ALL') return true;
    return (item.resourceType || item.type) === selectedType;
  });

  const totalResources = scheduleData.length;
  const totalBookingsCount = scheduleData.reduce(
    (acc, item) => acc + (item.blocks?.filter((b) => b.type === 'BOOKING').length || 0),
    0
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-agri-600 block mb-1">
            Logistics & Time Slots
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Master Operational Timeline
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            14-hour daily timeline (06:00 – 20:00) visualizing active bookings, travel transit times, and logistics buffers across all equipment.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadSchedule}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            title="Refresh Timeline"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Summary Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Type Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Filter Equipment:
          </span>
          {types.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                selectedType === type
                  ? 'bg-agri-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Quick Counts */}
        <div className="flex items-center gap-4 text-xs">
          <span className="text-slate-600">
            Total Machinery: <strong className="text-slate-900">{totalResources}</strong>
          </span>
          <span className="text-emerald-700">
            Active Allocations: <strong className="text-emerald-800">{totalBookingsCount}</strong>
          </span>
        </div>
      </div>

      {/* Interactive Timeline Component */}
      {loading ? (
        <div className="text-center py-24 text-slate-400 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-agri-600" />
          Rendering master scheduling timeline...
        </div>
      ) : (
        <MasterTimeline
          timelineData={filteredData}
          onSelectBooking={(booking) => setSelectedBooking(booking)}
        />
      )}
    </div>
  );
}
