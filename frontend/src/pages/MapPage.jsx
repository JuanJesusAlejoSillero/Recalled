import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { placesAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon (Leaflet + bundlers issue)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function MapPage() {
  const { t } = useLanguage();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlaces = async () => {
      try {
        // Load all places (no pagination for map view)
        const { data } = await placesAPI.list({ per_page: 1000 });
        const withCoords = (data.places || []).filter(
          (p) => p.latitude != null && p.longitude != null
        );
        setPlaces(withCoords);
      } catch (err) {
        console.error('Error loading places for map:', err);
      } finally {
        setLoading(false);
      }
    };
    loadPlaces();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('map.title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {t('map.subtitle', { count: places.length })}
        </p>
      </div>

      <div className="rounded-lg overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700" style={{ height: '70vh' }}>
        <MapContainer
          center={[20, 0]}
          zoom={2}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {places.map((place) => (
            <Marker key={place.id} position={[place.latitude, place.longitude]}>
              <Popup>
                <div className="text-sm">
                  <Link
                    to={`/places/${place.id}`}
                    className="font-semibold text-primary-600 hover:underline"
                  >
                    {place.name}
                  </Link>
                  {place.category && (
                    <p className="text-gray-500 text-xs mt-1">{place.category}</p>
                  )}
                  {place.city && (
                    <p className="text-gray-500 text-xs">
                      {place.city}{place.country ? `, ${place.country}` : ''}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {places.length === 0 && (
        <p className="text-center text-gray-500 dark:text-gray-400 mt-4">
          {t('map.noPlaces')}
        </p>
      )}
    </div>
  );
}

export default MapPage;
