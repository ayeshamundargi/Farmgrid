import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import PriorityBreakdown from '../../components/PriorityBreakdown';
import { useLanguage } from '../../context/LanguageContext';
import {
  Tractor,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  X,
  Trash2,
  RefreshCw,
  PlusCircle,
  Filter,
  Calendar
} from 'lucide-react';

export default function FarmerRequestsPage() {
  const { t, translateStatus, translateEquipment, isKannada } = useLanguage();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/requests/my');
      setRequests(res.data.data || []);
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();

    const handleUpdate = () => loadRequests();
    window.addEventListener('farmgrid_schedule_updated', handleUpdate);
    window.addEventListener('schedule_updated', handleUpdate);
    return () => {
      window.removeEventListener('farmgrid_schedule_updated', handleUpdate);
      window.removeEventListener('schedule_updated', handleUpdate);
    };
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm(t('farmerRequests.cancelConfirm'))) {
      return;
    }
    try {
      setCancellingId(id);
      await api.post(`/requests/${id}/cancel`);
      await loadRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel request.');
    } finally {
      setCancellingId(null);
    }
  };

  const openPriorityModal = async (req) => {
    if (req.priorityScores && req.priorityScores.length > 0) {
      setSelectedPriority(req.priorityScores[0]);
    } else {
      try {
        const res = await api.get(`/requests/${req.id}/priority`);
        setSelectedPriority(res.data.data);
      } catch (err) {
        alert('Could not fetch priority score details.');
      }
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (filter === 'ALL') return true;
    return r.status === filter;
  });

  const filterTabs = [
    { key: 'ALL', label: t('farmerRequests.filterAll') },
    { key: 'SCHEDULED', label: t('farmerRequests.filterScheduled') },
    { key: 'WAITLIST', label: t('farmerRequests.filterWaitlist') },
    { key: 'CONFLICT', label: t('farmerRequests.filterConflict') },
    { key: 'CANCELLED', label: translateStatus('CANCELLED') }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-agri-600 block mb-1">
            {t('farmerRequests.pageBadge')}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {t('farmerRequests.pageTitle')}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t('farmerRequests.pageDesc')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadRequests}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            title={t('common.retry')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/farmer/request"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-agri-600 hover:bg-agri-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            {t('farmerRequests.requestEquipmentBtn')}
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 text-xs font-semibold">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg transition ${
              filter === tab.key
                ? 'bg-agri-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-[10px] opacity-75">
              ({tab.key === 'ALL' ? requests.length : requests.filter((r) => r.status === tab.key).length})
            </span>
          </button>
        ))}
      </div>

      {/* Requests Table / Cards */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-agri-600" />
          {t('common.loading')}
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
          <Tractor className="w-12 h-12 mx-auto text-slate-300" />
          <p className="text-sm font-medium">{t('farmerRequests.noRequests')}</p>
          <Link
            to="/farmer/request"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-agri-600 bg-agri-50 rounded-lg hover:bg-agri-100"
          >
            <PlusCircle className="w-4 h-4" />
            {t('farmerRequests.requestEquipmentBtn')}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            let statusBadge = 'bg-slate-100 text-slate-800 border-slate-200';
            if (req.status === 'SCHEDULED') statusBadge = 'bg-emerald-100 text-emerald-800 border-emerald-300';
            else if (req.status === 'WAITLIST') statusBadge = 'bg-amber-100 text-amber-800 border-amber-300';
            else if (req.status === 'CONFLICT') statusBadge = 'bg-rose-100 text-rose-800 border-rose-300';
            else if (req.status === 'CANCELLED') statusBadge = 'bg-slate-100 text-slate-500 border-slate-200';

            return (
              <div
                key={req.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:border-slate-300 transition space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-agri-50 text-agri-700 flex items-center justify-center font-bold text-lg">
                      🚜
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-slate-900">{translateEquipment(req.resourceType)}</h3>
                        <span className="text-xs text-slate-400 font-mono">#{req.id}</span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {t('common.farm')}: <strong>{req.farm?.name || t('farmer.farmParcel')}</strong> • {req.farm?.crop || 'Crop'} ({req.cropStage})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border uppercase ${statusBadge}`}>
                      {translateStatus(req.status)}
                    </span>
                    <button
                      type="button"
                      onClick={() => openPriorityModal(req)}
                      className="flex items-center gap-1 px-3 py-1 bg-agri-50 hover:bg-agri-100 text-agri-700 text-xs font-bold rounded-lg border border-agri-200 transition"
                    >
                      <Award className="w-3.5 h-3.5" />
                      {t('farmerRequests.priorityScore')}: {req.priorityScore?.toFixed(1) || '0.0'}
                    </button>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">{t('farmerRequests.neededBetween')}</span>
                    <div className="font-semibold text-slate-800">
                      {new Date(req.earliestStart).toLocaleDateString([], { month: 'short', day: 'numeric' })},{' '}
                      {new Date(req.earliestStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                      {new Date(req.latestEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {t('farmerRequests.duration')}: {req.durationMinutes} {t('common.min')}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">{isKannada ? 'ಅಪಾಯ ವಿಶ್ಲೇಷಣೆ' : 'Risk Assessment'}</span>
                    <div>
                      {isKannada ? 'ತುರ್ತು:' : 'Urgency:'} <strong className="text-slate-800">{req.urgencyLevel}</strong>
                    </div>
                    <div>
                      {isKannada ? 'ಹವಾಮಾನ ಅಪಾಯ:' : 'Weather Risk:'} <strong className="text-slate-800">{req.weatherRisk}</strong>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">{isKannada ? 'ನಿಯೋಜಿತ ಉಪಕರಣ' : 'Assigned Equipment'}</span>
                    {req.booking ? (
                      <div className="text-emerald-700 font-bold">
                        {req.booking.resource?.name || (isKannada ? 'ಖಚಿತ ಘಟಕ' : 'Allocated Unit')}
                        <span className="block text-[11px] font-normal text-emerald-600">
                          {new Date(req.booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                          {new Date(req.booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ) : (
                      <div className="text-amber-600 font-medium italic">
                        {req.status === 'WAITLIST' ? (isKannada ? 'ಕಾಯುವ ಪಟ್ಟಿಯಲ್ಲಿದೆ' : 'Queued in dynamic waitlist') : (isKannada ? 'ಯಾವುದೇ ಬುಕಿಂಗ್ ಇಲ್ಲ' : 'No booking attached')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-[11px] text-slate-400">
                    {t('common.date')}: {new Date(req.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </span>

                  {req.status !== 'CANCELLED' && req.status !== 'COMPLETED' && (
                    <button
                      type="button"
                      disabled={cancellingId === req.id}
                      onClick={() => handleCancel(req.id)}
                      className="text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 transition disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {cancellingId === req.id ? (isKannada ? 'ರದ್ದುಮಾಡಲಾಗುತ್ತಿದೆ...' : 'Cancelling...') : t('farmerRequests.cancelRequest')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Priority Breakdown Modal */}
      {selectedPriority && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-agri-600" />
                {t('priority.modalTitle')}
              </h3>
              <button
                onClick={() => setSelectedPriority(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <PriorityBreakdown priority={selectedPriority} />

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedPriority(null)}
                className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
