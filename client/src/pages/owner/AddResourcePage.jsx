import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Tractor,
  MapPin,
  Clock,
  UserCheck,
  Fuel,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

const RESOURCE_TYPES = [
  { value: 'TRACTOR', label: 'Tractor (Heavy Duty)' },
  { value: 'HARVESTER', label: 'Combine Harvester' },
  { value: 'TILLER', label: 'Rotary Tiller' },
  { value: 'SEEDER', label: 'Seed Drill' },
  { value: 'PUMP', label: 'Irrigation Pump' },
  { value: 'DRIP_LINE', label: 'Drip System Kit' },
  { value: 'DRONE_SPRAYER', label: 'Drone Sprayer' },
  { value: 'MINI_TRUCK', label: 'Mini Truck / Logistics' },
  { value: 'SOIL_TESTING', label: 'Soil Testing Unit' }
];

export default function AddResourcePage() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [type, setType] = useState('TRACTOR');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState(12.520);
  const [longitude, setLongitude] = useState(76.895);
  const [operatingStart, setOperatingStart] = useState('06:00');
  const [operatingEnd, setOperatingEnd] = useState('20:00');
  const [operatorRequired, setOperatorRequired] = useState(false);
  const [fuelRequirement, setFuelRequirement] = useState('DIESEL');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post('/resources', {
        name,
        type,
        description,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        operatingStart,
        operatingEnd,
        operatorRequired,
        fuelRequirement
      });
      navigate('/owner/resources');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to register equipment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/owner/resources"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Equipment Fleet
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Register New Agricultural Resource
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Add machinery to the regional coordination pool. The scheduling engine will allocate nearby farmer requests according to distance logistics and operating windows.
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Machine Identity */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Equipment Identity
          </h3>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Resource Name / Model *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Mahindra Yuvo 575 DI (50 HP)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-agri-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Resource Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-agri-500 focus:outline-none bg-slate-50/50"
              >
                {RESOURCE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Fuel / Power Type
              </label>
              <select
                value={fuelRequirement}
                onChange={(e) => setFuelRequirement(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-agri-500 focus:outline-none bg-slate-50/50"
              >
                <option value="DIESEL">Diesel</option>
                <option value="PETROL">Petrol</option>
                <option value="ELECTRIC">Electric / Battery</option>
                <option value="SOLAR">Solar Powered</option>
                <option value="MANUAL">Manual / Team</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Specifications & Attachment Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Equipped with 9-tyne cultivator and rotavator attachment. Max depth 8 inches."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-agri-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Operating Hours & Dispatch Rules */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Operating Schedule & Logistics
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Daily Operating Start (HH:MM)
              </label>
              <input
                type="text"
                value={operatingStart}
                onChange={(e) => setOperatingStart(e.target.value)}
                placeholder="06:00"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Daily Operating End (HH:MM)
              </label>
              <input
                type="text"
                value={operatingEnd}
                onChange={(e) => setOperatingEnd(e.target.value)}
                placeholder="20:00"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <input
              type="checkbox"
              id="operatorReq"
              checked={operatorRequired}
              onChange={(e) => setOperatorRequired(e.target.checked)}
              className="w-4 h-4 text-agri-600 rounded focus:ring-agri-500 border-slate-300"
            />
            <label htmlFor="operatorReq" className="text-xs font-semibold text-slate-800 cursor-pointer">
              Dedicated operator required (Machine will only be dispatched with certified driver/crew)
            </label>
          </div>
        </div>

        {/* GPS Home Depot Base */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Depot / Parking Location (GPS)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Latitude *
              </label>
              <input
                type="number"
                step="0.0001"
                required
                value={latitude}
                onChange={(e) => setLatitude(parseFloat(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Longitude *
              </label>
              <input
                type="number"
                step="0.0001"
                required
                value={longitude}
                onChange={(e) => setLongitude(parseFloat(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Link
            to="/owner/resources"
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-agri-600 hover:bg-agri-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            {loading ? 'Registering...' : 'Register Machinery'}
          </button>
        </div>
      </form>
    </div>
  );
}
