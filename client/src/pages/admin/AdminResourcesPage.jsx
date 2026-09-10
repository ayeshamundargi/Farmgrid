import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import FarmMap from '../../components/FarmMap';
import {
  Tractor,
  MapPin,
  Search,
  Filter,
  RefreshCw,
  Phone,
  User,
  Clock,
  Wrench,
  CheckCircle2
} from 'lucide-react';

export default function AdminResourcesPage() {
  const [resources, setResources] = useState([]);
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const loadData = async () => {
    try {
      setLoading(true);
      const [resRes, bookRes] = await Promise.allSettled([
        api.get('/admin/resources'),
        api.get('/admin/bookings')
      ]);

      if (resRes.status === 'fulfilled') {
        setResources(resRes.value.data.data || []);
      }

      if (bookRes.status === 'fulfilled') {
        const bookings = bookRes.value.data.data || [];
        const extractedFarms = bookings
          .map((b) => b.request?.farm)
          .filter((f, idx, self) => f && self.findIndex((s) => s?.id === f?.id) === idx);
        setFarms(extractedFarms);
      }
    } catch (err) {
      console.error('Failed to load resources:', err);
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

  const types = ['ALL', ...new Set(resources.map((r) => r.type).filter(Boolean))];

  const filtered = resources.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.owner?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.type.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || r.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-agri-600 block mb-1">
            Regional Fleet Registry
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            All Agricultural Resources
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Geospatial tracking and status matrix of all registered machinery across participating custom hiring centers and farms.
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition self-start sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Geospatial Map */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-agri-600" />
            Regional Fleet & Farm Hub Map
          </h3>
          <span className="text-xs text-slate-400">Markers indicate live machine statuses</span>
        </div>

        <FarmMap
          farms={farms}
          resources={resources}
          height="420px"
        />
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by equipment, type, owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-agri-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-none bg-slate-50"
            >
              <option value="ALL">ALL ({resources.length})</option>
              <option value="AVAILABLE">Available</option>
              <option value="BOOKED">Booked</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-none bg-slate-50"
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Resources Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Equipment</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Owner / Hub</th>
                <th className="py-3.5 px-4">Operating Window</th>
                <th className="py-3.5 px-4">Operator</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Active Bookings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filtered.map((res) => (
                <tr key={res.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 text-xs">{res.name}</div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      GPS: {res.latitude?.toFixed(3)}, {res.longitude?.toFixed(3)}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-bold text-agri-800 uppercase text-[11px]">
                    {res.type}
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{res.owner?.name || 'Owner'}</div>
                    {res.owner?.phone && (
                      <span className="text-[10px] text-slate-400 block">{res.owner.phone}</span>
                    )}
                  </td>

                  <td className="py-3 px-4 font-mono text-[11px]">
                    {res.operatingStart || '06:00'} – {res.operatingEnd || '20:00'}
                  </td>

                  <td className="py-3 px-4">
                    {res.operatorRequired ? (
                      <span className="inline-flex items-center gap-1 text-slate-800 font-semibold text-[11px]">
                        Required
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Self-Operate</span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        res.status === 'AVAILABLE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : res.status === 'BOOKED'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {res.status}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900">
                      {res.bookings?.length || 0}
                    </span>{' '}
                    <span className="text-slate-400 text-[10px]">active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
