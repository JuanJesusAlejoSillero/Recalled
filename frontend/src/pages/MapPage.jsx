import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { FiCheck, FiEdit2, FiX } from 'react-icons/fi';
import { placesAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../hooks/useAuth';
import { ensureLeafletDefaultIcon } from '../utils/leafletIcons';
import 'leaflet/dist/leaflet.css';

ensureLeafletDefaultIcon();

const DEFAULT_CENTER = [20, 0];
const DEFAULT_ZOOM = 2;
const EDIT_ZOOM = 13;

function roundCoordinate(value) {
  return Number.parseFloat(value.toFixed(6));
}

function FitBounds({ places, activePosition }) {
  const map = useMap();

  useEffect(() => {
    if (activePosition) {
      map.setView(activePosition, Math.max(map.getZoom(), EDIT_ZOOM), { animate: true });
      return;
    }

    if (places.length === 0) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: false });
      return;
    }

    if (places.length === 1) {
      map.setView([places[0].latitude, places[0].longitude], EDIT_ZOOM, { animate: false });
      return;
    }

    const bounds = L.latLngBounds(places.map((place) => [place.latitude, place.longitude]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: EDIT_ZOOM });
  }, [map, places, activePosition]);

  return null;
}

function MapClickHandler({ enabled, onSelect }) {
  useMapEvents({
    click(event) {
      if (!enabled) {
        return;
      }

      onSelect([
        roundCoordinate(event.latlng.lat),
        roundCoordinate(event.latlng.lng),
      ]);
    },
  });

  return null;
}

function MapPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPlaceId, setEditingPlaceId] = useState(null);
  const [draftPosition, setDraftPosition] = useState(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ error: '', success: '' });

  useEffect(() => {
    const loadPlaces = async () => {
      try {
        const { data } = await placesAPI.list({ per_page: 1000 });
        const withCoords = (data.places || []).filter(
          (place) => place.latitude != null && place.longitude != null
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

  const canEditPlace = (place) => Boolean(user?.is_admin || place.created_by === user?.id);

  const displayedPlaces = useMemo(() => (
    places.map((place) => {
      if (place.id !== editingPlaceId || !draftPosition) {
        return place;
      }

      return {
        ...place,
        latitude: draftPosition[0],
        longitude: draftPosition[1],
      };
    })
  ), [places, editingPlaceId, draftPosition]);

  const editingPlace = displayedPlaces.find((place) => place.id === editingPlaceId) || null;

  const startEditing = (place) => {
    if (!canEditPlace(place)) {
      return;
    }

    setEditingPlaceId(place.id);
    setDraftPosition([place.latitude, place.longitude]);
    setFeedback({ error: '', success: '' });
  };

  const cancelEditing = () => {
    setEditingPlaceId(null);
    setDraftPosition(null);
    setFeedback({ error: '', success: '' });
  };

  const saveLocation = async () => {
    if (!editingPlace || !draftPosition) {
      return;
    }

    setSaving(true);
    setFeedback({ error: '', success: '' });

    try {
      const { data: updatedPlace } = await placesAPI.update(editingPlace.id, {
        latitude: draftPosition[0],
        longitude: draftPosition[1],
      });

      setPlaces((currentPlaces) => currentPlaces.map((place) => (
        place.id === updatedPlace.id ? updatedPlace : place
      )));
      setEditingPlaceId(updatedPlace.id);
      setDraftPosition([updatedPlace.latitude, updatedPlace.longitude]);
      setFeedback({ error: '', success: t('map.locationSaved') });
    } catch (err) {
      setFeedback({ error: err.response?.data?.error || t('map.saveError'), success: '' });
    } finally {
      setSaving(false);
    }
  };

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
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {t('map.instructions')}
        </p>
      </div>

      {editingPlace && (
        <div className="mb-4 rounded-xl border border-primary-200 bg-primary-50 p-4 dark:border-primary-900/40 dark:bg-primary-900/10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                {t('map.editingTitle')}
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingPlace.name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('map.editingHint')}
              </p>
              {draftPosition && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t('map.coordinates')}: {draftPosition[0].toFixed(6)}, {draftPosition[1].toFixed(6)}
                </p>
              )}
              {feedback.error && (
                <p className="text-sm text-red-600 dark:text-red-400">{feedback.error}</p>
              )}
              {feedback.success && (
                <p className="text-sm text-green-600 dark:text-green-400">{feedback.success}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveLocation}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                <FiCheck className="h-4 w-4" />
                <span>{saving ? t('map.savingLocation') : t('map.saveLocation')}</span>
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <FiX className="h-4 w-4" />
                <span>{t('map.cancelEditing')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700" style={{ height: '70vh' }}>
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds places={displayedPlaces} activePosition={draftPosition} />
          <MapClickHandler enabled={Boolean(editingPlaceId)} onSelect={setDraftPosition} />
          {displayedPlaces.map((place) => {
            const isEditing = place.id === editingPlaceId;

            return (
              <Marker
                key={place.id}
                position={[place.latitude, place.longitude]}
                draggable={isEditing}
                eventHandlers={isEditing ? {
                  dragend(event) {
                    const nextPosition = event.target.getLatLng();
                    setDraftPosition([
                      roundCoordinate(nextPosition.lat),
                      roundCoordinate(nextPosition.lng),
                    ]);
                  },
                } : undefined}
              >
                <Popup>
                  <div className="text-sm">
                    <Link
                      to={`/places/${place.id}`}
                      className="font-semibold text-primary-600 hover:underline"
                    >
                      {place.name}
                    </Link>
                    {place.category && (
                      <p className="text-gray-500 text-xs mt-1">{t(`categories.${place.category}`)}</p>
                    )}
                    <p className="text-gray-500 text-xs mt-1">
                      {place.latitude.toFixed(6)}, {place.longitude.toFixed(6)}
                    </p>
                    {canEditPlace(place) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (isEditing) {
                            cancelEditing();
                          } else {
                            startEditing(place);
                          }
                        }}
                        className="mt-3 inline-flex items-center gap-1 rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
                      >
                        <FiEdit2 className="h-3.5 w-3.5" />
                        <span>{isEditing ? t('map.stopEditing') : t('map.editLocation')}</span>
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
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
