import React, { useEffect, useMemo, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Tractor,
  Sprout,
  MapPin,
  RotateCcw,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Navigation,
  CloudSun,
  Crosshair,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import AgriWeatherWidget from './AgriWeatherWidget';

// Fix default Leaflet icon paths in Vite / Webpack bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom HTML/SVG DivIcons for Leaflet markers
const createCustomIcon = (colorHex, symbolEmoji) => {
  return L.divIcon({
    html: `
      <div style="
        background-color: ${colorHex};
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 16px;
        border: 2px solid white;
        box-shadow: 0 3px 8px rgba(0,0,0,0.35);
        cursor: pointer;
        transition: transform 0.15s ease;
      ">
        ${symbolEmoji}
      </div>
    `,
    className: 'custom-leaflet-marker',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -20]
  });
};

const farmIcon = createCustomIcon('#16a34a', '🌱');
const tractorIcon = createCustomIcon('#2563eb', '🚜');
const harvesterIcon = createCustomIcon('#d97706', '🌾');
const techIcon = createCustomIcon('#9333ea', '🚁');
const pumpIcon = createCustomIcon('#0284c7', '💧');
const truckIcon = createCustomIcon('#0d9488', '🚚');
const labourIcon = createCustomIcon('#4f46e5', '👥');
const maintenanceIcon = createCustomIcon('#dc2626', '⚠️');
const userGpsIcon = createCustomIcon('#6366f1', '📍');
const clickedPinIcon = createCustomIcon('#0f172a', '📌');

// Tile layer presets including Google Maps Satellite, Road, and Terrain
const TILE_LAYERS = {
  GOOGLE_HYBRID: {
    name: 'Google Satellite',
    subtext: 'High-res agricultural fields & roads',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noreferrer">Google Maps</a> Satellite',
    maxZoom: 20
  },
  GOOGLE_ROAD: {
    name: 'Google Streets',
    subtext: 'Roadways & district landmarks',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noreferrer">Google Maps</a>',
    maxZoom: 20
  },
  GOOGLE_TERRAIN: {
    name: 'Google Terrain',
    subtext: 'Topography, contours & elevation',
    url: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noreferrer">Google Maps</a> Terrain',
    maxZoom: 20
  },
  OSM: {
    name: 'OpenStreetMap',
    subtext: 'Standard open street layer',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19
  }
};

/**
 * Safely extracts an array from various API response shapes
 */
function normalizeList(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  if (Array.isArray(input.resources)) return input.resources;
  if (Array.isArray(input.farms)) return input.farms;
  if (input.data) {
    if (Array.isArray(input.data)) return input.data;
    if (Array.isArray(input.data.resources)) return input.data.resources;
    if (Array.isArray(input.data.farms)) return input.data.farms;
  }
  return [];
}

/**
 * Validates and extracts [lat, lng] from an item with lat/latitude & lng/lon/longitude
 */
function getValidCoords(item) {
  if (!item || typeof item !== 'object') return null;
  const lat = parseFloat(item.latitude ?? item.lat);
  const lng = parseFloat(item.longitude ?? item.lng ?? item.lon);

  if (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  ) {
    return [lat, lng];
  }
  return null;
}

/**
 * Inner Map Controller to handle bounds fitting, dynamic center changes, and tile invalidation
 */
function MapController({ bounds, center, zoom, resetTrigger, autoFit, panTarget }) {
  const map = useMap();
  const hasFittedRef = useRef(false);

  // Invalidate size shortly after mounting to eliminate gray tiles in grid/flex containers
  useEffect(() => {
    const timer1 = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    const timer2 = setTimeout(() => {
      map.invalidateSize();
    }, 600);

    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  // Handle explicit pan target (e.g. GPS locate or Weather inspect)
  useEffect(() => {
    if (panTarget && Number.isFinite(panTarget[0]) && Number.isFinite(panTarget[1])) {
      map.flyTo(panTarget, Math.max(map.getZoom(), 14), { duration: 1.2 });
    }
  }, [map, panTarget]);

  // Fit bounds when markers change or reset button is triggered
  useEffect(() => {
    map.invalidateSize();

    if (resetTrigger > 0 || !hasFittedRef.current) {
      if (bounds && bounds.isValid() && autoFit) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
        hasFittedRef.current = true;
      } else if (center && Number.isFinite(center[0]) && Number.isFinite(center[1])) {
        map.setView(center, zoom);
      }
    }
  }, [map, bounds, center, zoom, resetTrigger, autoFit]);

  return null;
}

/**
 * Handles map click to inspect any geographical location and retrieve weather
 */
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick([e.latlng.lat, e.latlng.lng]);
      }
    }
  });
  return null;
}

