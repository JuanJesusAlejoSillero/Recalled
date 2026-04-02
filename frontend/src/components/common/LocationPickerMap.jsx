import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { ensureLeafletDefaultIcon } from '../../utils/leafletIcons';
import 'leaflet/dist/leaflet.css';

ensureLeafletDefaultIcon();

const DEFAULT_CENTER = [20, 0];
const DEFAULT_ZOOM = 2;
const LOCATION_ZOOM = 13;

function toCoordinate(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundCoordinate(value) {
  return Number.parseFloat(value.toFixed(6));
}

function RecenterMap({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, Math.max(map.getZoom(), LOCATION_ZOOM), { animate: true });
      return;
    }

    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: false });
  }, [map, position]);

  return null;
}

function MapClickHandler({ editable, onPick }) {
  useMapEvents({
    click(event) {
      if (!editable) {
        return;
      }

      onPick({
        latitude: roundCoordinate(event.latlng.lat),
        longitude: roundCoordinate(event.latlng.lng),
      });
    },
  });

  return null;
}

function LocationPickerMap({
  latitude,
  longitude,
  onChange,
  editable = true,
  markerLabel,
  hint,
  emptyMessage,
  heightClassName = 'h-72',
}) {
  const lat = toCoordinate(latitude);
  const lng = toCoordinate(longitude);
  const position = lat != null && lng != null ? [lat, lng] : null;

  const handlePick = ({ latitude: nextLatitude, longitude: nextLongitude }) => {
    onChange({ latitude: nextLatitude, longitude: nextLongitude });
  };

  return (
    <div className="space-y-2">
      <div className={`overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 ${heightClassName}`}>
        <MapContainer
          center={position || DEFAULT_CENTER}
          zoom={position ? LOCATION_ZOOM : DEFAULT_ZOOM}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterMap position={position} />
          <MapClickHandler editable={editable} onPick={handlePick} />
          {position && (
            <Marker
              position={position}
              draggable={editable}
              eventHandlers={{
                dragend(event) {
                  const nextPosition = event.target.getLatLng();
                  handlePick({
                    latitude: roundCoordinate(nextPosition.lat),
                    longitude: roundCoordinate(nextPosition.lng),
                  });
                },
              }}
            >
              <Popup>
                <div className="text-sm">
                  {markerLabel && <p className="font-semibold text-gray-900">{markerLabel}</p>}
                  <p className="text-gray-500">
                    {lat?.toFixed(6)}, {lng?.toFixed(6)}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
      {hint && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{hint}</p>
      )}
      {!position && emptyMessage && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      )}
    </div>
  );
}

export default LocationPickerMap;