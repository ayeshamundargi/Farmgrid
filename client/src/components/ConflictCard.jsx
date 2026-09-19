import React from 'react';
import { AlertOctagon, ShieldAlert, ArrowRight, CheckCircle2, Clock, MapPin } from 'lucide-react';

export default function ConflictCard({
  resourceName = 'Tractor-01',
  existingBooking = '10:00 – 13:00',
  requestedWindow = '12:00 – 15:00',
  suggestedAlternative = null,
  onResolve = null
}) {
  return (
    <div className="bg-rose-50 border-2 border-rose-200 rounded-xl p-5 shadow-sm text-slate-900">
      <div className="flex items-center justify-between pb-3 border-b border-rose-200/80">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-rose-950 uppercase tracking-wide">Conflict Detected</h4>
            <span className="text-xs font-semibold text-rose-700">Strict Double Booking Prevention Active</span>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-md text-[11px] font-black bg-rose-200 text-rose-900 border border-rose-300">
          DOUBLE BOOKING BLOCKED
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 text-xs">
        {/* Conflicting Slots Comparison */}
        <div className="bg-white p-3.5 rounded-lg border border-rose-200 space-y-1.5">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Target Resource</div>
          <div className="font-bold text-slate-800 text-sm">{resourceName}</div>
          <div className="text-slate-600 flex items-center gap-1.5 pt-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Existing Booking: <strong className="text-rose-900">{existingBooking}</strong></span>
          </div>
          <div className="text-slate-600 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-rose-500" />
            <span>Overlapping Requested: <strong className="text-rose-900">{requestedWindow}</strong></span>
          </div>
        </div>

        {/* Suggested Alternative Feasible Slot */}
        <div className="bg-emerald-50/80 p-3.5 rounded-lg border border-emerald-300 space-y-1.5">
          <div className="text-[11px] font-bold text-emerald-800 uppercase flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Recommended Feasible Alternative
          </div>
          {suggestedAlternative ? (
            <>
              <div className="font-bold text-emerald-950 text-sm">{suggestedAlternative.resourceName}</div>
              <div className="text-emerald-900 text-xs flex items-center gap-1.5 pt-1">
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                <span>Feasible Slot: <strong>{suggestedAlternative.timeWindow}</strong></span>
              </div>
              <div className="text-emerald-800 text-[11px] flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>{suggestedAlternative.distanceKm} km transit with cleared buffer</span>
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-600 pt-1">
              Alternative equipment slots being evaluated by master reallocation engine.
            </div>
          )}
        </div>
      </div>

      {onResolve && (
        <div className="flex justify-end pt-1">
          <button
            onClick={onResolve}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold transition"
          >
            Apply Alternative Allocation
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
