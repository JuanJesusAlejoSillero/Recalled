import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../hooks/useAuth';
import { usersAPI } from '../../services/api';
import { useNavigationPrompt } from '../../hooks/useNavigationPrompt';
import LocationPickerMap from '../common/LocationPickerMap';
import VisibilitySelector from '../common/VisibilitySelector';
import { FiSearch } from 'react-icons/fi';
import { getContentModule } from '../../config/contentModules';
import {
  buildContentDetailsPayload,
  contentDetailsStateSignature,
  createContentDetailsState,
} from '../../utils/contentDetails';

const CATEGORY_KEYS = [
  'restaurant', 'hotel', 'museum', 'park', 'beach',
  'monument', 'shopping', 'nightlife', 'cafe', 'bar', 'other',
];

function selectedIdsSignature(userIds) {
  return [...new Set((userIds || []).map((userId) => Number(userId)).filter(Number.isFinite))]
    .sort((left, right) => left - right)
    .join(',');
}

function PlaceForm({ onSubmit, initialData = null, contentType = 'place', loading = false, onCancel, onDirtyChange }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const module = getContentModule(initialData?.content_type || contentType);
  const supportsLocation = module.hasLocation;
  const supportsCategory = module.hasCategory;
  const detailFields = module.detailFields || [];
  const [detailsState, setDetailsState] = useState(() => createContentDetailsState(module, initialData?.details));
  const [isPrivate, setIsPrivate] = useState(initialData?.is_private || false);
  const [visibleUserIds, setVisibleUserIds] = useState(initialData?.visibility_user_ids || []);
  const [owner, setOwner] = useState(initialData?.created_by || '');
  const [users, setUsers] = useState([]);
  const isSubmitting = useRef(false);
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      name: initialData?.name || '',
      address: initialData?.address || '',
      category: initialData?.category || '',
      latitude: initialData?.latitude ?? '',
      longitude: initialData?.longitude ?? '',
    },
  });

  // Dirty tracking
  const initialSnapshot = useRef({
    name: initialData?.name || '',
    address: initialData?.address || '',
    category: initialData?.category || '',
    latitude: initialData?.latitude ?? '',
    longitude: initialData?.longitude ?? '',
    detailsSignature: contentDetailsStateSignature(module, createContentDetailsState(module, initialData?.details)),
    isPrivate: initialData?.is_private || false,
    visibleUserIds: initialData?.visibility_user_ids || [],
    owner: initialData?.created_by || '',
  });

  const watchedFields = watch();
  const isDirty =
    watchedFields.name !== initialSnapshot.current.name ||
    watchedFields.address !== initialSnapshot.current.address ||
    watchedFields.category !== initialSnapshot.current.category ||
    String(watchedFields.latitude) !== String(initialSnapshot.current.latitude) ||
    String(watchedFields.longitude) !== String(initialSnapshot.current.longitude) ||
    contentDetailsStateSignature(module, detailsState) !== initialSnapshot.current.detailsSignature ||
    isPrivate !== initialSnapshot.current.isPrivate ||
    selectedIdsSignature(visibleUserIds) !== selectedIdsSignature(initialSnapshot.current.visibleUserIds) ||
    String(owner) !== String(initialSnapshot.current.owner);

  useNavigationPrompt(isDirty && !isSubmitting.current, t('reviewForm.unsavedChanges'));

  // Report dirty state to parent
  useEffect(() => {
    if (onDirtyChange) onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  // Load users list for admin owner selector
  useEffect(() => {
    if (user?.is_admin && initialData) {
      usersAPI.list().then(({ data }) => {
        setUsers(data.users || data || []);
      }).catch(() => {});
    }
  }, [user?.is_admin, initialData]);

  // Geocoding state
  const [geocodeResults, setGeocodeResults] = useState([]);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeSearched, setGeocodeSearched] = useState(false);

  const handleGeocode = async () => {
    const address = watch('address');
    if (!address?.trim()) return;

    setGeocoding(true);
    setGeocodeResults([]);
    setGeocodeSearched(true);

    try {
      const params = new URLSearchParams({
        q: address.trim(),
        format: 'json',
        limit: '5',
        addressdetails: '1',
      });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { 'Accept-Language': navigator.language || 'en' },
      });
      const data = await res.json();
      setGeocodeResults(data);
    } catch {
      setGeocodeResults([]);
    } finally {
      setGeocoding(false);
    }
  };

  const selectGeocodeResult = (result) => {
    setValue('latitude', parseFloat(result.lat), { shouldDirty: true });
    setValue('longitude', parseFloat(result.lon), { shouldDirty: true });
    setValue('address', result.display_name, { shouldDirty: true });
    setGeocodeResults([]);
    setGeocodeSearched(false);
  };

  const parseCoordinateValue = (value) => {
    if (value === '' || value === null || value === undefined) {
      return null;
    }

    const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const onFormSubmit = (data) => {
    isSubmitting.current = true;
    const payload = {
      ...data,
      content_type: module.contentType,
      details: buildContentDetailsPayload(module, detailsState),
      address: supportsLocation ? data.address?.trim() || null : null,
      latitude: supportsLocation ? parseCoordinateValue(data.latitude) : null,
      longitude: supportsLocation ? parseCoordinateValue(data.longitude) : null,
      category: supportsCategory ? data.category || null : null,
      is_private: isPrivate,
      visibility_user_ids: isPrivate ? visibleUserIds : [],
    };
    if (user?.is_admin && initialData && owner) {
      payload.created_by = parseInt(owner);
    }
    onSubmit(payload);
  };

  const handleCancel = () => {
    if (isDirty && !window.confirm(t('reviewForm.unsavedChanges'))) return;
    isSubmitting.current = true; // prevent nav guard firing during cancel
    onCancel();
  };

  const handleLocationChange = ({ latitude, longitude }) => {
    setValue('latitude', latitude, { shouldDirty: true, shouldTouch: true });
    setValue('longitude', longitude, { shouldDirty: true, shouldTouch: true });
  };

  const clearLocation = () => {
    setValue('latitude', '', { shouldDirty: true, shouldTouch: true });
    setValue('longitude', '', { shouldDirty: true, shouldTouch: true });
  };

  const hasLocation = Number.isFinite(Number.parseFloat(watchedFields.latitude))
    && Number.isFinite(Number.parseFloat(watchedFields.longitude));

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t(module.formNameLabelKey)} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          {...register('name', { required: t('placeForm.nameRequired') })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder={t(module.formNamePlaceholderKey)}
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>

      {detailFields.length > 0 && (
        <div className="space-y-4 border-t border-gray-200 pt-4 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('contentDetails.section')}</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {detailFields.map((field) => (
              <div key={field.key} className={field.fullWidth ? 'md:col-span-2' : ''}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t(`contentDetails.fields.${field.key}`)}
                </label>
                <input
                  type={field.type === 'number' ? 'number' : 'text'}
                  step={field.type === 'number' ? '1' : undefined}
                  inputMode={field.type === 'number' ? 'numeric' : undefined}
                  value={detailsState[field.key] ?? ''}
                  onChange={(event) => setDetailsState((current) => ({
                    ...current,
                    [field.key]: event.target.value,
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder={t(`contentDetails.placeholders.${field.key}`)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {supportsLocation && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('placeForm.address')}</label>
          <div className="flex gap-2">
            <input
              type="text"
              {...register('address')}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder={t('placeForm.addressPlaceholder')}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleGeocode(); } }}
            />
            <button
              type="button"
              onClick={handleGeocode}
              disabled={geocoding}
              className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-1 shrink-0"
              title={t('placeForm.searchAddress')}
            >
              <FiSearch className="w-4 h-4" />
              <span className="hidden sm:inline">{geocoding ? t('placeForm.searching') : t('placeForm.searchAddress')}</span>
            </button>
          </div>
          {geocodeResults.length > 0 && (
            <ul className="mt-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 shadow-lg max-h-48 overflow-y-auto">
              {geocodeResults.map((result) => (
                <li
                  key={result.place_id}
                  onClick={() => selectGeocodeResult(result)}
                  className="px-3 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-primary-50 dark:hover:bg-gray-600 cursor-pointer border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                >
                  {result.display_name}
                </li>
              ))}
            </ul>
          )}
          {geocodeSearched && !geocoding && geocodeResults.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('placeForm.noResults')}</p>
          )}
          {(geocodeResults.length > 0 || geocodeSearched) && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600 dark:hover:text-gray-300">OpenStreetMap</a> contributors
            </p>
          )}
        </div>
      )}

      {supportsCategory && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('placeForm.category')}</label>
          <select
            {...register('category')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">{t('placeForm.noCategory')}</option>
            {CATEGORY_KEYS.map((key) => (
              <option key={key} value={key}>{t(`categories.${key}`)}</option>
            ))}
          </select>
        </div>
      )}

      {supportsLocation && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('placeForm.latitude')}</label>
              <input
                type="number"
                step="any"
                {...register('latitude', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder={t('placeForm.latitudePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('placeForm.longitude')}</label>
              <input
                type="number"
                step="any"
                {...register('longitude', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder={t('placeForm.longitudePlaceholder')}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('placeForm.location')}
              </label>
              {hasLocation && (
                <button
                  type="button"
                  onClick={clearLocation}
                  className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  {t('placeForm.clearLocation')}
                </button>
              )}
            </div>
            <LocationPickerMap
              latitude={watchedFields.latitude}
              longitude={watchedFields.longitude}
              onChange={handleLocationChange}
              markerLabel={watchedFields.name || t(module.formNameLabelKey)}
              hint={t('placeForm.locationHint')}
              emptyMessage={t('placeForm.locationMissing')}
            />
          </div>
        </>
      )}

      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="place_is_private"
          checked={isPrivate}
          onChange={(e) => setIsPrivate(e.target.checked)}
          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
        />
        <label htmlFor="place_is_private" className="text-sm text-gray-700 dark:text-gray-300">
          {t('placeForm.privatePlace')}
        </label>
      </div>

      {isPrivate && (
        <VisibilitySelector
          selectedUserIds={visibleUserIds}
          knownUsers={initialData?.visibility_users || []}
          onChange={setVisibleUserIds}
          title={t('placeForm.shareWithUsers')}
          description={t('visibility.placeDescription')}
        />
      )}

      {user?.is_admin && initialData && users.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('placeForm.owner')}</label>
          <select
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">{t('placeForm.noOwner')}</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.username}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex space-x-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? t('placeForm.saving') : initialData ? t('placeForm.update') : t(module.createLabelKey)}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {t('placeForm.cancel')}
          </button>
        )}
      </div>
    </form>
  );
}

export default PlaceForm;
