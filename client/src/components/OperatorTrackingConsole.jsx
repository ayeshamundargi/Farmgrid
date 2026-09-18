import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import LiveTractorMap from './LiveTractorMap';
import TrackingTimeline from './TrackingTimeline';
import {
  Tractor,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  KeyRound,
  Flag,
  Navigation,
  Crosshair,
  FastForward,
  AlertCircle,
  Clock,
  MapPin,
  Sparkles,
  ArrowLeftCircle,
  Award,
  Radio
} from 'lucide-react';

/**
 * Computes bearing / heading angle in degrees between two GPS points
 */
function calculateBearing(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return (toDeg(θ) + 360) % 360;
}

export default function OperatorTrackingConsole({ bookingId, onClose = null }) {
  const { t, isKannada } = useLanguage();
  const { socket } = useSocket();

  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gpsMode, setGpsMode] = useState('SIMULATED'); // 'SIMULATED' or 'REAL_GPS'
  const [isDriving, setIsDriving] = useState(false);
  const [simSpeedMultiplier, setSimSpeedMultiplier] = useState(1); // 1x, 2x, 4x

  // OTP Verification Modal
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [inputOtp, setInputOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState(false);

  // Status transition state
  const [actionLoading, setActionLoading] = useState(false);

  // Real GPS Watcher ID
  const watchIdRef = useRef(null);
  const driveIntervalRef = useRef(null);
  const currentStepRef = useRef(0);

  // Fetch initial tracking data
  const loadTracking = useCallback(async () => {
    if (!bookingId) return;
    try {
      setLoading(true);
      const res = await api.get(`/tracking/${bookingId}`);
      if (res.data.success) {
        setTracking(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load tracking in operator console:', err);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadTracking();
  }, [loadTracking]);

  // Join tracking room
  useEffect(() => {
    if (!socket || !bookingId) return;
    socket.emit('joinTrackingRoom', bookingId);

    const handleStatusUpdate = (payload) => {
      if (parseInt(payload.bookingId) === parseInt(bookingId)) {
        setTracking((prev) => (prev ? { ...prev, status: payload.status } : prev));
      }
    };

    socket.on('trackingStatusChanged', handleStatusUpdate);
    return () => {
      socket.off('trackingStatusChanged', handleStatusUpdate);
    };
  }, [socket, bookingId]);

  // Update Status API
  const handleStatusChange = async (targetStatus) => {
    try {
      setActionLoading(true);
      const res = await api.post(`/tracking/${bookingId}/status`, { status: targetStatus });
      if (res.data.success) {
        setTracking((prev) => ({
          ...prev,
          status: targetStatus
        }));
        if (targetStatus === 'ON_THE_WAY' || targetStatus === 'RETURNING') {
          setIsDriving(true);
        } else if (targetStatus === 'REACHED_LAND' || targetStatus === 'COMPLETED') {
          setIsDriving(false);
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      alert(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Send Coordinates API
  const pushCoordinates = useCallback(async (lat, lng, heading = 0, speed = 25.0) => {
    try {
      const res = await api.post(`/tracking/${bookingId}/location`, {
        latitude: lat,
        longitude: lng,
        heading,
        speed
      });
      if (res.data.success) {
        const payload = res.data.data;
        setTracking((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: payload.status,
            currentLocation: {
              ...prev.currentLocation,
              latitude: payload.latitude,
              longitude: payload.longitude,
              heading: payload.heading,
              speed: payload.speed,
              distanceRemaining: payload.distanceRemaining,
              estimatedMinutes: payload.estimatedMinutes,
              lastUpdated: new Date()
            }
          };
        });

        // Geofence arrived automatically
        if (payload.geofenceArrived && isDriving) {
          setIsDriving(false);
        }
      }
    } catch (err) {
      console.warn('Failed to push coordinates:', err);
    }
  }, [bookingId, isDriving]);

  // Real Device GPS Tracking
  useEffect(() => {
    if (gpsMode === 'REAL_GPS' && isDriving) {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        setGpsMode('SIMULATED');
        return;
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const speedKmh = pos.coords.speed ? pos.coords.speed * 3.6 : 22.0;
          const heading = pos.coords.heading || 0;
          pushCoordinates(lat, lng, heading, speedKmh);
        },
        (err) => {
          console.warn('GPS watch error:', err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
      );

      return () => {
        if (watchIdRef.current) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      };
    } else {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }
  }, [gpsMode, isDriving, pushCoordinates]);

  // Simulated GPS Engine: Moves smoothly between Start and Destination
  useEffect(() => {
    if (gpsMode === 'SIMULATED' && isDriving && tracking) {
      const isReturning = tracking.status === 'RETURNING';

      // Start & End Points for current leg
      const startPt = isReturning
        ? [tracking.farm.latitude, tracking.farm.longitude]
        : [tracking.resource.depotLatitude || tracking.resource.latitude, tracking.resource.depotLongitude || tracking.resource.longitude];

      const endPt = isReturning
        ? [tracking.resource.depotLatitude || tracking.resource.latitude, tracking.resource.depotLongitude || tracking.resource.longitude]
        : [tracking.farm.latitude, tracking.farm.longitude];

      const totalSteps = 20; // 20 steps to complete route
      const heading = calculateBearing(startPt[0], startPt[1], endPt[0], endPt[1]);

      const intervalMs = Math.max(500, Math.floor(2000 / simSpeedMultiplier));

      driveIntervalRef.current = setInterval(() => {
        currentStepRef.current += 1;
        const progress = Math.min(1.0, currentStepRef.current / totalSteps);

        // Linear interpolation with slight natural road curvature
        const lat = startPt[0] + (endPt[0] - startPt[0]) * progress + Math.sin(progress * Math.PI) * 0.0003;
        const lng = startPt[1] + (endPt[1] - startPt[1]) * progress;
        const speedKmh = progress >= 1.0 ? 0 : 25.0 * simSpeedMultiplier;

        pushCoordinates(lat, lng, heading, speedKmh);

        if (progress >= 1.0) {
          clearInterval(driveIntervalRef.current);
          setIsDriving(false);
          currentStepRef.current = 0;

          if (isReturning) {
            handleStatusChange('COMPLETED');
          } else {
            handleStatusChange('REACHED_LAND');
          }
        }
      }, intervalMs);

      return () => {
        if (driveIntervalRef.current) {
          clearInterval(driveIntervalRef.current);
          driveIntervalRef.current = null;
        }
      };
    }
  }, [gpsMode, isDriving, tracking, simSpeedMultiplier, pushCoordinates]);

  // Handle OTP Submission
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setOtpError('');
    try {
      const res = await api.post(`/tracking/${bookingId}/verify-otp`, { otp: inputOtp });
      if (res.data.success) {
        setOtpSuccess(true);
        setTracking((prev) => ({
          ...prev,
          isOtpVerified: true,
          status: 'OTP_VERIFIED'
        }));
        setTimeout(() => {
          setShowOtpModal(false);
          setOtpSuccess(false);
          setInputOtp('');
        }, 1200);
      }
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Invalid verification code. Please check with farmer.');
    }
  };

  if (loading || !tracking) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow text-center space-y-3">
        <Tractor className="w-8 h-8 text-agri-600 animate-bounce mx-auto" />
        <p className="text-xs font-bold text-slate-500">Initializing Operator GPS Console...</p>
      </div>
    );
  }

  const { resource, farm, currentLocation, status, isOtpVerified } = tracking;
  const tractorCoords = [currentLocation.latitude, currentLocation.longitude];
  const farmCoords = [farm.latitude, farm.longitude];
  const depotCoords = resource.depotLatitude && resource.depotLongitude ? [resource.depotLatitude, resource.depotLongitude] : null;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden space-y-6 p-5 sm:p-7">
      {/* Console Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-2xl shadow-md">
            🚜
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                {t('tracking.operatorConsole')}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-agri-100 text-agri-800 border border-agri-300">
                DISPATCH #{bookingId}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Machinery: <strong className="text-slate-800">{resource.name}</strong> • Destination: <strong className="text-slate-800">{farm.name}</strong>
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition self-start sm:self-center"
          >
            Close Console
          </button>
        )}
      </div>

      {/* Mode Selector & Simulation Speed */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        {/* GPS Source Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">GPS Source:</span>
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setGpsMode('SIMULATED');
                setIsDriving(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                gpsMode === 'SIMULATED'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('tracking.simulationMode')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setGpsMode('REAL_GPS');
                setIsDriving(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                gpsMode === 'REAL_GPS'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>{t('tracking.realGpsMode')}</span>
            </button>
          </div>
        </div>

        {/* Simulator Speed / Live Indicator */}
        <div className="flex items-center gap-3">
          {gpsMode === 'SIMULATED' && (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500 font-bold">Sim Speed:</span>
              {[1, 2, 4].map((mult) => (
                <button
                  key={mult}
                  type="button"
                  onClick={() => setSimSpeedMultiplier(mult)}
                  className={`px-2 py-1 rounded-md text-xs font-bold border ${
                    simSpeedMultiplier === mult
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {mult}x
                </button>
              ))}
            </div>
          )}

          {isDriving ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              TRANSMITTING GPS
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
              PAUSED / IDLE
            </span>
          )}
        </div>
      </div>

      {/* Operator Workflow Action Buttons */}
      <div className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
          Trip & Operation Workflow Controls
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {/* Button 1: Start Trip */}
          <button
            type="button"
            disabled={actionLoading || status !== 'ASSIGNED' && status !== 'LOCATION_AVAILABLE'}
            onClick={() => handleStatusChange('ON_THE_WAY')}
            className={`p-3 rounded-2xl border text-xs font-black flex flex-col items-center justify-center gap-1.5 transition ${
              status === 'ON_THE_WAY'
                ? 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-300'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            <Play className="w-5 h-5 text-blue-500" />
            <span>{t('tracking.startTrip')}</span>
          </button>

          {/* Button 2: Reached Land */}
          <button
            type="button"
            disabled={actionLoading || status !== 'ON_THE_WAY'}
            onClick={() => handleStatusChange('REACHED_LAND')}
            className={`p-3 rounded-2xl border text-xs font-black flex flex-col items-center justify-center gap-1.5 transition ${
              status === 'REACHED_LAND'
                ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-300'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            <Flag className="w-5 h-5 text-amber-500" />
            <span>{t('tracking.reachedLand')}</span>
          </button>

          {/* Button 3: Verify OTP */}
          <button
            type="button"
            disabled={actionLoading || isOtpVerified || status === 'COMPLETED'}
            onClick={() => setShowOtpModal(true)}
            className={`p-3 rounded-2xl border text-xs font-black flex flex-col items-center justify-center gap-1.5 transition ${
              isOtpVerified
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : status === 'REACHED_LAND'
                ? 'bg-amber-100 text-amber-900 border-amber-400 animate-pulse shadow-md'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            <KeyRound className="w-5 h-5 text-amber-600" />
            <span>{isOtpVerified ? 'OTP Verified ✓' : t('tracking.verifyOtpBtn')}</span>
          </button>

          {/* Button 4: Start Work */}
          <button
            type="button"
            disabled={actionLoading || (!isOtpVerified && status !== 'REACHED_LAND') || status === 'WORK_STARTED' || status === 'WORK_IN_PROGRESS' || status === 'WORK_COMPLETED' || status === 'COMPLETED'}
            onClick={() => handleStatusChange('WORK_STARTED')}
            className={`p-3 rounded-2xl border text-xs font-black flex flex-col items-center justify-center gap-1.5 transition ${
              status === 'WORK_STARTED'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-300'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            <Play className="w-5 h-5 text-emerald-600" />
            <span>{t('tracking.startWork')}</span>
          </button>

          {/* Button 5: Work In Progress */}
          <button
            type="button"
            disabled={actionLoading || (status !== 'WORK_STARTED' && status !== 'OTP_VERIFIED')}
            onClick={() => handleStatusChange('WORK_IN_PROGRESS')}
            className={`p-3 rounded-2xl border text-xs font-black flex flex-col items-center justify-center gap-1.5 transition ${
              status === 'WORK_IN_PROGRESS'
                ? 'bg-emerald-700 text-white border-emerald-800 shadow-md ring-2 ring-emerald-300'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-5 h-5 text-emerald-500" />
            <span>{t('tracking.workInProgress')}</span>
          </button>

          {/* Button 6: Work Completed */}
          <button
            type="button"
            disabled={actionLoading || (status !== 'WORK_IN_PROGRESS' && status !== 'WORK_STARTED')}
            onClick={() => handleStatusChange('WORK_COMPLETED')}
            className={`p-3 rounded-2xl border text-xs font-black flex flex-col items-center justify-center gap-1.5 transition ${
              status === 'WORK_COMPLETED'
                ? 'bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-300'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-5 h-5 text-purple-600" />
            <span>{t('tracking.workCompleted')}</span>
          </button>

          {/* Button 7: Return & Complete */}
          <button
            type="button"
            disabled={actionLoading || (status !== 'WORK_COMPLETED' && status !== 'RETURNING')}
            onClick={() => handleStatusChange(status === 'RETURNING' ? 'COMPLETED' : 'RETURNING')}
            className={`p-3 rounded-2xl border text-xs font-black flex flex-col items-center justify-center gap-1.5 transition ${
              status === 'RETURNING'
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-300'
                : status === 'COMPLETED'
                ? 'bg-slate-800 text-white border-slate-900'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            <ArrowLeftCircle className="w-5 h-5 text-indigo-500" />
            <span>{status === 'RETURNING' ? t('tracking.completeBooking') : t('tracking.returnDepot')}</span>
          </button>
        </div>
      </div>

      {/* Simulator Play/Pause Toggle */}
      {gpsMode === 'SIMULATED' && (status === 'ON_THE_WAY' || status === 'RETURNING') && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-blue-600 animate-pulse" />
            <span className="text-xs font-bold text-blue-900">
              {isDriving ? 'GPS simulation actively driving vehicle' : 'Simulation paused'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsDriving(!isDriving)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow transition flex items-center gap-1.5 ${
              isDriving ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isDriving ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isDriving ? 'Pause Drive' : 'Resume Drive'}</span>
          </button>
        </div>
      )}

      {/* Live Map Preview */}
      <div className="space-y-2">
        <LiveTractorMap
          tractorCoords={tractorCoords}
          farmCoords={farmCoords}
          depotCoords={depotCoords}
          heading={currentLocation.heading}
          speed={currentLocation.speed}
          status={status}
          resourceName={resource.name}
          farmName={farm.name}
          crop={farm.crop}
          distanceRemaining={currentLocation.distanceRemaining}
          height="380px"
        />
      </div>

      {/* Timeline */}
      <TrackingTimeline currentStatus={status} />

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Driver OTP Verification</h3>
                  <p className="text-xs text-slate-500">Enter the 4-digit code provided by the farmer</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {otpSuccess ? (
              <div className="p-6 text-center space-y-2 bg-emerald-50 rounded-2xl border border-emerald-300">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h4 className="font-black text-emerald-900 text-base">OTP Verified Successfully!</h4>
                <p className="text-xs text-emerald-700">Tractor is cleared to commence field operations.</p>
              </div>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-1 text-center">
                  <label htmlFor="otp-input" className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    4-Digit Farmer Verification Code
                  </label>
                  <input
                    id="otp-input"
                    type="text"
                    maxLength={4}
                    value={inputOtp}
                    onChange={(e) => setInputOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • •"
                    className="w-48 mx-auto text-center font-mono text-3xl font-black tracking-widest py-3 px-4 rounded-2xl border-2 border-slate-300 focus:border-amber-500 focus:outline-hidden"
                    autoFocus
                  />
                  {otpError && <p className="text-xs font-bold text-rose-600 mt-2">{otpError}</p>}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowOtpModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inputOtp.length !== 4}
                    className="px-5 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow disabled:opacity-40"
                  >
                    Verify & Authorize
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
