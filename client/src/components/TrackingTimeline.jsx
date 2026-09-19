import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  CheckCircle2,
  Clock,
  Circle,
  Tractor,
  MapPin,
  KeyRound,
  Play,
  RotateCw,
  Flag,
  ArrowLeftCircle,
  Award
} from 'lucide-react';

const STAGES = [
  { id: 'BOOKING_CONFIRMED', key: 'stepBookingConfirmed', icon: CheckCircle2 },
  { id: 'ASSIGNED', key: 'stepTractorAssigned', icon: Tractor },
  { id: 'LOCATION_AVAILABLE', key: 'stepLocationAvailable', icon: MapPin },
  { id: 'ON_THE_WAY', key: 'stepOnTheWay', icon: RotateCw },
  { id: 'REACHED_LAND', key: 'stepReachedLand', icon: Flag },
  { id: 'OTP_VERIFIED', key: 'stepOtpVerified', icon: KeyRound },
  { id: 'WORK_STARTED', key: 'stepWorkStarted', icon: Play },
  { id: 'WORK_IN_PROGRESS', key: 'stepWorkInProgress', icon: RotateCw },
  { id: 'WORK_COMPLETED', key: 'stepWorkCompleted', icon: CheckCircle2 },
  { id: 'RETURNING', key: 'stepTractorReturning', icon: ArrowLeftCircle },
  { id: 'COMPLETED', key: 'stepBookingCompleted', icon: Award }
];

// Map backend statuses to timeline index
const STATUS_INDEX_MAP = {
  PENDING: 0,
  BOOKING_CONFIRMED: 0,
  ASSIGNED: 1,
  LOCATION_AVAILABLE: 2,
  ON_THE_WAY: 3,
  REACHED_LAND: 4,
  OTP_VERIFIED: 5,
  WORK_STARTED: 6,
  WORK_IN_PROGRESS: 7,
  WORK_COMPLETED: 8,
  RETURNING: 9,
  COMPLETED: 10
};

export default function TrackingTimeline({ currentStatus = 'ASSIGNED', timestamps = {} }) {
  const { t } = useLanguage();
  const activeIndex = STATUS_INDEX_MAP[currentStatus.toUpperCase()] ?? 1;

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Clock className="w-4 h-4 text-agri-600" />
          <span>{t('tracking.timelineTitle')}</span>
        </h4>
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Stage {Math.min(activeIndex + 1, STAGES.length)} of {STAGES.length}
        </span>
      </div>

      {/* Horizontal Scrollable Timeline for Responsive Screens */}
      <div className="overflow-x-auto pb-2 scrollbar-thin">
        <div className="flex items-start min-w-[760px] relative px-2">
          {/* Background progress bar line */}
          <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 -z-0">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${(activeIndex / (STAGES.length - 1)) * 100}%` }}
            />
          </div>

          {STAGES.map((stage, idx) => {
            const isCompleted = idx < activeIndex;
            const isCurrent = idx === activeIndex;
            const isPending = idx > activeIndex;
            const Icon = stage.icon;

            let circleStyle = 'bg-slate-100 text-slate-400 border-2 border-slate-300';
            if (isCompleted) {
              circleStyle = 'bg-emerald-600 text-white border-2 border-emerald-600 shadow-sm shadow-emerald-500/30';
            } else if (isCurrent) {
              circleStyle = 'bg-blue-600 text-white border-2 border-white ring-4 ring-blue-100 shadow-md animate-pulse';
            }

            return (
              <div
                key={stage.id}
                className="flex-1 flex flex-col items-center text-center relative z-10 group"
              >
                {/* Node Icon Circle */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${circleStyle}`}
                  title={t(`tracking.${stage.key}`)}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  ) : (
                    <Icon className={`w-3.5 h-3.5 ${isCurrent ? 'animate-spin' : ''}`} />
                  )}
                </div>

                {/* Label & Status */}
                <div className="mt-2.5 px-1 max-w-[85px]">
                  <span
                    className={`text-[11px] font-bold block leading-tight ${
                      isCurrent
                        ? 'text-blue-700 font-black'
                        : isCompleted
                        ? 'text-slate-800'
                        : 'text-slate-400'
                    }`}
                  >
                    {t(`tracking.${stage.key}`)}
                  </span>

                  {isCurrent && (
                    <span className="inline-block px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase bg-blue-100 text-blue-700 mt-1">
                      Active
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
