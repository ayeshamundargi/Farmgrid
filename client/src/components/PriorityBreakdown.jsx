import React from 'react';
import { Award, CloudRain, Clock, MapPin, Wrench, Sprout, AlertCircle } from 'lucide-react';

export default function PriorityBreakdown({ priority }) {
  if (!priority) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400 text-sm">
        No priority evaluation data available.
      </div>
    );
  }

  const {
    totalScore = 0,
    urgencyScore = 0,
    weatherScore = 0,
    cropReadinessScore = 0,
    waitingScore = 0,
    distanceScore = 0,
    resourceConstraintScore = 0,
    explanation = ''
  } = priority;

  // Determine badge color
  let scoreColor = 'text-emerald-600 bg-emerald-50 border-emerald-200';
  let scoreTier = 'STANDARD PRIORITY';
  if (totalScore >= 80) {
    scoreColor = 'text-rose-600 bg-rose-50 border-rose-200';
    scoreTier = 'CRITICAL / HIGH PRIORITY';
  } else if (totalScore >= 60) {
    scoreColor = 'text-amber-600 bg-amber-50 border-amber-200';
    scoreTier = 'ELEVATED PRIORITY';
  }

  const factors = [
    {
      label: 'Urgency & Deadline Proximity',
      score: urgencyScore,
      max: 25,
      icon: <AlertCircle className="w-4 h-4 text-rose-500" />,
      barColor: 'bg-rose-500'
    },
    {
      label: 'Weather Risk Exposure',
      score: weatherScore,
      max: 25,
      icon: <CloudRain className="w-4 h-4 text-sky-500" />,
      barColor: 'bg-sky-500'
    },
    {
      label: 'Crop Biological Readiness',
      score: cropReadinessScore,
      max: 20,
      icon: <Sprout className="w-4 h-4 text-emerald-500" />,
      barColor: 'bg-emerald-500'
    },
    {
      label: 'Queue Waiting Time',
      score: waitingScore,
      max: 15,
      icon: <Clock className="w-4 h-4 text-amber-500" />,
      barColor: 'bg-amber-500'
    },
    {
      label: 'Distance & Logistics Overhead',
      score: distanceScore,
      max: 10,
      icon: <MapPin className="w-4 h-4 text-indigo-500" />,
      barColor: 'bg-indigo-500'
    },
    {
      label: 'Resource Constraints & Matching',
      score: resourceConstraintScore,
      max: 5,
      icon: <Wrench className="w-4 h-4 text-purple-500" />,
      barColor: 'bg-purple-500'
    }
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      {/* Top Header with Total Score */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-200 gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-agri-600" />
            Deterministic Priority Calculation
          </span>
          <h3 className="text-lg font-bold text-slate-900 mt-0.5">Scarcity Priority Score</h3>
        </div>

        <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-xl border font-mono text-center ${scoreColor}`}>
            <span className="text-2xl font-black">{Math.round(totalScore)}</span>
            <span className="text-xs font-semibold text-slate-400"> / 100</span>
          </div>
          <div className="text-right">
            <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold border ${scoreColor}`}>
              {scoreTier}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Left Progress Bars, Right Bullet Explanation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Progress Bars (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Weighted Score Breakdown (Total: 100 pts)
          </h4>

          <div className="space-y-3.5">
            {factors.map((f, i) => {
              const pct = Math.min(100, (f.score / f.max) * 100);
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-slate-700">
                      {f.icon}
                      {f.label}
                    </span>
                    <span className="font-mono font-semibold text-slate-900">
                      {f.score} <span className="text-slate-400 font-normal">/ {f.max}</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${f.barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Human Readable Explanation (5 cols) */}
        <div className="lg:col-span-5 bg-slate-50 rounded-xl p-4 border border-slate-200/80 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Decision Explanation
            </h4>
            <div className="text-xs text-slate-600 space-y-2 leading-relaxed whitespace-pre-line font-normal">
              {explanation || 'No evaluation explanation generated.'}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Rule-Based Algorithm</span>
            <span className="font-medium text-slate-500">100% Explainable</span>
          </div>
        </div>
      </div>
    </div>
  );
}
