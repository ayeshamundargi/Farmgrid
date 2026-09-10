import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import DisruptionSimulator from '../../components/DisruptionSimulator';
import {
  Wrench,
  CloudRain,
  Ban,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Clock,
  ShieldCheck,
  Zap
} from 'lucide-react';

export default function AdminDisruptionsPage() {
  const [disruptions, setDisruptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastDiff, setLastDiff] = useState(null);

  const loadDisruptions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/dashboard');
      setDisruptions(res.data.data.recentDisruptions || []);
    } catch (err) {
      console.error('Failed to load disruptions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDisruptions();

    const handleUpdate = () => loadDisruptions();
    window.addEventListener('farmgrid_disruption_created', handleUpdate);
    window.addEventListener('farmgrid_booking_reallocated', handleUpdate);
    return () => {
      window.removeEventListener('farmgrid_disruption_created', handleUpdate);
      window.removeEventListener('farmgrid_booking_reallocated', handleUpdate);
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-amber-600 block mb-1">
          Dynamic Rescheduling Under Scarcity
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Disruption & Resilience Center
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Test real-time algorithmic reactions to sudden machinery breakdowns, approaching storm fronts, and farmer cancellations.
        </p>
      </div>

      {/* Disruption Simulator Interactive Component */}
      <DisruptionSimulator
        onDisruptionTriggered={(diff) => {
          setLastDiff(diff);
          loadDisruptions();
        }}
      />

      {/* Recent Disruption Log */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-agri-600" />
            Historical Disruption Log
          </h3>
          <button
            onClick={loadDisruptions}
            className="p-1.5 text-slate-400 hover:text-slate-600 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-400 text-xs">Loading incident log...</div>
        ) : disruptions.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No disruptions recorded. Use the simulator above to test resilience scenarios.
          </div>
        ) : (
          <div className="space-y-3">
            {disruptions.map((d) => (
              <div
                key={d.id}
                className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{d.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        d.severity === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {d.severity}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800 uppercase">
                      {d.type}
                    </span>
                  </div>
                  <p className="text-slate-500 mt-1">
                    Resource: <strong>{d.resource?.name}</strong> • {d.description}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-slate-400 text-[11px] block">
                    {new Date(d.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                  <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1 justify-end mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Handled by Reallocation Engine
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
