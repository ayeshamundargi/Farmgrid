import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Tractor,
  PlusCircle,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  MapPin,
  RefreshCw,
  X,
  Flame,
  UserCheck
} from 'lucide-react';

export default function OwnerResourcesPage() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  // Breakdown modal state
  const [breakdownResource, setBreakdownResource] = useState(null);
  const [breakdownReason, setBreakdownReason] = useState('');
  const [breakdownSeverity, setBreakdownSeverity] = useState('HIGH');
  const [breakdownSubmitting, setBreakdownSubmitting] = useState(false);
  const [breakdownResult, setBreakdownResult] = useState(null);

  // Maintenance update state
  const [updatingMaintenanceId, setUpdatingMaintenanceId] = useState(null);

  const loadResources = async () => {
    try {
      setLoading(true);
      const res = await api.get('/resources/my');
      setResources(res.data.data || []);
    } catch (err) {
      console.error('Failed to load resources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResources();

    const handleUpdate = () => loadResources();
    window.addEventListener('farmgrid_resource_status_changed', handleUpdate);
    window.addEventListener('farmgrid_schedule_updated', handleUpdate);
    return () => {
      window.removeEventListener('farmgrid_resource_status_changed', handleUpdate);
      window.removeEventListener('farmgrid_schedule_updated', handleUpdate);
    };
  }, []);

  const handleMaintenanceChange = async (id, status) => {
    try {
      setUpdatingMaintenanceId(id);
      await api.post(`/resources/${id}/maintenance`, { maintenanceStatus: status });
      await loadResources();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update maintenance status.');
    } finally {
      setUpdatingMaintenanceId(null);
    }
  };

  const handleReportBreakdown = async (e) => {
    e.preventDefault();
    if (!breakdownResource) return;
    try {
      setBreakdownSubmitting(true);
      const res = await api.post(`/resources/${breakdownResource.id}/breakdown`, {
        reason: breakdownReason,
        severity: breakdownSeverity
      });
      setBreakdownResult(res.data.data);
      await loadResources();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to report breakdown.');
    } finally {
      setBreakdownSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-agri-600 block mb-1">
            Machinery & Fleet Operations
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Equipment Fleet
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your registered machinery, toggle routine maintenance, and trigger automated emergency breakdown reallocations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadResources}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/owner/resources/new"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-agri-600 hover:bg-agri-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            Add New Equipment
          </Link>
        </div>
      </div>

      {/* Equipment Table / Cards */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-agri-600" />
          Loading your fleet equipment...
        </div>
      ) : resources.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
          <Tractor className="w-12 h-12 mx-auto text-slate-300" />
          <h3 className="text-base font-bold text-slate-700">No Machinery Registered Yet</h3>
          <p className="text-xs max-w-md mx-auto text-slate-500">
            Register your tractors, harvesters, tillers, and pumps to start accepting automated bookings.
          </p>
          <Link
            to="/owner/resources/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-agri-600 rounded-lg hover:bg-agri-700 shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            Add First Resource
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {resources.map((res) => {
            const isAvailable = res.status === 'AVAILABLE';
            const isMaintenance = res.status === 'MAINTENANCE' || res.maintenanceStatus !== 'NORMAL';

            return (
              <div
                key={res.id}
                className={`bg-white rounded-2xl border shadow-sm p-6 space-y-4 transition ${
                  isMaintenance
                    ? 'border-rose-300 bg-rose-50/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-2xl">
                      🚜
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900">{res.name}</h3>
                      <span className="text-xs font-semibold text-agri-700 uppercase">
                        {res.type}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wide border ${
                        res.status === 'AVAILABLE'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : res.status === 'BOOKED'
                          ? 'bg-sky-100 text-sky-800 border-sky-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}
                    >
                      {res.status}
                    </span>
                    {res.maintenanceStatus !== 'NORMAL' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 uppercase">
                        {res.maintenanceStatus}
                      </span>
                    )}
                  </div>
                </div>

                {/* Specs / Meta */}
                <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Operating Hours</span>
                    <div className="font-semibold text-slate-800">
                      {res.operatingStart || '06:00'} – {res.operatingEnd || '20:00'}
                    </div>
                    <span className="text-[11px] text-slate-400">Daily Window</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Operator & Fuel</span>
                    <div className="font-semibold text-slate-800 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                      {res.operatorRequired ? 'Operator Req.' : 'Self-Operate'}
                    </div>
                    <span className="text-[11px] text-slate-500">Fuel: {res.fuelRequirement || 'Diesel'}</span>
                  </div>

                  <div className="col-span-2 text-[11px] text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Location: {res.latitude?.toFixed(4)}, {res.longitude?.toFixed(4)}</span>
                  </div>
                </div>

                {/* Active bookings count */}
                <div className="text-xs text-slate-500 flex items-center justify-between">
                  <span>
                    Current Active Bookings: <strong className="text-slate-800">{res.bookings?.length || 0}</strong>
                  </span>
                  <Link
                    to="/owner/bookings"
                    className="text-agri-600 font-semibold hover:underline"
                  >
                    View Schedule →
                  </Link>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  {/* Maintenance Selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500 font-medium">Maintenance:</span>
                    <select
                      value={res.maintenanceStatus}
                      disabled={updatingMaintenanceId === res.id}
                      onChange={(e) => handleMaintenanceChange(res.id, e.target.value)}
                      className="px-2 py-1 rounded border border-slate-200 text-xs font-semibold focus:outline-none bg-white"
                    >
                      <option value="NORMAL">NORMAL</option>
                      <option value="SCHEDULED">SCHEDULED</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                    </select>
                  </div>

                  {/* Emergency Breakdown Trigger */}
                  <button
                    type="button"
                    onClick={() => {
                      setBreakdownResource(res);
                      setBreakdownReason('');
                      setBreakdownResult(null);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-xs"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    Report Breakdown
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Report Breakdown Modal */}
      {breakdownResource && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">
                  Report Breakdown: {breakdownResource.name}
                </h3>
              </div>
              <button
                onClick={() => setBreakdownResource(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {breakdownResult ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-2">
                  <div className="font-bold text-sm flex items-center gap-1.5 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4" />
                    Breakdown Logged & Dynamic Reallocation Triggered
                  </div>
                  <p>
                    Affected Bookings:{' '}
                    <strong>{breakdownResult.affectedCount || breakdownResult.reallocatedCount || 0}</strong>
                  </p>
                  <p>
                    Reallocated to alternate machinery:{' '}
                    <strong>{breakdownResult.reallocatedCount || 0}</strong>
                  </p>
                  <p>
                    Pushed to priority waitlist:{' '}
                    <strong>{breakdownResult.waitlistedCount || 0}</strong>
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setBreakdownResource(null)}
                    className="px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded-lg"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleReportBreakdown} className="space-y-4 text-xs">
                <p className="text-slate-500">
                  Reporting a breakdown will immediately set this machine's status to <strong>MAINTENANCE</strong> and activate the real-time dynamic reallocation engine to migrate assigned farmers to alternative regional units.
                </p>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Reason / Diagnosis *</label>
                  <textarea
                    required
                    rows={3}
                    value={breakdownReason}
                    onChange={(e) => setBreakdownReason(e.target.value)}
                    placeholder="e.g. Hydraulic pump seal failure, requires workshop overhaul."
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Severity Level</label>
                  <select
                    value={breakdownSeverity}
                    onChange={(e) => setBreakdownSeverity(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs font-medium"
                  >
                    <option value="MEDIUM">Medium — Minor repair expected</option>
                    <option value="HIGH">High — Field operation halt</option>
                    <option value="CRITICAL">Critical — Complete powertrain failure</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setBreakdownResource(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={breakdownSubmitting}
                    className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    {breakdownSubmitting ? 'Triggering Reallocation...' : 'Confirm Breakdown'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
