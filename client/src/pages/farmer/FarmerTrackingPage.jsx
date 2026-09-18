import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import LiveTractorTracker from '../../components/LiveTractorTracker';
import api from '../../services/api';
import {
  Tractor,
  ArrowLeft,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

export default function FarmerTrackingPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { t, isKannada } = useLanguage();

  const [activeBookings, setActiveBookings] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState(bookingId ? parseInt(bookingId) : null);
  const [loading, setLoading] = useState(!bookingId);

  // Load available tractor bookings if not specified in URL or to provide selector
  useEffect(() => {
    async function loadBookings() {
      try {
        setLoading(true);
        const res = await api.get('/requests/my');
        const requests = res.data.data || [];
        const tractorBookings = requests
          .filter((r) => r.booking && (r.status === 'SCHEDULED' || r.status === 'ACTIVE' || r.booking.status === 'ACTIVE'))
          .map((r) => ({
            id: r.booking.id,
            resourceName: r.booking.resource?.name || 'Assigned Tractor',
            resourceType: r.booking.resource?.type || 'TRACTOR',
            farmName: r.farm?.name || 'Field Parcel',
            status: r.booking.status
          }));

        setActiveBookings(tractorBookings);

        if (!selectedBookingId && tractorBookings.length > 0) {
          setSelectedBookingId(tractorBookings[0].id);
        }
      } catch (err) {
        console.error('Failed to load farmer tractor bookings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadBookings();
  }, [selectedBookingId]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              to="/farmer/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isKannada ? 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ಗೆ ಹಿಂತಿರುಗಿ' : 'Back to Dashboard'}</span>
            </Link>
            <span className="text-slate-300">•</span>
            <LanguageSwitcher variant="pills" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Tractor className="w-8 h-8 text-agri-600" />
            <span>{t('tracking.title')}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t('tracking.subtitle')}
          </p>
        </div>

        {/* Multi-booking switcher dropdown if farmer has multiple deployments */}
        {activeBookings.length > 1 && (
          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="text-xs font-bold text-slate-500 uppercase">Select Tractor:</span>
            <select
              value={selectedBookingId || ''}
              onChange={(e) => {
                const newId = parseInt(e.target.value);
                setSelectedBookingId(newId);
                navigate(`/farmer/tracking/${newId}`, { replace: true });
              }}
              className="px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-agri-500 focus:outline-none shadow-sm"
            >
              {activeBookings.map((b) => (
                <option key={b.id} value={b.id}>
                  🚜 {b.resourceName} (#{b.id}) - {b.farmName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Tracking Widget */}
      {selectedBookingId ? (
        <LiveTractorTracker
          bookingId={selectedBookingId}
          showFullDetails={true}
        />
      ) : loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 space-y-3 border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-agri-600" />
          <p className="text-xs font-bold">Checking active tractor assignments...</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-500 space-y-3 border border-slate-200">
          <Tractor className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-base text-slate-700">No Active Tractor Bookings Found</h3>
          <p className="text-xs max-w-md mx-auto text-slate-400">
            You do not currently have any scheduled tractor dispatches. Request machinery from your dashboard to begin live GPS tracking.
          </p>
          <Link
            to="/farmer/request"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-agri-600 hover:bg-agri-700 text-white font-bold text-xs rounded-xl shadow transition"
          >
            Request Tractor Now
          </Link>
        </div>
      )}
    </div>
  );
}
