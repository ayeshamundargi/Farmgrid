import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { saveOfflineRequest } from '../../offline/requestQueue';
import PriorityBreakdown from '../../components/PriorityBreakdown';
import {
  Tractor,
  Calendar,
  Clock,
  AlertTriangle,
  CloudRain,
  Sprout,
  ShieldCheck,
  CheckCircle2,
  WifiOff,
  ArrowRight,
  Sparkles,
  Plus
} from 'lucide-react';

const RESOURCE_TYPES = [
  { value: 'TRACTOR', label: 'Tractor (Heavy Duty / Multi-Crop)', icon: '🚜' },
  { value: 'HARVESTER', label: 'Combine Harvester', icon: '🌾' },
  { value: 'TILLER', label: 'Power Tiller', icon: '⚙️' },
  { value: 'SEEDER', label: 'Precision Seed Drill', icon: '🌱' },
  { value: 'PUMP', label: 'High-Volume Water Pump', icon: '💧' },
  { value: 'DRIP_LINE', label: 'Drip Irrigation Setup', icon: '🚰' },
  { value: 'DRONE_SPRAYER', label: 'Agri Drone Sprayer', icon: '🚁' },
  { value: 'MINI_TRUCK', label: 'Transport Mini Truck', icon: '🚚' },
  { value: 'SOIL_TESTING', label: 'Mobile Soil Testing Lab', icon: '🧪' }
];

const CROP_STAGES = [
  { value: 'SEEDLING', label: 'Seedling / Early Sowing', weight: 'Low/Med priority' },
  { value: 'VEGETATIVE', label: 'Vegetative Growth', weight: 'Standard priority' },
  { value: 'FLOWERING', label: 'Flowering & Pollination', weight: 'Elevated priority' },
  { value: 'PEAK_RIPENING', label: 'Peak Ripening (Critical Window)', weight: 'High priority' },
  { value: 'HARVEST', label: 'Harvest Ready (Risk of Spoilage)', weight: 'Maximum urgency' }
];

const URGENCY_LEVELS = [
  { value: 'LOW', label: 'Low — Flexible within 3-4 days' },
  { value: 'MEDIUM', label: 'Medium — Required within 24-48 hours' },
  { value: 'HIGH', label: 'High — Immediate attention needed (24 hours)' },
  { value: 'CRITICAL', label: 'Critical — Emergency (Threat to yield/crop loss)' }
];

const WEATHER_RISKS = [
  { value: 'LOW', label: 'Low / Clear Skies', desc: 'No adverse weather forecast' },
  { value: 'MEDIUM', label: 'Medium / Overcast', desc: 'Light showers possible' },
  { value: 'HIGH', label: 'High / Heavy Rain Approaching', desc: 'Storm forecasted within 48h' },
  { value: 'CRITICAL', label: 'Critical / Hail or Flash Flood Alert', desc: 'Preemptive harvest mandatory' }
];

