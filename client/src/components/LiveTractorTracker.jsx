import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import LiveTractorMap from './LiveTractorMap';
import TrackingTimeline from './TrackingTimeline';
import {
  Tractor,
  MapPin,
  Clock,
  KeyRound,
  ShieldCheck,
  RefreshCw,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Gauge,
  Calendar,
  Sparkles
} from 'lucide-react';

export default function LiveTractorTracker({
  bookingId,
  initialData = null,
  showFullDetails = true,
  onStatusChange = null
}) {
  const { t, isKannada } = useLanguage();
  const { socket } = useSocket();

  const [tracking, setTracking] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(null);
  const [lastUpdatedText, setLastUpdatedText] = useState('Just now');
  const [arrivalAlert, setArrivalAlert] = useState(false);

  // Fetch full tracking payload
  const fetchTracking = useCallback(async () => {
    if (!bookingId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/tracking/${bookingId}`);
      if (res.data.success) {
        setTracking(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch tracking data:', err);
      setError('Could not load tractor telemetry. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (bookingId) {
      fetchTracking();
    }
  }, [bookingId, fetchTracking]);

  // Socket.IO Room Joining & Real-Time Event Listeners
  useEffect(() => {
    if (!socket || !bookingId) return;

    // Join tracking room
    socket.emit('joinTrackingRoom', bookingId);

    // Listen for live location coordinates
    const handleLocationUpdate = (payload) => {
      if (parseInt(payload.bookingId) === parseInt(bookingId)) {
        setTracking((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: payload.status || prev.status,
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
        setLastUpdatedText('Just now');

        if (payload.geofenceArrived) {
          setArrivalAlert(true);
        }
      }
    };

    // Listen for status changes (Start Trip, Reached Land, OTP Verified, Work Started, etc.)
    const handleStatusChange = (payload) => {
      if (parseInt(payload.bookingId) === parseInt(bookingId)) {
        setTracking((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: payload.status,
            timestamps: {
              ...prev.timestamps,
              arrivedAt: payload.arrivedAt || prev.timestamps?.arrivedAt
            }
          };
        });

        if (payload.status === 'REACHED_LAND') {
          setArrivalAlert(true);
        }

        if (onStatusChange) {
          onStatusChange(payload.status);
        }
      }
    };

    // Listen for OTP verification
    const handleOtpVerified = (payload) => {
      if (parseInt(payload.bookingId) === parseInt(bookingId)) {
        setTracking((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: 'OTP_VERIFIED',
            isOtpVerified: true
          };
        });
      }
    };

    socket.on('tractorLocationUpdated', handleLocationUpdate);
    socket.on('trackingStatusChanged', handleStatusChange);
    socket.on('trackingOtpVerified', handleOtpVerified);

    // Also listen on window DOM events dispatched by SocketContext
    const handleDomLocation = (e) => handleLocationUpdate(e.detail);
    const handleDomStatus = (e) => handleStatusChange(e.detail);
    const handleDomOtp = (e) => handleOtpVerified(e.detail);

    window.addEventListener('farmgrid_tractor_location_updated', handleDomLocation);
    window.addEventListener('farmgrid_tracking_status_changed', handleDomStatus);
    window.addEventListener('farmgrid_tracking_otp_verified', handleDomOtp);

    return () => {
      socket.emit('leaveTrackingRoom', bookingId);
      socket.off('tractorLocationUpdated', handleLocationUpdate);
      socket.off('trackingStatusChanged', handleStatusChange);
      socket.off('trackingOtpVerified', handleOtpVerified);
      window.removeEventListener('farmgrid_tractor_location_updated', handleDomLocation);
      window.removeEventListener('farmgrid_tracking_status_changed', handleDomStatus);
      window.removeEventListener('farmgrid_tracking_otp_verified', handleDomOtp);
    };
  }, [socket, bookingId, onStatusChange]);

  // Periodic timer to update "Last updated X seconds ago"
  useEffect(() => {
    const timer = setInterval(() => {
      if (tracking?.currentLocation?.lastUpdated) {
        const diffSec = Math.floor((new Date() - new Date(tracking.currentLocation.lastUpdated)) / 1000);
        if (diffSec < 5) setLastUpdatedText('Just now');
        else if (diffSec < 60) setLastUpdatedText(`${diffSec}s ago`);
        else setLastUpdatedText(`${Math.floor(diffSec / 60)}m ago`);
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [tracking]);

  if (loading && !tracking) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-sm">
        <RefreshCw className="w-8 h-8 text-agri-600 animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Connecting to tractor GPS telemetry...</p>
      </div>
    );
  }

  if (error || !tracking) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-6 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
        <h4 className="text-sm font-bold text-rose-900">{error || 'No active tracking available.'}</h4>
        <button
          type="button"
          onClick={fetchTracking}
          className="px-4 py-2 bg-agri-600 text-white text-xs font-bold rounded-xl shadow hover:bg-agri-700 transition"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  const { resource, farm, currentLocation, otp, isOtpVerified, status } = tracking;
  const tractorCoords = [currentLocation.latitude, currentLocation.longitude];
  const farmCoords = [farm.latitude, farm.longitude];
  const depotCoords = resource.depotLatitude && resource.depotLongitude ? [resource.depotLatitude, resource.depotLongitude] : null;

  // Status Badge Colors & Label
  let statusBadgeColor = 'bg-blue-100 text-blue-800 border-blue-300';
  let statusText = status.replace(/_/g, ' ');

  if (status === 'ON_THE_WAY') {
    statusBadgeColor = 'bg-sky-100 text-sky-800 border-sky-300 animate-pulse';
    statusText = isKannada ? 'ಟ್ರ್ಯಾಕ್ಟರ್ ದಾರಿಯಲ್ಲಿದೆ' : 'TRACTOR ON THE WAY';
  } else if (status === 'REACHED_LAND') {
    statusBadgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
    statusText = isKannada ? 'ಟ್ರ್ಯಾಕ್ಟರ್ ಜಮೀನು ತಲುಪಿದೆ' : 'TRACTOR REACHED LAND';
  } else if (status === 'OTP_VERIFIED' || status === 'WORK_STARTED' || status === 'WORK_IN_PROGRESS') {
    statusBadgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    statusText = status === 'OTP_VERIFIED'
      ? (isKannada ? 'OTP ಪರಿಶೀಲಿಸಲಾಗಿದೆ' : 'OTP VERIFIED')
      : (isKannada ? 'ಕೆಲಸ ಪ್ರಗತಿಯಲ್ಲಿದೆ' : 'WORK IN PROGRESS');
  } else if (status === 'WORK_COMPLETED') {
    statusBadgeColor = 'bg-purple-100 text-purple-800 border-purple-300';
    statusText = isKannada ? 'ಕೆಲಸ ಪೂರ್ಣಗೊಂಡಿದೆ' : 'WORK COMPLETED';
  } else if (status === 'RETURNING') {
    statusBadgeColor = 'bg-indigo-100 text-indigo-800 border-indigo-300';
    statusText = isKannada ? 'ಟ್ರ್ಯಾಕ್ಟರ್ ಹಿಂತಿರುಗುತ್ತಿದೆ' : 'TRACTOR RETURNING';
  } else if (status === 'COMPLETED') {
    statusBadgeColor = 'bg-slate-100 text-slate-800 border-slate-300';
    statusText = isKannada ? 'ಬುಕಿಂಗ್ ಪೂರ್ಣಗೊಂಡಿದೆ' : 'BOOKING COMPLETED';
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden space-y-6 p-5 sm:p-7">
      {/* Geofence Arrival Alert Notice */}
      {arrivalAlert && status === 'REACHED_LAND' && (
        <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-4 sm:p-5 flex items-start justify-between gap-4 animate-bounce">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-emerald-950 text-base">
                {isKannada ? '🚜 ಟ್ರ್ಯಾಕ್ಟರ್ ನಿಮ್ಮ ಜಮೀನಿಗೆ ತಲುಪಿದೆ!' : '🚜 Tractor Has Reached Your Land!'}
              </h3>
              <p className="text-xs text-emerald-800 mt-1">
                {isKannada
                  ? `ಚಾಲಕರು ನಿಮ್ಮ ಜಮೀನಿಗೆ ತಲುಪಿದ್ದಾರೆ. ಕೆಲಸ ಆರಂಭಿಸಲು ಕೆಳಗಿನ 4-ಅಂಕಿಯ OTP ಕೋಡ್ (${otp}) ಅನ್ನು ಚಾಲಕರಿಗೆ ತಿಳಿಸಿ.`
                  : `The tractor operator has arrived at ${farm.name}. Please share your 4-digit verification code below with the operator to commence field work.`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setArrivalAlert(false)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 px-2 py-1 bg-white rounded-lg border border-emerald-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header HUD Card */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-agri-600 text-white shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
              {t('tracking.title')}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${statusBadgeColor}`}>
              {statusText}
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Tractor className="w-7 h-7 text-agri-600 shrink-0" />
              <span>{resource.name}</span>
            </h2>
            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              #{bookingId}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>{t('tracking.destination')}: <strong className="text-slate-800">{farm.name}</strong> ({farm.crop})</span>
            </div>
            {resource.owner?.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Operator: <strong className="text-slate-800">{resource.owner.phone}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Distance Tile */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-0.5">
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
              {t('tracking.distance')}
            </span>
            <div className="text-xl font-black text-slate-900">
              {currentLocation.distanceRemaining > 0 ? (
                <span>{currentLocation.distanceRemaining.toFixed(1)} <span className="text-xs font-semibold text-slate-500">km</span></span>
              ) : (
                <span className="text-emerald-600 text-base font-black">0.0 km</span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 block">
              {currentLocation.estimatedMinutes > 0 ? `~${currentLocation.estimatedMinutes} ${t('tracking.minsAway')}` : 'Destination Geofence'}
            </span>
          </div>

          {/* Speed Tile */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-0.5">
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
              {t('tracking.speed')}
            </span>
            <div className="text-xl font-black text-slate-900">
              {currentLocation.speed > 0 ? (
                <span>{currentLocation.speed.toFixed(1)} <span className="text-xs font-semibold text-slate-500">km/h</span></span>
              ) : (
                <span className="text-slate-500 text-sm font-bold">Stationary</span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 block">Telemetry Heading: {Math.round(currentLocation.heading || 0)}°</span>
          </div>

          {/* Last Update Tile */}
          <div className="col-span-2 sm:col-span-1 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-0.5">
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
              {t('tracking.lastUpdated')}
            </span>
            <div className="text-xl font-black text-emerald-700">
              {lastUpdatedText}
            </div>
            <span className="text-[10px] text-slate-400 block">
              Live Socket Sync
            </span>
          </div>
        </div>
      </div>

      {/* Driver Verification OTP Card (Crucial for Arrival -> Work Transition) */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-xl shrink-0 shadow-md">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-amber-950">{t('tracking.otpTitle')}</h4>
              {isOtpVerified ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Verified ✓
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300">
                  Pending Driver Arrival
                </span>
              )}
            </div>
            <p className="text-xs text-amber-900/80 mt-1 max-w-xl">
              {isOtpVerified ? t('tracking.otpVerifiedMsg') : t('tracking.otpDesc')}
            </p>
          </div>
        </div>

        {/* 4-Digit OTP Display */}
        <div className="flex items-center gap-2 self-start sm:self-center bg-white px-5 py-3 rounded-2xl border-2 border-amber-400 shadow-md">
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider mr-1">OTP:</span>
          <span className="font-mono text-2xl font-black tracking-widest text-slate-950">
            {otp || '----'}
          </span>
        </div>
      </div>

      {/* Interactive Live Map */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Navigation className="w-4 h-4 text-agri-600" />
            Live Geospatial Tractor Telemetry & Route
          </span>
          <button
            type="button"
            onClick={fetchTracking}
            title="Refresh GPS telemetry"
            className="text-xs font-semibold text-agri-600 hover:text-agri-800 flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

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
          height="420px"
        />
      </div>

      {/* 10-Stage Booking Timeline */}
      {showFullDetails && (
        <TrackingTimeline
          currentStatus={status}
          timestamps={tracking.timestamps}
        />
      )}
    </div>
  );
}
