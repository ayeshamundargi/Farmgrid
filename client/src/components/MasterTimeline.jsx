import React, { useState } from 'react';
import { Clock, ShieldAlert, CheckCircle2, Truck, Wrench, AlertTriangle, Info, X } from 'lucide-react';

export default function MasterTimeline({ timelineData = [], onSelectBooking = null }) {
  const [selectedBlock, setSelectedBlock] = useState(null);

  // Timeline hours span from 06:00 to 20:00 (14 hours = 840 minutes)
  const timelineStartHour = 6;
  const timelineEndHour = 20;
  const totalMinutes = (timelineEndHour - timelineStartHour) * 60;

  const getPositionPercent = (date) => {
    const d = new Date(date);
    const minutesFromStart = (d.getHours() - timelineStartHour) * 60 + d.getMinutes();
    return Math.min(100, Math.max(0, (minutesFromStart / totalMinutes) * 100));
  };

  const getWidthPercent = (startDate, endDate) => {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const durationMin = (e.getTime() - s.getTime()) / 60000;
    return Math.max(1.5, Math.min(100, (durationMin / totalMinutes) * 100));
  };

  // Hour markers for header
  const hours = [];
  for (let h = timelineStartHour; h <= timelineEndHour; h++) {
    hours.push(`${h < 10 ? '0' : ''}${h}:00`);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Legend & Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-agri-600" />
            Resource Scheduling Timeline & Logistics Buffer
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational hours (06:00 – 20:00) with transit times and logistics buffers
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="w-3.5 h-3.5 rounded bg-emerald-600 inline-block shadow-sm"></span>
            Active Booking
          </span>
          <span className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="w-3.5 h-3.5 rounded bg-sky-500 inline-block shadow-sm"></span>
            Travel Transit
          </span>
          <span className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="w-3.5 h-3.5 rounded bg-amber-200 border border-amber-400 border-dashed inline-block"></span>
            Buffer Margin
          </span>
          <span className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="w-3.5 h-3.5 rounded bg-rose-600 inline-block shadow-sm"></span>
            Conflict / Disrupted
          </span>
          <span className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="w-3.5 h-3.5 rounded bg-slate-400 inline-block shadow-sm"></span>
            Maintenance
          </span>
        </div>
      </div>

      {/* Timeline Gantt Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Time axis header */}
          <div className="flex border-b border-slate-200 bg-slate-100/60 text-xs font-semibold text-slate-500 py-2">
            <div className="w-56 shrink-0 px-4">Resource Asset</div>
            <div className="flex-1 relative flex justify-between px-2">
              {hours.map((hr, idx) => (
                <span key={idx} className="text-[11px] font-mono text-slate-400">
                  {hr}
                </span>
              ))}
            </div>
          </div>

          {/* Resource rows */}
          <div className="divide-y divide-slate-100">
            {timelineData.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No active resources configured for scheduling timeline.
              </div>
            ) : (
              timelineData.map((resItem) => (
                <div key={resItem.resourceId} className="flex items-center hover:bg-slate-50/50 transition py-2.5">
                  {/* Resource Column */}
                  <div className="w-56 shrink-0 px-4">
                    <div className="font-semibold text-sm text-slate-800 truncate" title={resItem.resourceName}>
                      {resItem.resourceName}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                        {resItem.resourceType}
                      </span>
                      <span className={`text-[10px] font-bold ${resItem.status === 'AVAILABLE' ? 'text-emerald-600' : resItem.status === 'MAINTENANCE' ? 'text-rose-600' : 'text-slate-500'}`}>
                        {resItem.status}
                      </span>
                    </div>
                  </div>

                  {/* Visual Bar Track */}
                  <div className="flex-1 relative h-9 bg-slate-100/50 rounded-lg mx-3 border border-slate-200/60 overflow-hidden">
                    {/* Hour grid lines */}
                    <div className="absolute inset-0 flex justify-between pointer-events-none opacity-20">
                      {hours.map((_, idx) => (
                        <div key={idx} className="h-full border-r border-slate-400" />
                      ))}
                    </div>

                    {/* Operational blocks */}
                    {resItem.blocks && resItem.blocks.map((block) => {
                      const left = getPositionPercent(block.startTime);
                      const width = getWidthPercent(block.startTime, block.endTime);

                      let bgClasses = 'bg-emerald-600 text-white hover:bg-emerald-700';
                      let icon = <CheckCircle2 className="w-3 h-3 shrink-0" />;

                      if (block.type === 'TRAVEL') {
                        bgClasses = 'bg-sky-500 text-white hover:bg-sky-600';
                        icon = <Truck className="w-3 h-3 shrink-0" />;
                      } else if (block.type === 'BUFFER') {
                        bgClasses = 'bg-amber-100/90 text-amber-800 border border-amber-300 border-dashed hover:bg-amber-200';
                        icon = <Clock className="w-3 h-3 shrink-0 text-amber-700" />;
                      } else if (block.type === 'CONFLICT') {
                        bgClasses = 'bg-rose-600 text-white animate-pulse-subtle hover:bg-rose-700';
                        icon = <AlertTriangle className="w-3 h-3 shrink-0" />;
                      } else if (block.type === 'MAINTENANCE') {
                        bgClasses = 'bg-slate-400 text-white hover:bg-slate-500';
                        icon = <Wrench className="w-3 h-3 shrink-0" />;
                      }

                      return (
                        <button
                          key={block.id}
                          type="button"
                          onClick={() => setSelectedBlock(block)}
                          style={{ left: `${left}%`, width: `${width}%` }}
                          className={`absolute top-1 bottom-1 rounded-md px-1.5 text-[11px] font-medium flex items-center gap-1 truncate shadow-xs transition z-10 cursor-pointer ${bgClasses}`}
                          title={`${block.title} (${new Date(block.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(block.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`}
                        >
                          {icon}
                          <span className="truncate">{block.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Selected Block Info Modal */}
      {selectedBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 relative">
            <button
              onClick={() => setSelectedBlock(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-agri-100 text-agri-800 flex items-center justify-center">
                <Info className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">{selectedBlock.title}</h4>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 mb-5 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-700">Block Type:</span>
                <span className="font-mono uppercase font-bold text-slate-900">{selectedBlock.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-700">Time Window:</span>
                <span className="font-mono text-slate-900">
                  {new Date(selectedBlock.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(selectedBlock.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {selectedBlock.farmerName && (
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-700">Farmer:</span>
                  <span className="text-slate-900 font-medium">{selectedBlock.farmerName}</span>
                </div>
              )}
              {selectedBlock.farmName && (
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-700">Farm:</span>
                  <span className="text-slate-900">{selectedBlock.farmName}</span>
                </div>
              )}
            </div>

            {selectedBlock.explanation && (
              <div className="mb-5">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Allocation Rationale</h5>
                <p className="text-xs text-slate-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3 leading-relaxed whitespace-pre-line">
                  {selectedBlock.explanation}
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedBlock(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
