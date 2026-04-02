import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import Supercluster from 'supercluster';
import { FiCheck, FiCrosshair, FiEdit2, FiExternalLink, FiMapPin, FiSearch, FiX } from 'react-icons/fi';
import { placesAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../hooks/useAuth';
import { ensureLeafletDefaultIcon } from '../utils/leafletIcons';
import 'leaflet/dist/leaflet.css';

ensureLeafletDefaultIcon();

const DEFAULT_CENTER = [20, 0];
const DEFAULT_ZOOM = 2;
const EDIT_ZOOM = 13;
const CLUSTER_RADIUS = 60;
const CLUSTER_MAX_ZOOM = 16;
const FOCUS_ZOOM = CLUSTER_MAX_ZOOM + 1;
const WORLD_BOUNDS = [-180, -85, 180, 85];
const CATEGORY_KEYS = [
  'restaurant', 'hotel', 'museum', 'park', 'beach',
  'monument', 'shopping', 'nightlife', 'cafe', 'bar', 'other',
];

function roundCoordinate(value) {
  return Number.parseFloat(value.toFixed(6));
}

function buildClusterIcon(pointCount) {
  const size = pointCount < 10 ? 36 : pointCount < 50 ? 44 : 52;
  const fontSize = pointCount < 10 ? 13 : 14;
  const background = pointCount < 10 ? '#2563eb' : pointCount < 50 ? '#1d4ed8' : '#1e3a8a';

  return L.divIcon({
    html: `
      <div style="
        width:${size}px;
        height:${size}px;
        border-radius:9999px;
        background:${background};
        color:white;
        display:flex;
        align-items:center;
        justify-content:center;
        font-weight:700;
        font-size:${fontSize}px;
        border:3px solid rgba(255,255,255,0.9);
        box-shadow:0 10px 24px rgba(15,23,42,0.28);
      ">${pointCount}</div>
    `,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function getBoundsArray(map) {
  const bounds = map.getBounds();
  return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
}

function FitBounds({ places, activePosition, activeZoom }) {
  const map = useMap();

  useEffect(() => {
    if (activePosition) {
      map.setView(activePosition, activeZoom ?? Math.max(map.getZoom(), EDIT_ZOOM), { animate: true });
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
  }, [map, places, activePosition, activeZoom]);

  return null;
}

function MapViewportTracker({ onChange }) {
  const map = useMapEvents({
    moveend() {
      onChange({ bounds: getBoundsArray(map), zoom: map.getZoom() });
    },
    zoomend() {
      onChange({ bounds: getBoundsArray(map), zoom: map.getZoom() });
    },
  });

  useEffect(() => {
    onChange({ bounds: getBoundsArray(map), zoom: map.getZoom() });
  }, [map, onChange]);

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

function PlaceMarker({
  place,
  isFocused,
  isEditing,
  canEdit,
  onFocus,
  onStartEditing,
  onCancelEditing,
  onDraftPositionChange,
  shouldOpenPopup,
  onPopupOpened,
  t,
}) {
  const markerRef = useRef(null);

  useEffect(() => {
    if (!shouldOpenPopup || !markerRef.current) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      markerRef.current?.openPopup();
      onPopupOpened?.(place.id);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [shouldOpenPopup, onPopupOpened, place.id]);

  return (
    <Marker
      ref={markerRef}
      position={[place.latitude, place.longitude]}
      draggable={isEditing}
      zIndexOffset={isFocused ? 1000 : 0}
      eventHandlers={{
        click() {
          onFocus(place, { openPopup: false, zoom: null });
        },
        ...(isEditing ? {
          dragend(event) {
            const nextPosition = event.target.getLatLng();
            onDraftPositionChange([
              roundCoordinate(nextPosition.lat),
              roundCoordinate(nextPosition.lng),
            ]);
          },
        } : {}),
      }}
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
          {place.address && (
            <p className="text-gray-500 text-xs mt-1 max-w-56">{place.address}</p>
          )}
          <p className="text-gray-500 text-xs mt-1">
            {place.latitude.toFixed(6)}, {place.longitude.toFixed(6)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to={`/places/${place.id}`}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <FiExternalLink className="h-3.5 w-3.5" />
              <span>{t('map.openDetail')}</span>
            </Link>
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  if (isEditing) {
                    onCancelEditing();
                  } else {
                    onStartEditing(place);
                  }
                }}
                className="inline-flex items-center gap-1 rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
              >
                <FiEdit2 className="h-3.5 w-3.5" />
                <span>{isEditing ? t('map.stopEditing') : t('map.editLocation')}</span>
              </button>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

function ClusteredMarkerLayer({
  clusters,
  clusterIndex,
  placeById,
  focusedPlaceId,
  canEditPlace,
  onFocusPlace,
  onStartEditing,
  onCancelEditing,
  onDraftPositionChange,
  pendingPopupPlaceId,
  onPopupOpened,
  t,
}) {
  const map = useMap();

  return (
    <>
      {clusters.map((feature) => {
        const [longitude, latitude] = feature.geometry.coordinates;
        const properties = feature.properties || {};

        if (properties.cluster) {
          const clusterId = properties.cluster_id;
          const pointCount = properties.point_count || 0;

          return (
            <Marker
              key={`cluster-${clusterId}`}
              position={[latitude, longitude]}
              icon={buildClusterIcon(pointCount)}
              eventHandlers={{
                click() {
                  map.setView(
                    [latitude, longitude],
                    Math.min(clusterIndex.getClusterExpansionZoom(clusterId), FOCUS_ZOOM),
                    { animate: true },
                  );
                },
              }}
            />
          );
        }

        const place = placeById.get(properties.placeId);
        if (!place) {
          return null;
        }

        return (
          <PlaceMarker
            key={place.id}
            place={place}
            isFocused={place.id === focusedPlaceId}
            isEditing={false}
            canEdit={canEditPlace(place)}
            onFocus={onFocusPlace}
            onStartEditing={onStartEditing}
            onCancelEditing={onCancelEditing}
            onDraftPositionChange={onDraftPositionChange}
            shouldOpenPopup={pendingPopupPlaceId === place.id}
            onPopupOpened={onPopupOpened}
            t={t}
          />
        );
      })}
    </>
  );
}

function MapPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [focusedPlaceId, setFocusedPlaceId] = useState(null);
  const [editingPlaceId, setEditingPlaceId] = useState(null);
  const [draftPosition, setDraftPosition] = useState(null);
  const [focusZoom, setFocusZoom] = useState(null);
  const [pendingPopupPlaceId, setPendingPopupPlaceId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [mapViewport, setMapViewport] = useState(null);
  const [feedback, setFeedback] = useState({ error: '', success: '' });

  const search = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const editableOnly = searchParams.get('editable') === '1';

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

  const filteredPlaces = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return displayedPlaces.filter((place) => {
      if (place.id !== editingPlaceId) {
        if (editableOnly && !canEditPlace(place)) {
          return false;
        }

        if (category && place.category !== category) {
          return false;
        }

        if (normalizedSearch) {
          const haystack = [
            place.name,
            place.address,
            place.category,
            place.creator_username,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          if (!haystack.includes(normalizedSearch)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [displayedPlaces, search, category, editableOnly, editingPlaceId]);

  const editingPlace = displayedPlaces.find((place) => place.id === editingPlaceId) || null;

  const focusedPlace = filteredPlaces.find((place) => place.id === focusedPlaceId)
    || (editingPlace && editingPlace.id === focusedPlaceId ? editingPlace : null)
    || null;

  const activePosition = useMemo(() => {
    if (draftPosition) {
      return draftPosition;
    }

    if (focusedPlace) {
      return [focusedPlace.latitude, focusedPlace.longitude];
    }

    return null;
  }, [draftPosition, focusedPlace]);

  const clusteredSourcePlaces = useMemo(() => (
    filteredPlaces.filter((place) => place.id !== editingPlaceId)
  ), [filteredPlaces, editingPlaceId]);

  const placeById = useMemo(() => (
    new Map(filteredPlaces.map((place) => [place.id, place]))
  ), [filteredPlaces]);

  const clusterIndex = useMemo(() => {
    if (clusteredSourcePlaces.length === 0) {
      return null;
    }

    const index = new Supercluster({
      radius: CLUSTER_RADIUS,
      maxZoom: CLUSTER_MAX_ZOOM,
    });

    index.load(
      clusteredSourcePlaces.map((place) => ({
        type: 'Feature',
        properties: { placeId: place.id },
        geometry: {
          type: 'Point',
          coordinates: [place.longitude, place.latitude],
        },
      }))
    );

    return index;
  }, [clusteredSourcePlaces]);

  const clusters = useMemo(() => {
    if (!clusterIndex) {
      return [];
    }

    return clusterIndex.getClusters(
      mapViewport?.bounds || WORLD_BOUNDS,
      Math.round(mapViewport?.zoom || DEFAULT_ZOOM)
    );
  }, [clusterIndex, mapViewport]);

  useEffect(() => {
    if (filteredPlaces.length === 0) {
      setFocusedPlaceId(null);
      setFocusZoom(null);
      setPendingPopupPlaceId(null);
      return;
    }

    if (focusedPlaceId && filteredPlaces.some((place) => place.id === focusedPlaceId)) {
      return;
    }

    setFocusedPlaceId(null);
    setFocusZoom(null);
  }, [filteredPlaces, focusedPlaceId]);

  useEffect(() => {
    if (!pendingPopupPlaceId) {
      return;
    }

    if (filteredPlaces.some((place) => place.id === pendingPopupPlaceId)) {
      return;
    }

    if (editingPlace && editingPlace.id === pendingPopupPlaceId) {
      return;
    }

    setPendingPopupPlaceId(null);
  }, [filteredPlaces, editingPlace, pendingPopupPlaceId]);

  const handlePopupOpened = (placeId) => {
    setPendingPopupPlaceId((currentPlaceId) => (currentPlaceId === placeId ? null : currentPlaceId));
    setFocusZoom(null);
  };

  const startEditing = (place) => {
    if (!canEditPlace(place)) {
      return;
    }

    setFocusedPlaceId(place.id);
    setPendingPopupPlaceId(place.id);
    setFocusZoom(FOCUS_ZOOM);
    setEditingPlaceId(place.id);
    setDraftPosition([place.latitude, place.longitude]);
    setFeedback({ error: '', success: '' });
  };

  const cancelEditing = () => {
    setEditingPlaceId(null);
    setDraftPosition(null);
    setFocusZoom(null);
    setPendingPopupPlaceId(null);
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
      setFocusedPlaceId(updatedPlace.id);
      setPendingPopupPlaceId(updatedPlace.id);
      setFocusZoom(FOCUS_ZOOM);
      setEditingPlaceId(updatedPlace.id);
      setDraftPosition([updatedPlace.latitude, updatedPlace.longitude]);
      setFeedback({ error: '', success: t('map.locationSaved') });
    } catch (err) {
      setFeedback({ error: err.response?.data?.error || t('map.saveError'), success: '' });
    } finally {
      setSaving(false);
    }
  };

  const updateMapFilters = (updates) => {
    const nextParams = new URLSearchParams(searchParams);

    if (Object.prototype.hasOwnProperty.call(updates, 'q')) {
      const nextValue = updates.q ?? '';
      if (nextValue) {
        nextParams.set('q', nextValue);
      } else {
        nextParams.delete('q');
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'category')) {
      const nextValue = updates.category ?? '';
      if (nextValue) {
        nextParams.set('category', nextValue);
      } else {
        nextParams.delete('category');
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'editable')) {
      if (updates.editable) {
        nextParams.set('editable', '1');
      } else {
        nextParams.delete('editable');
      }
    }

    setSearchParams(nextParams, { replace: true });
  };

  const resetFilters = () => {
    updateMapFilters({ q: '', category: '', editable: false });
  };

  const focusPlace = (place, options = {}) => {
    const {
      openPopup = true,
      zoom = FOCUS_ZOOM,
    } = options;

    setFocusedPlaceId(place.id);
    setFocusZoom(zoom);
    setPendingPopupPlaceId(openPopup ? place.id : null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const activeZoom = focusZoom ?? (draftPosition ? Math.max(EDIT_ZOOM, DEFAULT_ZOOM) : null);

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('map.title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {t('map.subtitle', { count: filteredPlaces.length })}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {t('map.instructions')}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_220px_auto]">
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(event) => updateMapFilters({ q: event.target.value })}
              placeholder={t('map.searchPlaceholder')}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>
          <select
            value={category}
            onChange={(event) => updateMapFilters({ category: event.target.value })}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          >
            <option value="">{t('map.allCategories')}</option>
            {CATEGORY_KEYS.map((key) => (
              <option key={key} value={key}>{t(`categories.${key}`)}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {t('map.resetFilters')}
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={editableOnly}
              onChange={(event) => updateMapFilters({ editable: event.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600"
            />
            <span>{t('map.onlyEditable')}</span>
          </label>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('map.filteredResults', { count: filteredPlaces.length, total: places.length })}
          </p>
        </div>
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

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
        <aside className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 xl:sticky xl:top-24">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t('map.resultsTitle')}
            </h2>
          </div>
          {filteredPlaces.length === 0 ? (
            <p className="px-4 py-5 text-sm text-gray-500 dark:text-gray-400">
              {t('map.noFilteredPlaces')}
            </p>
          ) : (
            <div className="max-h-[70vh] divide-y divide-gray-200 overflow-y-auto dark:divide-gray-700">
              {filteredPlaces.map((place) => {
                const isFocused = place.id === focusedPlaceId;
                const isEditing = place.id === editingPlaceId;

                return (
                  <div
                    key={place.id}
                    className={`space-y-3 px-4 py-4 ${isFocused ? 'bg-primary-50/70 dark:bg-primary-900/10' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <button
                          type="button"
                          onClick={() => focusPlace(place, { openPopup: true, zoom: FOCUS_ZOOM })}
                          className="text-left text-sm font-semibold text-gray-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400"
                        >
                          {place.name}
                        </button>
                        {place.category && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {t(`categories.${place.category}`)}
                          </p>
                        )}
                        {place.address && (
                          <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                            {place.address}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 rounded-full bg-gray-100 p-2 text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                        <FiMapPin className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => focusPlace(place, { openPopup: true, zoom: FOCUS_ZOOM })}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <FiCrosshair className="h-3.5 w-3.5" />
                        <span>{t('map.focusPlace')}</span>
                      </button>
                      <Link
                        to={`/places/${place.id}`}
                        className="inline-flex items-center gap-1 rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
                      >
                        <FiExternalLink className="h-3.5 w-3.5" />
                        <span>{t('map.openDetail')}</span>
                      </Link>
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
                          className="inline-flex items-center gap-1 rounded-md border border-primary-300 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-50 dark:border-primary-700 dark:text-primary-300 dark:hover:bg-primary-900/20"
                        >
                          <FiEdit2 className="h-3.5 w-3.5" />
                          <span>{isEditing ? t('map.stopEditing') : t('map.editLocation')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>

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
            <FitBounds places={filteredPlaces} activePosition={activePosition} activeZoom={activeZoom} />
            <MapViewportTracker onChange={setMapViewport} />
            <MapClickHandler enabled={Boolean(editingPlaceId)} onSelect={setDraftPosition} />
            <ClusteredMarkerLayer
              clusters={clusters}
              clusterIndex={clusterIndex}
              placeById={placeById}
              focusedPlaceId={focusedPlaceId}
              canEditPlace={canEditPlace}
              onFocusPlace={focusPlace}
              onStartEditing={startEditing}
              onCancelEditing={cancelEditing}
              onDraftPositionChange={setDraftPosition}
              pendingPopupPlaceId={pendingPopupPlaceId}
              onPopupOpened={handlePopupOpened}
              t={t}
            />
            {editingPlace && (
              <PlaceMarker
                place={editingPlace}
                isFocused={editingPlace.id === focusedPlaceId}
                isEditing={true}
                canEdit={canEditPlace(editingPlace)}
                onFocus={focusPlace}
                onStartEditing={startEditing}
                onCancelEditing={cancelEditing}
                onDraftPositionChange={setDraftPosition}
                shouldOpenPopup={pendingPopupPlaceId === editingPlace.id}
                onPopupOpened={handlePopupOpened}
                t={t}
              />
            )}
          </MapContainer>
        </div>
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