export default function FarmMap({
  farms = [],
  resources = [],
  center = [12.525, 76.900],
  zoom = 12,
  height = '440px',
  autoFit = true,
  showWeatherDefault = false
}) {
  const [activeTileLayer, setActiveTileLayer] = useState('GOOGLE_HYBRID');
  const [filterType, setFilterType] = useState('ALL'); // ALL, FARMS, RESOURCES
  const [resetTrigger, setResetTrigger] = useState(0);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const [isWeatherOpen, setIsWeatherOpen] = useState(showWeatherDefault);

  // Weather active location target
  const [weatherTarget, setWeatherTarget] = useState(null);
  const [clickedPin, setClickedPin] = useState(null);
  const [userGpsPos, setUserGpsPos] = useState(null);
  const [panTarget, setPanTarget] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Normalize incoming lists
  const rawFarms = useMemo(() => normalizeList(farms), [farms]);
  const rawResources = useMemo(() => normalizeList(resources), [resources]);

  // Validate coordinates to prevent LatLng crash
  const validFarms = useMemo(() => {
    return rawFarms
      .map((f) => ({ ...f, coords: getValidCoords(f) }))
      .filter((f) => f.coords !== null);
  }, [rawFarms]);

  const validResources = useMemo(() => {
    return rawResources
      .map((r) => ({ ...r, coords: getValidCoords(r) }))
      .filter((r) => r.coords !== null);
  }, [rawResources]);

  // Set default weather target to the first farm, or regional center
  useEffect(() => {
    if (!weatherTarget) {
      if (validFarms.length > 0) {
        setWeatherTarget({
          name: validFarms[0].name || 'Primary Farm',
          coords: validFarms[0].coords
        });
      } else if (validResources.length > 0) {
        setWeatherTarget({
          name: validResources[0].name || 'Resource Hub',
          coords: validResources[0].coords
        });
      } else {
        setWeatherTarget({
          name: 'Regional Agricultural Hub',
          coords: [12.525, 76.900]
        });
      }
    }
  }, [validFarms, validResources, weatherTarget]);

  // Filtered lists based on toggle
  const displayedFarms = useMemo(() => {
    if (filterType === 'RESOURCES') return [];
    return validFarms;
  }, [validFarms, filterType]);

  const displayedResources = useMemo(() => {
    if (filterType === 'FARMS') return [];
    return validResources;
  }, [validResources, filterType]);

  // Calculate dynamic map bounds
  const computedBounds = useMemo(() => {
    const coords = [];
    displayedFarms.forEach((f) => coords.push(f.coords));
    displayedResources.forEach((r) => coords.push(r.coords));
    if (clickedPin) coords.push(clickedPin);
    if (userGpsPos) coords.push(userGpsPos);

    if (coords.length === 0) return null;
    return L.latLngBounds(coords);
  }, [displayedFarms, displayedResources, clickedPin, userGpsPos]);

  // Determine icon for resource
  const getResourceIcon = (resource) => {
    if (resource.status === 'MAINTENANCE' || resource.status === 'UNAVAILABLE') {
      return maintenanceIcon;
    }
    const type = (resource.type || '').toUpperCase();
    if (type.includes('TRACTOR') || type.includes('TILLER') || type.includes('SEEDER')) return tractorIcon;
    if (type.includes('HARVESTER')) return harvesterIcon;
    if (type.includes('DRONE') || type.includes('SOIL')) return techIcon;
    if (type.includes('PUMP') || type.includes('DRIP') || type.includes('SPRINKLER')) return pumpIcon;
    if (type.includes('TRUCK') || type.includes('TRAILER') || type.includes('CART')) return truckIcon;
    if (type.includes('LABOUR')) return labourIcon;
    return tractorIcon;
  };

  const handleResetView = () => {
    setResetTrigger((prev) => prev + 1);
  };

  // Browser Geolocation
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setUserGpsPos(coords);
        setPanTarget(coords);
        setWeatherTarget({
          name: 'My Current Location (GPS)',
          coords
        });
        setGpsLoading(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        alert('Could not determine current location. Please check browser location permissions.');
        setGpsLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Click on map to inspect coordinates & weather
  const handleMapClick = (coords) => {
    setClickedPin(coords);
    setWeatherTarget({
      name: `Inspected Parcel (${coords[0].toFixed(3)}°, ${coords[1].toFixed(3)}°)`,
      coords
    });
  };

  const safeCenter = useMemo(() => {
    if (Array.isArray(center) && center.length === 2 && Number.isFinite(center[0]) && Number.isFinite(center[1])) {
      return center;
    }
    return [12.525, 76.900];
  }, [center]);

  const activeLayerConfig = TILE_LAYERS[activeTileLayer] || TILE_LAYERS.GOOGLE_HYBRID;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Top Header Controls */}
      <div className="p-3 border-b border-slate-200 bg-slate-50/90 flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Map Title & Layer Switcher */}
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
            Geospatial Farm & Resource Map
          </span>

          {/* Google Maps Layer Selector Dropdown */}
          <div className="relative inline-block">
            <button
              type="button"
              onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs text-slate-700 transition"
              title="Switch Google Maps & Satellite Layer"
            >
              <Layers className="w-3.5 h-3.5 text-agri-600" />
              <span>{activeLayerConfig.name}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isLayerMenuOpen && (
              <div className="absolute left-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-[1500] py-1 text-xs divide-y divide-slate-100">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Map View Provider
                </div>
                {Object.entries(TILE_LAYERS).map(([key, config]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setActiveTileLayer(key);
                      setIsLayerMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-start justify-between hover:bg-slate-50 transition ${
                      activeTileLayer === key ? 'bg-emerald-50/80 font-bold text-emerald-900' : 'text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs flex items-center gap-1.5">
                        {config.name}
                        {key.startsWith('GOOGLE') && (
                          <span className="px-1 py-0.2 rounded bg-blue-100 text-blue-700 text-[9px] font-bold">
                            Google
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">{config.subtext}</div>
                    </div>
                    {activeTileLayer === key && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Layer Filters + Weather Toggle + Navigation Actions */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Layer Filter Buttons */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition ${
                filterType === 'ALL'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterType('FARMS')}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition ${
                filterType === 'FARMS'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🌱 Farms ({validFarms.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('RESOURCES')}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition ${
                filterType === 'RESOURCES'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🚜 Equipment ({validResources.length})
            </button>
          </div>

          {/* Agro-Weather Toggle Button */}
          <button
            type="button"
            onClick={() => setIsWeatherOpen(!isWeatherOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition shadow-2xs ${
              isWeatherOpen
                ? 'bg-amber-500 text-white border-amber-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="Toggle Agricultural Micro-Climate Weather"
          >
            <CloudSun className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Agro-Weather</span>
          </button>

          {/* Locate GPS Button */}
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={gpsLoading}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition"
            title="Locate my position via browser GPS"
          >
            <Crosshair className={`w-3.5 h-3.5 text-indigo-600 ${gpsLoading ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Locate Me</span>
          </button>

          {/* Recenter Button */}
          <button
            type="button"
            onClick={handleResetView}
            title="Recenter map bounds"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">Recenter</span>
          </button>
        </div>
      </div>

      {/* Expandable Agricultural Weather Drawer */}
      {isWeatherOpen && weatherTarget && (
        <div className="p-3 bg-slate-100 border-b border-slate-200 transition-all">
          <AgriWeatherWidget
            latitude={weatherTarget.coords[0]}
            longitude={weatherTarget.coords[1]}
            locationName={weatherTarget.name}
            compact={true}
          />
        </div>
      )}

      {/* Map Body */}
      <div style={{ height, position: 'relative' }} className="w-full">
        <MapContainer
          center={safeCenter}
          zoom={zoom}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <MapController
            bounds={computedBounds}
            center={safeCenter}
            zoom={zoom}
            resetTrigger={resetTrigger}
            autoFit={autoFit}
            panTarget={panTarget}
          />

          <MapClickHandler onMapClick={handleMapClick} />

          {/* Tile Layer (Google Satellite, Google Streets, Google Terrain, or OSM) */}
          <TileLayer
            key={activeTileLayer}
            attribution={activeLayerConfig.attribution}
            url={activeLayerConfig.url}
            maxZoom={activeLayerConfig.maxZoom}
          />

          {/* Farm Markers */}
          {displayedFarms.map((farm, idx) => {
            const googleSearchUrl = `https://www.google.com/maps/search/?api=1&query=${farm.coords[0]},${farm.coords[1]}`;
            const googleDirUrl = `https://www.google.com/maps/dir/?api=1&destination=${farm.coords[0]},${farm.coords[1]}`;

            return (
              <Marker
                key={`farm-${farm.id || idx}`}
                position={farm.coords}
                icon={farmIcon}
                eventHandlers={{
                  click: () => {
                    setWeatherTarget({
                      name: farm.name || 'Farm Parcel',
                      coords: farm.coords
                    });
                  }
                }}
              >
                <Popup>
                  <div className="p-1 space-y-2 text-xs min-w-[210px]">
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <span>🌱</span>
                      <span>{farm.name || 'Unnamed Farm'}</span>
                    </div>

                    <div className="space-y-1 text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div>
                        Crop: <strong className="text-emerald-700">{farm.crop || 'Field Crop'}</strong>
                      </div>
                      {farm.cropStage && (
                        <div>
                          Stage:{' '}
                          <span className="font-mono text-[10px] bg-white border border-slate-200 px-1 py-0.5 rounded text-slate-700">
                            {farm.cropStage}
                          </span>
                        </div>
                      )}
                      {farm.cropArea && (
                        <div>
                          Area: <span className="font-semibold text-slate-800">{farm.cropArea} Acres</span>
                        </div>
                      )}
                      <div className="text-slate-400 text-[10px] pt-1">
                        📍 {farm.address || `${farm.coords[0].toFixed(4)}, ${farm.coords[1].toFixed(4)}`}
                      </div>
                    </div>

                    {/* Google Maps Actions & Weather Trigger */}
                    <div className="pt-1 flex flex-col gap-1.5 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setWeatherTarget({
                            name: farm.name || 'Farm Parcel',
                            coords: farm.coords
                          });
                          setIsWeatherOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-1 px-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-semibold rounded-md text-[11px] transition"
                      >
                        <CloudSun className="w-3 h-3 text-amber-600" />
                        <span>Inspect Farm Weather</span>
                      </button>

                      <div className="grid grid-cols-2 gap-1.5">
                        <a
                          href={googleSearchUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-1 py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-md text-[10px] transition"
                        >
                          <ExternalLink className="w-2.5 h-2.5 text-blue-600" />
                          <span>Google Maps</span>
                        </a>

                        <a
                          href={googleDirUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-1 py-1 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-md text-[10px] transition"
                        >
                          <Navigation className="w-2.5 h-2.5 text-blue-600" />
                          <span>Directions</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Resource / Equipment Markers */}
          {displayedResources.map((resource, idx) => {
            const statusColor =
              resource.status === 'AVAILABLE'
                ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                : resource.status === 'MAINTENANCE' || resource.status === 'UNAVAILABLE'
                ? 'text-rose-600 bg-rose-50 border-rose-200'
                : 'text-amber-600 bg-amber-50 border-amber-200';

            const googleSearchUrl = `https://www.google.com/maps/search/?api=1&query=${resource.coords[0]},${resource.coords[1]}`;
            const googleDirUrl = `https://www.google.com/maps/dir/?api=1&destination=${resource.coords[0]},${resource.coords[1]}`;

            return (
              <Marker
                key={`res-${resource.id || idx}`}
                position={resource.coords}
                icon={getResourceIcon(resource)}
                eventHandlers={{
                  click: () => {
                    setWeatherTarget({
                      name: `${resource.name} Hub`,
                      coords: resource.coords
                    });
                  }
                }}
              >
                <Popup>
                  <div className="p-1 space-y-2 text-xs min-w-[210px]">
                    <div className="font-bold text-slate-900 text-sm flex items-center justify-between gap-2">
                      <span>{resource.name || 'Agri Equipment'}</span>
                    </div>

                    <div className="space-y-1 text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div>
                        Type:{' '}
                        <span className="font-mono font-semibold text-slate-800">
                          {resource.type || 'MACHINERY'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>Status:</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${statusColor}`}>
                          {resource.status || 'AVAILABLE'}
                        </span>
                      </div>
                      {resource.operatingStart && resource.operatingEnd && (
                        <div className="text-slate-500 text-[11px] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Hours: {resource.operatingStart} - {resource.operatingEnd}</span>
                        </div>
                      )}
                      {resource.owner?.name && (
                        <div className="text-slate-500 text-[10px]">
                          Owner: {resource.owner.name}
                        </div>
                      )}
                      <div className="text-slate-400 text-[10px] pt-1">
                        📍 {resource.coords[0].toFixed(4)}, {resource.coords[1].toFixed(4)}
                      </div>
                    </div>

                    {/* Google Maps Actions & Weather Trigger */}
                    <div className="pt-1 flex flex-col gap-1.5 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setWeatherTarget({
                            name: `${resource.name} Hub`,
                            coords: resource.coords
                          });
                          setIsWeatherOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-1 px-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-semibold rounded-md text-[11px] transition"
                      >
                        <CloudSun className="w-3 h-3 text-amber-600" />
                        <span>Check Hub Weather</span>
                      </button>

                      <div className="grid grid-cols-2 gap-1.5">
                        <a
                          href={googleSearchUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-1 py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-md text-[10px] transition"
                        >
                          <ExternalLink className="w-2.5 h-2.5 text-blue-600" />
                          <span>Google Maps</span>
                        </a>

                        <a
                          href={googleDirUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-1 py-1 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-md text-[10px] transition"
                        >
                          <Navigation className="w-2.5 h-2.5 text-blue-600" />
                          <span>Route Here</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* User GPS Marker */}
          {userGpsPos && (
            <Marker position={userGpsPos} icon={userGpsIcon}>
              <Popup>
                <div className="p-1 space-y-1 text-xs">
                  <div className="font-bold text-indigo-700 flex items-center gap-1">
                    <span>📍</span>
                    <span>Your Current Location (GPS)</span>
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    {userGpsPos[0].toFixed(4)}°N, {userGpsPos[1].toFixed(4)}°E
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${userGpsPos[0]},${userGpsPos[1]}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-semibold hover:underline mt-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open in Google Maps
                  </a>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Clicked / Inspected Pin Marker */}
          {clickedPin && (
            <Marker position={clickedPin} icon={clickedPinIcon}>
              <Popup>
                <div className="p-1 space-y-1.5 text-xs min-w-[190px]">
                  <div className="font-bold text-slate-900 flex items-center gap-1">
                    <span>📌</span>
                    <span>Inspected Field Parcel</span>
                  </div>
                  <div className="text-slate-600 font-mono text-[11px]">
                    {clickedPin[0].toFixed(5)}°N, {clickedPin[1].toFixed(5)}°E
                  </div>
                  <div className="pt-1 flex flex-col gap-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setWeatherTarget({
                          name: `Inspected Parcel (${clickedPin[0].toFixed(3)}°, ${clickedPin[1].toFixed(3)}°)`,
                          coords: clickedPin
                        });
                        setIsWeatherOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-1 py-1 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold rounded text-[11px]"
                    >
                      <CloudSun className="w-3 h-3 text-amber-600" />
                      <span>View Weather at this Pin</span>
                    </button>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${clickedPin[0]},${clickedPin[1]}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-1 py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded text-[10px]"
                    >
                      <ExternalLink className="w-2.5 h-2.5 text-blue-600" />
                      <span>Open in Google Maps</span>
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Map Overlay Helper Badge */}
        <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-xs border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-md text-[11px] text-slate-600 flex items-center gap-2 pointer-events-none">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Click anywhere to inspect coordinates & micro-climate weather</span>
        </div>
      </div>
    </div>
  );
}
