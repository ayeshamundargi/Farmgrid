import React, { useState } from 'react';
import api from '../services/api';
import { Wrench, CloudRain, Ban, RefreshCw, AlertTriangle, ArrowRight, CheckCircle, Clock } from 'lucide-react';

export default function DisruptionSimulator({ onDisruptionTriggered = null }) {
  const [loading, setLoading] = useState(false);
  const [diffResult, setDiffResult] = useState(null);
  const [error, setError] = useState(null);

  const runSimulation = async (type, extraData = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/admin/disruptions', {
        type,
        ...extraData
      });
      setDiffResult(res.data.data);
      if (onDisruptionTriggered) {
        onDisruptionTriggered(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to execute disruption simulation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            Real-Time Resilience Engine
          </span>
          <h3 className="text-lg font-bold text-slate-900 mt-0.5">Disruption & Dynamic Reallocation Center</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Test automated rescheduling under sudden equipment breakdowns, severe weather, and last-minute cancellations.
          </p>
        </div>

        {/* Action Simulation Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => runSimulation('BREAKDOWN')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50"
          >
            <Wrench className="w-4 h-4" />
            Simulate Breakdown
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => runSimulation('WEATHER', { rainSeverity: 'CRITICAL' })}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50"
          >
            <CloudRain className="w-4 h-4" />
            Simulate Heavy Rain
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => runSimulation('CANCELLATION')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50"
          >
            <Ban className="w-4 h-4" />
            Simulate Cancellation
          </button>
        </div>
      </div>

      {loading && (
        <div className="py-8 flex items-center justify-center gap-3 text-sm text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin text-agri-600" />
          <span>Executing dynamic reallocation algorithms and recalculating priorities...</span>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
          {error}
        </div>
      )}

      {/* Visual BEFORE vs AFTER Comparison Card */}
      {diffResult && !loading && (
        <div className="mt-6 bg-slate-900 text-white rounded-xl p-5 shadow-lg border border-slate-800 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></span>
              <h4 className="font-bold text-sm tracking-wide">
                DISRUPTION SIMULATION EVENT: {diffResult.type}
              </h4>
            </div>
            <button
              onClick={() => setDiffResult(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Dismiss
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {/* BEFORE PANEL */}
            <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase pb-2 border-b border-slate-700">
                <span>BEFORE DISRUPTION</span>
                <span className="text-rose-400">Target Resource</span>
              </div>

              <div className="mt-3 space-y-2">
                <div className="text-sm font-bold text-slate-200">
                  {diffResult.before?.resourceName || diffResult.resource?.name || 'Mahindra 575 DI (Tractor-01)'}
                </div>
                <div className="text-xs text-slate-400">
                  Status: <span className="text-emerald-400 font-semibold">AVAILABLE</span>
                </div>

                <div className="pt-2 text-xs space-y-2">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase">Original Active Bookings:</div>
                  {diffResult.before?.bookings && diffResult.before.bookings.length > 0 ? (
                    diffResult.before.bookings.map((b, idx) => (
                      <div key={idx} className="bg-slate-700/60 p-2 rounded-lg text-xs flex justify-between items-center">
                        <span className="font-medium text-slate-200">
                          {b.request?.farmer?.name || `Farmer #${b.requestId}`}
                        </span>
                        <span className="text-[11px] font-mono text-slate-300">
                          {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 italic">No previous bookings on this unit.</div>
                  )}
                </div>
              </div>
            </div>

            {/* AFTER REALLOCATION PANEL */}
            <div className="bg-slate-800/80 rounded-xl p-4 border border-emerald-600/40">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase pb-2 border-b border-slate-700">
                <span>AFTER DYNAMIC REALLOCATION</span>
                <span className="text-emerald-400">Automated Solution</span>
              </div>

              <div className="mt-3 space-y-2">
                <div className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <span>Reallocated: {diffResult.after?.reallocatedCount ?? diffResult.reallocation?.reallocatedCount ?? 0}</span>
                  <span className="text-slate-500">|</span>
                  <span className="text-amber-400">Waitlisted: {diffResult.after?.waitlistedCount ?? diffResult.reallocation?.waitlistedCount ?? 0}</span>
                </div>

                <div className="pt-2 text-xs space-y-2">
                  <div className="text-[11px] font-semibold text-emerald-400 uppercase">New Schedules & Assignments:</div>

                  {/* Reallocated items */}
                  {diffResult.after?.reallocatedDetails && diffResult.after.reallocatedDetails.map((item, idx) => (
                    <div key={idx} className="bg-emerald-950/50 border border-emerald-800/50 p-2.5 rounded-lg text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-emerald-300">{item.request?.farmer?.name || 'Farmer'}</span>
                        <span className="font-mono text-emerald-200 text-[11px]">
                          {new Date(item.newSlot?.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" />
                        <span>Moved to: <strong>{item.newResource?.name}</strong></span>
                      </div>
                    </div>
                  ))}

                  {/* Waitlisted items */}
                  {diffResult.after?.waitlistedDetails && diffResult.after.waitlistedDetails.map((item, idx) => (
                    <div key={idx} className="bg-amber-950/40 border border-amber-800/40 p-2 rounded-lg text-xs flex justify-between items-center">
                      <span className="font-medium text-amber-300">{item.request?.farmer?.name || 'Farmer'}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 uppercase">
                        WAITLIST (High Priority Saved)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
