import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import api from '../../services/api';
import FarmMap from '../../components/FarmMap';
import AgriWeatherWidget from '../../components/AgriWeatherWidget';
import LiveTractorTracker from '../../components/LiveTractorTracker';
import {
  Tractor,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  FileText,
  CloudSun,
  Navigation,
  Radio,
  ExternalLink
} from 'lucide-react';

export default function FarmerDashboard() {
  const { user, isOnline, pendingSyncCount } = useAuth();
  const { t, translateStatus, translateEquipment } = useLanguage();
  const [farms, setFarms] = useState([]);
  const [requests, setRequests] = useState([]);
  const [availableResources, setAvailableResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFarmIdx, setSelectedFarmIdx] = useState(0);
  const [selectedTrackingBookingId, setSelectedTrackingBookingId] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [farmsRes, requestsRes, resourcesRes] = await Promise.allSettled([
        api.get('/farms'),
        api.get('/requests/my'),
        api.get('/resources/available')
      ]);

      if (farmsRes.status === 'fulfilled') setFarms(farmsRes.value.data.data || []);
      if (requestsRes.status === 'fulfilled') {
        const reqs = requestsRes.value.data.data || [];
        setRequests(reqs);
        const firstWithBooking = reqs.find((r) => r.booking);
        if (firstWithBooking && !selectedTrackingBookingId) {
          setSelectedTrackingBookingId(firstWithBooking.booking.id);
        }
      }
      if (resourcesRes.status === 'fulfilled') {
        const resData = resourcesRes.value.data?.data;
        const list = Array.isArray(resData) ? resData : (resData?.resources || []);
        setAvailableResources(list);
      }

    } catch (err) {
      console.error('Failed to load farmer dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('farmgrid_schedule_updated', handleUpdate);
    window.addEventListener('schedule_updated', handleUpdate);
    return () => {
      window.removeEventListener('farmgrid_schedule_updated', handleUpdate);
      window.removeEventListener('schedule_updated', handleUpdate);
    };
  }, []);

  const scheduledBookings = requests.filter((r) => r.status === 'SCHEDULED');
  const pendingRequests = requests.filter((r) => r.status === 'PENDING' || r.status === 'WAITLIST');
  const conflictRequests = requests.filter((r) => r.status === 'CONFLICT');

  const trackableBookings = requests
    .filter((r) => r.booking)
    .map((r) => ({
      ...r.booking,
      request: r,
      farm: r.farm,
      resource: r.booking.resource
    }));

  const activeTrackingBooking = trackableBookings.find((b) => b.id === selectedTrackingBookingId) || trackableBookings[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-agri-900 to-agri-800 rounded-2xl p-6 sm:p-8 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-agri-700/60 text-agri-200">
              {t('farmer.badge')}
            </span>
            <LanguageSwitcher variant="pills" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {t('farmer.welcomeBack', { name: user?.name || t('farmer.defaultName') })}
          </h1>
          <p className="text-sm text-agri-100/90 mt-1 max-w-2xl">
            {t('farmer.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/farmer/request"
            className="flex items-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl shadow-md transition transform active:scale-95"
          >
            <PlusCircle className="w-5 h-5" />
            {t('farmer.requestEquipment')}
          </Link>
          <Link
            to="/farmer/schedule"
            className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm rounded-xl border border-white/20 transition"
          >
            <Calendar className="w-4 h-4 text-agri-300" />
            {t('farmer.mySchedule')}
          </Link>
        </div>
      </div>

      {/* Offline Sync Notice */}
      {!isOnline && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <h4 className="text-sm font-bold text-amber-900">{t('farmer.offlineTitle')}</h4>
              <p className="text-xs text-amber-700">
                {t('farmer.offlineDesc')}
              </p>
            </div>
          </div>
          {pendingSyncCount > 0 && (
            <span className="px-3 py-1 rounded-full bg-amber-200 text-amber-900 text-xs font-bold">
              {t('farmer.queuedCount', { count: pendingSyncCount })}
            </span>
          )}
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('farmer.kpiRegisteredFarms')}</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{farms.length}</div>
            <span className="text-xs text-slate-400 mt-0.5 block">{t('farmer.kpiManagedParcels')}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-agri-50 text-agri-600 flex items-center justify-center font-bold text-xl">
            🌱
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">{t('farmer.kpiActiveBookings')}</span>
            <div className="text-2xl font-black text-emerald-700 mt-1">{scheduledBookings.length}</div>
            <span className="text-xs text-emerald-600/80 mt-0.5 block">{t('farmer.kpiGuaranteedSlots')}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">{t('farmer.kpiInQueue')}</span>
            <div className="text-2xl font-black text-amber-600 mt-1">{pendingRequests.length}</div>
            <span className="text-xs text-amber-600/80 mt-0.5 block">{t('farmer.kpiAwaitingAllocation')}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-sky-600 uppercase tracking-wider">{t('farmer.kpiAvailableFleet')}</span>
            <div className="text-2xl font-black text-sky-700 mt-1">{availableResources.length}</div>
            <span className="text-xs text-sky-600/80 mt-0.5 block">{t('farmer.kpiNearbyInRegion')}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Tractor className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Live Tractor Location Tracking Section */}
      {activeTrackingBooking && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-emerald-600 animate-pulse" />
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {t('tracking.title')}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {trackableBookings.length > 1 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-bold">Track Unit:</span>
                  <select
                    value={activeTrackingBooking.id}
                    onChange={(e) => setSelectedTrackingBookingId(parseInt(e.target.value))}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-agri-500 focus:outline-none"
                  >
                    {trackableBookings.map((b) => (
                      <option key={b.id} value={b.id}>
                        🚜 {b.resource?.name || 'Tractor'} (#{b.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Link
                to={`/farmer/tracking/${activeTrackingBooking.id}`}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                <span>Fullscreen Tracker</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <LiveTractorTracker
            bookingId={activeTrackingBooking.id}
            showFullDetails={true}
          />
        </div>
      )}

      {/* Agricultural Weather & Micro-Climate Advisory Section */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CloudSun className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-900">
              {t('farmer.advisoryTitle')}
            </h2>
          </div>

          {farms.length > 1 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">{t('farmer.selectedFarm')}</span>
              <select
                value={selectedFarmIdx}
                onChange={(e) => setSelectedFarmIdx(Number(e.target.value))}
                className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 text-xs focus:ring-2 focus:ring-agri-500 focus:outline-none"
              >
                {farms.map((f, idx) => (
                  <option key={f.id || idx} value={idx}>
                    🌱 {f.name} ({f.crop || 'Field'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {(() => {
          const targetFarm = farms[selectedFarmIdx] || farms[0];
          const lat = targetFarm?.latitude ? parseFloat(targetFarm.latitude) : 12.525;
          const lng = targetFarm?.longitude ? parseFloat(targetFarm.longitude) : 76.900;
          const name = targetFarm?.name || 'Mandya Regional Agro-Hub';

          return (
            <AgriWeatherWidget
              latitude={lat}
              longitude={lng}
              locationName={name}
              compact={false}
            />
          );
        })()}
      </div>

      {/* Main Grid: Geospatial Map + Recent Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Map of Farms & Nearby Hubs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-agri-600" />
              <h2 className="text-lg font-bold text-slate-900">{t('farmer.mapTitle')}</h2>
            </div>
            <span className="text-xs text-slate-500">{t('farmer.mapLegend')}</span>
          </div>

          <FarmMap
            farms={farms}
            resources={availableResources}
            height="440px"
          />
        </div>

        {/* Recent Requests Sidebar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-agri-600" />
              {t('farmer.recentRequestsTitle')}
            </h3>
            <Link to="/farmer/requests" className="text-xs text-agri-600 font-semibold hover:underline">
              {t('common.viewAll')}
            </Link>
          </div>

          {requests.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              {t('farmer.noRequestsYet')}
            </div>
          ) : (
            <div className="space-y-3">
              {requests.slice(0, 5).map((req) => {
                let badgeColor = 'bg-slate-100 text-slate-700';
                if (req.status === 'SCHEDULED') badgeColor = 'bg-emerald-100 text-emerald-800';
                else if (req.status === 'WAITLIST') badgeColor = 'bg-amber-100 text-amber-800';
                else if (req.status === 'CONFLICT') badgeColor = 'bg-rose-100 text-rose-800';

                return (
                  <div
                    key={req.id}
                    className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <Tractor className="w-3.5 h-3.5 text-slate-500" />
                        {translateEquipment(req.resourceType)}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {req.farm?.name || t('farmer.farmParcel')} • {req.durationMinutes} {t('common.min')}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${badgeColor}`}>
                        {translateStatus(req.status)}
                      </span>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {t('common.score')}: {req.priorityScore?.toFixed(1) || '—'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-2">
            <Link
              to="/farmer/requests"
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              {t('farmer.seeAllRequests')}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
