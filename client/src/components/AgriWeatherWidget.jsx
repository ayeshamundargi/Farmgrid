import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  CloudRain,
  Wind,
  Droplets,
  Thermometer,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sun,
  Calendar
} from 'lucide-react';
import { fetchAgriWeather } from '../services/weatherService';

export default function AgriWeatherWidget({
  latitude,
  longitude,
  locationName = 'Farm Location',
  compact = false,
  onOpenGoogleMaps
}) {
  const { t, isKannada } = useLanguage();
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(!compact);

  const loadWeather = async (force = false) => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAgriWeather(latitude, longitude);
      setWeather(data);
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError('Unable to load meteorological data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeather();
  }, [latitude, longitude]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200">
      {/* Header */}
      <div className="p-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">{weather?.current?.icon || '⛅'}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-xs sm:text-sm truncate text-white">
                {locationName}
              </h4>
              <span className="px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-semibold text-emerald-300">
                {t('weather.liveTitle')}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 truncate">
              {latitude.toFixed(3)}°N, {longitude.toFixed(3)}°E
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            title="Inspect in Google Maps"
            className="flex items-center gap-1 px-2 py-1 bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium rounded-lg transition"
          >
            <ExternalLink className="w-3 h-3 text-emerald-400" />
            <span className="hidden sm:inline">{t('weather.googleMaps')}</span>
          </a>

          <button
            type="button"
            onClick={() => loadWeather(true)}
            title={t('weather.refresh')}
            disabled={loading}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {compact && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition"
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && !weather && (
        <div className="p-6 text-center text-xs text-slate-500 animate-pulse flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-agri-600" />
          <span>{t('weather.syncTelemetry')}</span>
        </div>
      )}

      {error && !weather && (
        <div className="p-4 text-xs text-rose-600 bg-rose-50 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => loadWeather(true)}
            className="text-xs font-semibold underline text-rose-700"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {weather && (
        <div className="p-3.5 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Temperature */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-[11px]">
                <span>{t('weather.temp')}</span>
                <Thermometer className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-black text-slate-900">
                  {weather.current.temperature}°C
                </span>
                <span className="text-[11px] text-slate-400">
                  {t('weather.feelsLike')} {weather.current.apparentTemperature}°
                </span>
              </div>
              <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                {weather.current.label}
              </div>
            </div>

            {/* Precipitation & Rain */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-[11px]">
                <span>{t('weather.precipitation')}</span>
                <CloudRain className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-black text-slate-900">
                  {weather.current.precipitation} <span className="text-xs font-normal">mm</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  {t('weather.rainChance')} {weather.daily[0]?.precipitationProbability || 0}%
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {weather.current.precipitation > 0 ? t('weather.activeRain') : t('weather.dryCanopy')}
              </div>
            </div>

            {/* Relative Humidity */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-[11px]">
                <span>{t('weather.humidity')}</span>
                <Droplets className="w-3.5 h-3.5 text-sky-500" />
              </div>
              <div className="mt-1">
                <span className="text-xl font-black text-slate-900">
                  {weather.current.humidity}%
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {weather.current.humidity > 80 ? t('weather.highTranspiration') : t('weather.moderateHumidity')}
              </div>
            </div>

            {/* Wind Speed */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-[11px]">
                <span>{t('weather.windSpeed')}</span>
                <Wind className="w-3.5 h-3.5 text-teal-500" />
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl font-black text-slate-900">
                  {weather.current.windSpeed}
                </span>
                <span className="text-xs text-slate-500">km/h</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {weather.current.windSpeed > 15 ? t('weather.breezy') : t('weather.calmBreeze')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Sections: Advisories + 5-Day Forecast */}
      {weather && isExpanded && (
        <div className="p-4 space-y-4">
          {/* Actionable Agricultural Advisories */}
          <div>
            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-agri-600" />
              {t('weather.advisoriesHeading')}
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Trafficability */}
              <div
                className={`p-3 rounded-lg border text-xs ${
                  weather.advisories.trafficability.status === 'HAZARD'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : weather.advisories.trafficability.status === 'CAUTION'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="font-bold flex items-center justify-between mb-1">
                  <span>🚜 {isKannada ? t('weather.trafficabilityTitle') : weather.advisories.trafficability.label}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-black tracking-wide">
                    {weather.advisories.trafficability.status === 'OPTIMAL' ? (isKannada ? 'ಅತ್ಯುತ್ತಮ' : 'OPTIMAL') : weather.advisories.trafficability.status === 'CAUTION' ? (isKannada ? 'ಎಚ್ಚರಿಕೆ' : 'CAUTION') : (isKannada ? 'ಅಪಾಯಕಾರಿ' : 'HAZARD')}
                  </span>
                </div>
                <p className="text-[11px] opacity-90">
                  {weather.advisories.trafficability.message}
                </p>
              </div>

              {/* Crop Spraying */}
              <div
                className={`p-3 rounded-lg border text-xs ${
                  weather.advisories.spraying.status === 'UNFAVORABLE'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : weather.advisories.spraying.status === 'CAUTION'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="font-bold flex items-center justify-between mb-1">
                  <span>🚁 {isKannada ? t('weather.sprayingTitle') : weather.advisories.spraying.label}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-black tracking-wide">
                    {weather.advisories.spraying.status === 'FAVORABLE' ? (isKannada ? 'ಅನುಕೂಲಕರ' : 'FAVORABLE') : weather.advisories.spraying.status === 'CAUTION' ? (isKannada ? 'ಎಚ್ಚರಿಕೆ' : 'CAUTION') : (isKannada ? 'ಸೂಕ್ತವಲ್ಲ' : 'UNFAVORABLE')}
                  </span>
                </div>
                <p className="text-[11px] opacity-90">
                  {weather.advisories.spraying.message}
                </p>
              </div>

              {/* Harvesting */}
              <div
                className={`p-3 rounded-lg border text-xs ${
                  weather.advisories.harvesting.status === 'DELAY'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : weather.advisories.harvesting.status === 'MONITOR'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="font-bold flex items-center justify-between mb-1">
                  <span>🌾 {isKannada ? t('weather.harvestTitle') : weather.advisories.harvesting.label}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-black tracking-wide">
                    {weather.advisories.harvesting.status === 'OPTIMAL' ? (isKannada ? 'ಅತ್ಯುತ್ತಮ' : 'OPTIMAL') : weather.advisories.harvesting.status === 'MONITOR' ? (isKannada ? 'ಗಮನಿಸಿ' : 'MONITOR') : (isKannada ? 'ಮುಂದೂಡಿ' : 'DELAY')}
                  </span>
                </div>
                <p className="text-[11px] opacity-90">
                  {weather.advisories.harvesting.message}
                </p>
              </div>

              {/* Irrigation */}
              <div
                className={`p-3 rounded-lg border text-xs ${
                  weather.advisories.irrigation.status === 'PAUSE'
                    ? 'bg-blue-50 border-blue-200 text-blue-900'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="font-bold flex items-center justify-between mb-1">
                  <span>💧 {isKannada ? t('weather.irrigationTitle') : weather.advisories.irrigation.label}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-black tracking-wide">
                    {weather.advisories.irrigation.status === 'ADEQUATE' ? (isKannada ? 'ಸಾಕಷ್ಟಿದೆ' : 'ADEQUATE') : weather.advisories.irrigation.status === 'PAUSE' ? (isKannada ? 'ಸ್ಥಗಿತಗೊಳಿಸಿ' : 'PAUSE') : (isKannada ? 'ಅಗತ್ಯವಿದೆ' : 'NEEDED')}
                  </span>
                </div>
                <p className="text-[11px] opacity-90">
                  {weather.advisories.irrigation.message}
                </p>
              </div>
            </div>
          </div>

          {/* 5-Day Agricultural Forecast */}
          <div>
            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-agri-600" />
              {t('weather.forecastTitle')}
            </h5>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {weather.daily.map((day, idx) => (
                <div
                  key={day.date}
                  className={`p-2.5 rounded-lg border text-center transition ${
                    idx === 0
                      ? 'bg-agri-50/70 border-agri-200 shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900">
                    {idx === 0 && isKannada ? t('weather.today') : day.dayName}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {day.formattedDate}
                  </div>

                  <div className="my-1.5 text-2xl" title={day.condition}>
                    {day.icon}
                  </div>

                  <div className="text-xs font-extrabold text-slate-900">
                    {day.maxTemp}° <span className="text-slate-400 font-normal text-[11px]">/ {day.minTemp}°</span>
                  </div>

                  {/* Rain Prob Bar */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                      <span className="flex items-center gap-0.5">
                        <Droplets className="w-2.5 h-2.5 text-blue-500" />
                        {isKannada ? 'ಮಳೆ' : 'Rain'}
                      </span>
                      <span className="font-semibold text-slate-700">
                        {day.precipitationProbability}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          day.precipitationProbability > 50
                            ? 'bg-blue-600'
                            : day.precipitationProbability > 20
                            ? 'bg-sky-400'
                            : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(5, day.precipitationProbability))}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
