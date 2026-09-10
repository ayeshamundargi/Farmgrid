import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Tractor, Sprout, MapPin } from 'lucide-react';

// Custom SVG Icons for Leaflet markers
const createCustomIcon = (colorHex, symbolEmoji) => {
  return L.divIcon({
    html: `
      <div style="
        background-color: ${colorHex};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 14px;
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      ">
        ${symbolEmoji}
      </div>
    `,
    className: 'custom-leaflet-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18]
  });
};

const farmIcon = createCustomIcon('#2b7c46', '🌱');
const tractorIcon = createCustomIcon('#1e40af', '🚜');
const harvesterIcon = createCustomIcon('#b45309', '🌾');
const techIcon = createCustomIcon('#7e22ce', '🚁');
const pumpIcon = createCustomIcon('#0284c7', '💧');
const maintenanceIcon = createCustomIcon('#e11d48', '⚠️');

export default function FarmMap({
  farms = [],
  resources = [],
  center = [12.525, 76.900],
  zoom = 12,
  height = '420px'
}) {
  const getResourceIcon = (resource) => {
    if (resource.status === 'MAINTENANCE' || resource.status === 'UNAVAILABLE') {
      return maintenanceIcon;
    }
    const type = (resource.type || '').toUpperCase();
    if (type.includes('TRACTOR') || type.includes('TILLER')) return tractorIcon;
    if (type.includes('HARVESTER')) return harvesterIcon;
    if (type.includes('DRONE') || type.includes('SOIL')) return techIcon;
    if (type.includes('PUMP') || type.includes('DRIP') || type.includes('SPRINKLER')) return pumpIcon;
    return tractorIcon;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-agri-600" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            Agricultural Geography & Fleet Distribution Map
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
          <span className="flex items-center gap-1">🌱 Farms</span>
          <span className="flex items-center gap-1">🚜 Resources</span>
          <span className="flex items-center gap-1">⚠️ Maintenance</span>
        </div>
      </div>

      <div style={{ height }}>
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Farm Markers */}
          {farms.map((farm) => (
            <Marker
              key={`farm-${farm.id}`}
              position={[farm.latitude, farm.longitude]}
              icon={farmIcon}
            >
              <Popup>
                <div className="p-1 space-y-1 text-xs">
                  <div className="font-bold text-slate-900 text-sm">{farm.name}</div>
                  <div className="text-slate-600">
                    Crop: <strong className="text-emerald-700">{farm.crop}</strong>
                  </div>
                  <div className="text-slate-600">
                    Stage: <span className="font-mono">{farm.cropStage}</span>
                  </div>
                  <div className="text-slate-500 text-[10px]">{farm.address || 'Mandya, Karnataka'}</div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Resource Markers */}
          {resources.map((resource) => (
            <Marker
              key={`res-${resource.id}`}
              position={[resource.latitude, resource.longitude]}
              icon={getResourceIcon(resource)}
            >
              <Popup>
                <div className="p-1 space-y-1 text-xs">
                  <div className="font-bold text-slate-900 text-sm">{resource.name}</div>
                  <div className="text-slate-600">
                    Type: <span className="font-mono font-semibold">{resource.type}</span>
                  </div>
                  <div className="text-slate-600">
                    Status:{' '}
                    <strong
                      className={
                        resource.status === 'AVAILABLE'
                          ? 'text-emerald-600'
                          : resource.status === 'MAINTENANCE'
                          ? 'text-rose-600'
                          : 'text-amber-600'
                      }
                    >
                      {resource.status}
                    </strong>
                  </div>
                  <div className="text-slate-500 text-[10px]">
                    Hours: {resource.operatingStart} - {resource.operatingEnd}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
