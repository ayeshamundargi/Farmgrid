import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Tractor,
  Layers,
  RotateCcw,
  Navigation,
  Compass,
  CheckCircle2,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

// Fix default Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Create custom animated vehicle DivIcon
const createTractorMarkerIcon = (heading = 0, status = 'ON_THE_WAY') => {
  const isMoving = status === 'ON_THE_WAY' || status === 'RETURNING';
  const isArrived = status === 'REACHED_LAND' || status === 'OTP_VERIFIED' || status === 'WORK_STARTED' || status === 'WORK_IN_PROGRESS';
  const ringColor = isArrived ? '#10b981' : isMoving ? '#2563eb' : '#f59e0b';

  return L.divIcon({
    html: `
      <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
        <!-- Pulsing radar ring -->
        ${isMoving ? `
          <div style="
            position: absolute;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background-color: ${ringColor};
            opacity: 0.25;
            animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></div>
        ` : ''}

        <!-- Tractor Vehicle Badge -->
        <div style="
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
          border: 2.5px solid white;
          box-shadow: 0 4px 12px rgba(37,99,235,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          z-index: 10;
          transition: transform 0.3s ease;
        ">
          🚜
        </div>

        <!-- Direction indicator arrow -->
        ${heading ? `
          <div style="
            position: absolute;
            top: -2px;
            width: 8px;
            height: 8px;
            background-color: #38bdf8;
            border-radius: 50%;
            border: 1px solid white;
            transform: rotate(${heading}deg) translateY(-14px);
            z-index: 11;
          "></div>
        ` : ''}
      </div>
    `,
    className: 'tractor-live-marker',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -20]
  });
};

// Destination Farm Marker
const farmMarkerIcon = L.divIcon({
  html: `
    <div style="
      position: relative;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: linear-gradient(135deg, #065f46 0%, #10b981 100%);
        border: 2.5px solid white;
        box-shadow: 0 4px 12px rgba(16,185,129,0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 17px;
        z-index: 10;
      ">
        📍
      </div>
    </div>
  `,
  className: 'farm-destination-marker',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  popupAnchor: [0, -18]
});

// Depot Base Marker
const depotMarkerIcon = L.divIcon({
  html: `
    <div style="
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background-color: #475569;
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 13px;
    ">
      🏢
    </div>
  `,
  className: 'depot-marker',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -14]
});

// Map Controller for Auto-Panning & Bounds
function MapController({ tractorCoords, farmCoords, autoFollow, resetTrigger }) {
  const map = useMap();
  const hasFittedRef = useRef(false);

  useEffect(() => {
    map.invalidateSize();
  }, [map]);

  // Auto-follow tractor if user enabled it
  useEffect(() => {
    if (autoFollow && tractorCoords && Number.isFinite(tractorCoords[0]) && Number.isFinite(tractorCoords[1])) {
      map.panTo(tractorCoords, { animate: true, duration: 1.0 });
    }
  }, [map, tractorCoords, autoFollow]);

  // Fit bounds between tractor and farm
  useEffect(() => {
    if ((!hasFittedRef.current || resetTrigger > 0) && tractorCoords && farmCoords) {
      const bounds = L.latLngBounds([tractorCoords, farmCoords]);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
        hasFittedRef.current = true;
      }
    }
  }, [map, tractorCoords, farmCoords, resetTrigger]);

  return null;
}

const TILE_PRESETS = {
  GOOGLE_HYBRID: {
    name: 'Google Satellite',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps Satellite',
    maxZoom: 20
  },
  GOOGLE_ROAD: {
    name: 'Google Streets',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    maxZoom: 20
  },
  OSM: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }
};

