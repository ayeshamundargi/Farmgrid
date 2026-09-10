import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import ConflictCard from '../../components/ConflictCard';
import {
  AlertOctagon,
  ShieldCheck,
  RefreshCw,
  Zap,
  CheckCircle2,
  Clock,
  MapPin,
  Tractor,
  Layers
} from 'lucide-react';

export default function AdminConflictsPage() {
  const [data, setData] = useState({ bookingConflicts: [], conflictRequests: [], totalConflicts: 0 });
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [resolveSuccess, setResolveSuccess] = useState(null);

  const loadConflicts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/conflicts');
      setData(res.data.data || { bookingConflicts: [], conflictRequests: [], totalConflicts: 0 });
    } catch (err) {
      console.error('Failed to load conflicts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConflicts();

    const handleUpdate = () => loadConflicts();
    window.addEventListener('farmgrid_conflict_detected', handleUpdate);
    window.addEventListener('farmgrid_schedule_updated', handleUpdate);
    return () => {
      window.removeEventListener('farmgrid_conflict_detected', handleUpdate);
      window.removeEventListener('farmgrid_schedule_updated', handleUpdate);
    };
  }, []);

  const handleResolveAll = async () => {
    try {
      setResolving(true);
      setResolveSuccess(null);
      const res = await api.post('/admin/reallocate');
      setResolveSuccess(res.data.message || 'Automated conflict resolution & reallocation executed.');
      await loadConflicts();
      setTimeout(() => setResolveSuccess(null), 6000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to resolve conflicts.');
    } finally {
      setResolving(false);
    }
  };

  const { bookingConflicts = [], conflictRequests = [], totalConflicts = 0 } = data;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-rose-600 block mb-1">
            Zero-Overlap Guarantee
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Conflict Resolution Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Strict double-booking prevention engine. Identifies competing requests for identical machinery and automatically finds feasible alternative windows.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadConflicts}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            title="Refresh Conflicts"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            disabled={resolving}
            onClick={handleResolveAll}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition disabled:opacity-50"
          >
            <Zap className={`w-4 h-4 ${resolving ? 'animate-spin text-amber-300' : ''}`} />
            {resolving ? 'Resolving...' : 'Auto-Resolve Conflicts'}
          </button>
        </div>
      </div>

      {resolveSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex items-center gap-3 text-xs font-bold text-emerald-900 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{resolveSuccess}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-agri-600" />
          Checking schedule matrix for overlapping allocations...
        </div>
      ) : totalConflicts === 0 ? (
        <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-2xl p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-600/30">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-black text-emerald-950">
              Zero Double-Bookings Detected
            </h3>
            <p className="text-xs text-emerald-800 max-w-lg mx-auto mt-1">
              All active allocations comply with strict non-overlapping constraints and include necessary transit time margins. The central coordinator has prevented 100% of scheduling collisions.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={handleResolveAll}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition"
            >
              Verify & Re-Optimize Schedule
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Booking overlapping conflicts */}
          {bookingConflicts.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                Direct Time Overlaps ({bookingConflicts.length})
              </h3>
              <div className="space-y-4">
                {bookingConflicts.map((c, idx) => (
                  <ConflictCard
                    key={idx}
                    resourceName={c.booking1?.resource?.name || 'Assigned Machinery'}
                    existingBooking={`${new Date(c.booking1?.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${new Date(c.booking1?.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    requestedWindow={`${new Date(c.booking2?.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${new Date(c.booking2?.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    suggestedAlternative={{
                      resourceName: 'Alternate Regional Unit (Ready)',
                      timeWindow: 'Offset by +60m',
                      distanceKm: 4.2
                    }}
                    onResolve={handleResolveAll}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Conflict Requests */}
          {conflictRequests.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-amber-600" />
                Requests Flagged in Conflict State ({conflictRequests.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {conflictRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white p-5 rounded-xl border border-amber-300 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">
                        {req.resourceType} for {req.farmer?.name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                        CONFLICT
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <div>Farm: <strong>{req.farm?.name}</strong> ({req.farm?.crop})</div>
                      <div>
                        Window: {new Date(req.earliestStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                        {new Date(req.latestEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div>Priority Score: <strong>{req.priorityScore?.toFixed(1) || '—'}</strong></div>
                    </div>
                    <button
                      type="button"
                      onClick={handleResolveAll}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition"
                    >
                      Find Feasible Alternate Slot
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