export default function FarmerRequestPage() {
  const { isOnline, refreshPendingCount } = useAuth();
  const navigate = useNavigate();

  const [farms, setFarms] = useState([]);
  const [loadingFarms, setLoadingFarms] = useState(true);

  // Form State
  const [farmId, setFarmId] = useState('');
  const [resourceType, setResourceType] = useState('TRACTOR');
  const [earliestStart, setEarliestStart] = useState('');
  const [latestEnd, setLatestEnd] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('120');
  const [urgencyLevel, setUrgencyLevel] = useState('MEDIUM');
  const [urgencyReason, setUrgencyReason] = useState('');
  const [cropStage, setCropStage] = useState('VEGETATIVE');
  const [weatherRisk, setWeatherRisk] = useState('LOW');

  // Submit Result State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Quick Farm Creation Modal
  const [showAddFarm, setShowAddFarm] = useState(false);
  const [newFarm, setNewFarm] = useState({
    name: '',
    crop: 'Paddy / Rice',
    cropStage: 'VEGETATIVE',
    cropArea: 2.5,
    latitude: 12.525,
    longitude: 76.900,
    address: 'Mandya Rural'
  });

  // Default time windows: today 08:00 to today 18:00
  useEffect(() => {
    const today = new Date();
    const start = new Date(today);
    start.setHours(8, 0, 0, 0);

    const end = new Date(today);
    end.setHours(18, 0, 0, 0);

    const formatForInput = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setEarliestStart(formatForInput(start));
    setLatestEnd(formatForInput(end));
  }, []);

  // Fetch farms
  const loadFarms = async () => {
    try {
      setLoadingFarms(true);
      const res = await api.get('/farms');
      const data = res.data.data || [];
      setFarms(data);
      if (data.length > 0 && !farmId) {
        setFarmId(String(data[0].id));
      }
    } catch (err) {
      console.error('Failed to load farms:', err);
    } finally {
      setLoadingFarms(false);
    }
  };

  useEffect(() => {
    loadFarms();
  }, []);

  const handleCreateFarm = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/farms', newFarm);
      setShowAddFarm(false);
      await loadFarms();
      setFarmId(String(res.data.data.id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create farm');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSubmitting(true);

    const payload = {
      farmId: parseInt(farmId),
      resourceType,
      earliestStart: new Date(earliestStart).toISOString(),
      latestEnd: new Date(latestEnd).toISOString(),
      durationMinutes: parseInt(durationMinutes),
      urgencyLevel,
      urgencyReason,
      cropStage,
      weatherRisk
    };

    try {
      if (!isOnline) {
        // OFFLINE MODE: Save to IndexedDB
        const offlineEntry = await saveOfflineRequest(payload);
        await refreshPendingCount();
        setResult({
          offline: true,
          message: 'Saved to Offline Local Storage! Request is queued and will automatically sync once your connection is restored.',
          entry: offlineEntry
        });
      } else {
        // ONLINE MODE: Submit to backend
        const res = await api.post('/requests', payload);
        setResult(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to submit resource request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title & Context */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-agri-600 mb-1">
          <Sparkles className="w-4 h-4" />
          Automated Priority & Fair Allocation Engine
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Request Agricultural Resource
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Submit equipment requirements. Our priority algorithm evaluates urgency, biological readiness, weather risks, and geographic transit times to guarantee feasible, conflict-free allocation.
        </p>
      </div>

      {/* Offline Staging Alert */}
      {!isOnline && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <WifiOff className="w-6 h-6 text-amber-600 shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-amber-900">Offline Resilience Active</h4>
            <p className="text-xs text-amber-700">
              No internet connection detected. Submitting this request will automatically queue it in IndexedDB. When connection returns, it synchronizes seamlessly with the central scheduling engine.
            </p>
          </div>
        </div>
      )}

      {/* Submission Result / Instant Priority Card */}
      {result && (
        <div className="bg-white rounded-2xl border-2 border-emerald-500 shadow-xl p-6 sm:p-8 space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {result.offline ? 'Request Staged Offline' : 'Resource Allocation Evaluated'}
                </h3>
                <span className="text-xs text-slate-500">
                  {result.offline ? 'Queued in browser storage' : `Request ID #${result.request?.id || 'NEW'}`}
                </span>
              </div>
            </div>

            {!result.offline && (
              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                  result.status === 'SCHEDULED'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {result.status || 'EVALUATED'}
              </span>
            )}
          </div>

          {result.offline ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <p className="font-semibold">{result.message}</p>
              <div className="mt-2 text-[11px] text-amber-700">
                Resource Type: <strong>{result.entry?.resourceType}</strong> • Duration: {result.entry?.durationMinutes} min
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Allocation Outcome Callout */}
              {result.booking ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                      Guaranteed Equipment Slot Confirmed
                    </span>
                    <h4 className="text-base font-bold text-emerald-950 mt-0.5">
                      {result.booking.resource?.name || 'Resource Assigned'}
                    </h4>
                    <p className="text-xs text-emerald-700 mt-1">
                      Time: {new Date(result.booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                      {new Date(result.booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Transit Buffer:{' '}
                      {result.booking.travelMinutes || 15} min
                    </p>
                  </div>
                  <Link
                    to="/farmer/schedule"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm text-center"
                  >
                    View in Schedule
                  </Link>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                    Moved to Automated Waitlist
                  </span>
                  <p className="text-xs text-amber-900 mt-1">
                    All compatible units are booked during this specific window. Your request has been queued at high priority (Score: {result.priority?.totalScore?.toFixed(1)}) and will be auto-allocated if an earlier slot frees up or equipment is reallocated.
                  </p>
                </div>
              )}

              {/* Priority Breakdown Engine */}
              {result.priority && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Transparent Algorithmic Scoring
                  </h4>
                  <PriorityBreakdown priority={result.priority} />
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setResult(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Submit Another Request
            </button>
            <Link
              to="/farmer/requests"
              className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition flex items-center gap-1.5"
            >
              My Requests List
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Main Request Form */}
      {!result && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Target Farm Parcel */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Target Farm Parcel *
              </label>
              <button
                type="button"
                onClick={() => setShowAddFarm(true)}
                className="text-xs text-agri-600 font-bold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add New Farm
              </button>
            </div>

            {loadingFarms ? (
              <div className="text-xs text-slate-400 py-2">Loading your farms...</div>
            ) : farms.length === 0 ? (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                No farms registered yet.{' '}
                <button
                  type="button"
                  onClick={() => setShowAddFarm(true)}
                  className="font-bold underline"
                >
                  Click here to register your farm parcel
                </button>.
              </div>
            ) : (
              <select
                value={farmId}
                onChange={(e) => setFarmId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-agri-500 focus:outline-none bg-slate-50/50"
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} — {f.crop} ({f.cropStage}) • {f.cropArea} Acres
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 2. Resource Type Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Equipment / Resource Type *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {RESOURCE_TYPES.map((res) => (
                <button
                  key={res.value}
                  type="button"
                  onClick={() => setResourceType(res.value)}
                  className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                    resourceType === res.value
                      ? 'border-agri-600 bg-agri-50/60 ring-2 ring-agri-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <span className="text-xl">{res.icon}</span>
                  <div>
                    <div className="font-bold text-xs text-slate-900">{res.label.split('(')[0]}</div>
                    <span className="text-[10px] text-slate-400 block">{res.value}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Time Window and Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                Earliest Start Time *
              </label>
              <input
                type="datetime-local"
                value={earliestStart}
                onChange={(e) => setEarliestStart(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-agri-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                Latest Acceptable End *
              </label>
              <input
                type="datetime-local"
                value={latestEnd}
                onChange={(e) => setLatestEnd(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-agri-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                Duration Needed *
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-agri-500 focus:outline-none bg-slate-50/50"
              >
                <option value="60">1 Hour (60 min)</option>
                <option value="120">2 Hours (120 min)</option>
                <option value="180">3 Hours (180 min)</option>
                <option value="240">4 Hours (240 min)</option>
                <option value="360">6 Hours (360 min)</option>
                <option value="480">Full Day (8 Hours / 480 min)</option>
              </select>
            </div>
          </div>

          {/* 4. Priority Factors: Crop Stage, Weather, Urgency */}
          <div className="pt-2 border-t border-slate-100 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Scarcity & Priority Allocation Factors
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                  <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                  Crop Biological Stage
                </label>
                <select
                  value={cropStage}
                  onChange={(e) => setCropStage(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-agri-500 focus:outline-none"
                >
                  {CROP_STAGES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label} ({s.weight})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                  <CloudRain className="w-3.5 h-3.5 text-sky-600" />
                  Weather Risk Proximity
                </label>
                <select
                  value={weatherRisk}
                  onChange={(e) => setWeatherRisk(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-agri-500 focus:outline-none"
                >
                  {WEATHER_RISKS.map((w) => (
                    <option key={w.value} value={w.value}>
                      {w.label} — {w.desc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Urgency Level
              </label>
              <select
                value={urgencyLevel}
                onChange={(e) => setUrgencyLevel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-agri-500 focus:outline-none"
              >
                {URGENCY_LEVELS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Urgency Reason / Farmer Notes
              </label>
              <textarea
                value={urgencyReason}
                onChange={(e) => setUrgencyReason(e.target.value)}
                rows={2}
                placeholder="e.g. Grain moisture level has peaked, need to harvest before heavy evening thunderstorm."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-agri-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {isOnline ? '🟢 Connected to central coordinator' : '🟡 Offline queue enabled'}
            </span>

            <button
              type="submit"
              disabled={submitting || !farmId}
              className="px-6 py-3 rounded-xl bg-agri-600 hover:bg-agri-700 text-white font-bold text-sm shadow-md transition disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                'Evaluating Priority & Feasibility...'
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Submit Request
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Add Farm Modal */}
      {showAddFarm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900">Register New Farm Parcel</h3>
            <form onSubmit={handleCreateFarm} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Parcel Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. North Plot - Mandya"
                  value={newFarm.name}
                  onChange={(e) => setNewFarm({ ...newFarm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Crop</label>
                  <input
                    type="text"
                    required
                    value={newFarm.crop}
                    onChange={(e) => setNewFarm({ ...newFarm, crop: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Area (Acres)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newFarm.cropArea}
                    onChange={(e) => setNewFarm({ ...newFarm, cropArea: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newFarm.latitude}
                    onChange={(e) => setNewFarm({ ...newFarm, latitude: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newFarm.longitude}
                    onChange={(e) => setNewFarm({ ...newFarm, longitude: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddFarm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-agri-600 text-white rounded-lg"
                >
                  Save Farm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