export default function LiveTractorMap({
  tractorCoords,
  farmCoords,
  depotCoords,
  heading = 0,
  speed = 0,
  status = 'ON_THE_WAY',
  resourceName = 'Tractor',
  farmName = 'Farmer Land',
  crop = 'Crop',
  distanceRemaining = 0,
  height = '380px'
}) {
  const [activeLayer, setActiveLayer] = useState('GOOGLE_HYBRID');
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const [autoFollow, setAutoFollow] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);

  // Validate coordinates
  const validTractor = useMemo(() => {
    if (Array.isArray(tractorCoords) && tractorCoords.length === 2 && Number.isFinite(tractorCoords[0]) && Number.isFinite(tractorCoords[1])) {
      return tractorCoords;
    }
    return [12.5200, 76.8900];
  }, [tractorCoords]);

  const validFarm = useMemo(() => {
    if (Array.isArray(farmCoords) && farmCoords.length === 2 && Number.isFinite(farmCoords[0]) && Number.isFinite(farmCoords[1])) {
      return farmCoords;
    }
    return [12.5218, 76.8951];
  }, [farmCoords]);

  const validDepot = useMemo(() => {
    if (Array.isArray(depotCoords) && depotCoords.length === 2 && Number.isFinite(depotCoords[0]) && Number.isFinite(depotCoords[1])) {
      return depotCoords;
    }
    return null;
  }, [depotCoords]);

  // Route points: from tractor to destination
  const routePoints = useMemo(() => {
    return [validTractor, validFarm];
  }, [validTractor, validFarm]);

  const tractorIcon = useMemo(() => {
    return createTractorMarkerIcon(heading, status);
  }, [heading, status]);

  const activeLayerConfig = TILE_PRESETS[activeLayer] || TILE_PRESETS.GOOGLE_HYBRID;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900 flex flex-col">
      {/* Top Map Action Bar */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center justify-between pointer-events-none">
        {/* Layer Dropdown */}
        <div className="pointer-events-auto relative">
          <button
            type="button"
            onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/85 hover:bg-slate-900 text-white backdrop-blur-md rounded-xl text-xs font-bold shadow-lg border border-white/20 transition"
          >
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>{activeLayerConfig.name}</span>
            <ChevronDown className="w-3 h-3 text-slate-300" />
          </button>

          {isLayerMenuOpen && (
            <div className="absolute left-0 mt-1.5 w-48 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 py-1 text-xs z-50 divide-y divide-slate-100">
              {Object.entries(TILE_PRESETS).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setActiveLayer(key);
                    setIsLayerMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition ${
                    activeLayer === key ? 'bg-sky-50 text-sky-700 font-bold' : ''
                  }`}
                >
                  <span>{cfg.name}</span>
                  {activeLayer === key && <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Auto-follow Toggle */}
          <button
            type="button"
            onClick={() => setAutoFollow(!autoFollow)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold backdrop-blur-md shadow-lg border transition ${
              autoFollow
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/30'
                : 'bg-slate-900/85 text-slate-200 hover:bg-slate-900 border-white/20'
            }`}
            title="Auto-center map on tractor movement"
          >
            <Navigation className={`w-3.5 h-3.5 ${autoFollow ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Follow Tractor</span>
          </button>

          {/* Reset / Fit View */}
          <button
            type="button"
            onClick={() => setResetTrigger((prev) => prev + 1)}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-900/85 hover:bg-slate-900 text-white backdrop-blur-md rounded-xl text-xs font-bold shadow-lg border border-white/20 transition"
            title="Fit route bounds"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-300" />
            <span className="hidden sm:inline">Fit Route</span>
          </button>
        </div>
      </div>

      {/* Floating Status Banner */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/90 text-white backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/20 text-xs shadow-xl flex items-center gap-3 pointer-events-auto">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="font-black tracking-wide uppercase text-[11px] text-emerald-300">LIVE</span>
        </div>
        <div className="h-3.5 w-px bg-white/20"></div>
        <div className="font-semibold text-slate-200 text-[11px]">
          {distanceRemaining > 0 ? (
            <span>Distance: <strong className="text-white">{distanceRemaining.toFixed(2)} km</strong></span>
          ) : (
            <span className="text-emerald-400 font-bold">Arrived at Land</span>
          )}
        </div>
        {speed > 0 && (
          <>
            <div className="h-3.5 w-px bg-white/20"></div>
            <div className="text-[11px] text-slate-300">
              Speed: <strong className="text-white">{speed.toFixed(1)} km/h</strong>
            </div>
          </>
        )}
      </div>

      {/* Map Container */}
      <div style={{ height }} className="w-full">
        <MapContainer
          center={validTractor}
          zoom={14}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <MapController
            tractorCoords={validTractor}
            farmCoords={validFarm}
            autoFollow={autoFollow}
            resetTrigger={resetTrigger}
          />

          <TileLayer
            key={activeLayer}
            attribution={activeLayerConfig.attribution}
            url={activeLayerConfig.url}
            maxZoom={activeLayerConfig.maxZoom}
          />

          {/* 100m Geofence Circle around Farm */}
          <Circle
            center={validFarm}
            radius={100}
            pathOptions={{
              color: '#10b981',
              fillColor: '#10b981',
              fillOpacity: 0.18,
              weight: 2,
              dashArray: '4, 4'
            }}
          />

          {/* Route Polyline (Tractor to Destination) */}
          <Polyline
            positions={routePoints}
            pathOptions={{
              color: '#38bdf8',
              weight: 4,
              opacity: 0.85,
              dashArray: '8, 8'
            }}
          />

          {/* Depot Marker (if available) */}
          {validDepot && (
            <Marker position={validDepot} icon={depotMarkerIcon}>
              <Popup>
                <div className="p-1 text-xs">
                  <div className="font-bold text-slate-900">Equipment Depot</div>
                  <div className="text-slate-500 text-[11px]">Starting Departure Hub</div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Destination Farm Marker */}
          <Marker position={validFarm} icon={farmMarkerIcon}>
            <Popup>
              <div className="p-1 space-y-1 text-xs min-w-[180px]">
                <div className="font-black text-slate-900 text-sm flex items-center gap-1">
                  <span>📍</span>
                  <span>{farmName}</span>
                </div>
                <div className="text-slate-600 text-[11px]">
                  Crop: <strong className="text-emerald-700">{crop}</strong>
                </div>
                <div className="text-slate-500 text-[10px]">
                  Coordinates: {validFarm[0].toFixed(4)}°N, {validFarm[1].toFixed(4)}°E
                </div>
                <div className="pt-1 text-[10px] text-emerald-700 font-semibold">
                  🎯 100m Automatic Geofence Active
                </div>
              </div>
            </Popup>
          </Marker>

          {/* Tractor Vehicle Marker */}
          <Marker position={validTractor} icon={tractorIcon} zIndexOffset={1000}>
            <Popup>
              <div className="p-1 space-y-1.5 text-xs min-w-[200px]">
                <div className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                  <span>🚜</span>
                  <span>{resourceName}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-1 text-[11px]">
                  <div>
                    Status: <strong className="text-blue-700 uppercase">{status.replace(/_/g, ' ')}</strong>
                  </div>
                  <div>
                    Distance to Farm: <strong>{distanceRemaining.toFixed(2)} km</strong>
                  </div>
                  <div>
                    Speed: <strong>{speed.toFixed(1)} km/h</strong>
                  </div>
                  <div className="text-slate-400 text-[10px]">
                    GPS: {validTractor[0].toFixed(5)}, {validTractor[1].toFixed(5)}
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
}
