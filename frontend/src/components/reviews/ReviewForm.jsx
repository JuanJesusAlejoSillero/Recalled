import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { FiX, FiSearch } from 'react-icons/fi';
import StarRating from '../common/StarRating';
import ImageUploader from '../common/ImageUploader';
import ConfirmDialog from '../common/ConfirmDialog';
import LocationPickerMap from '../common/LocationPickerMap';
import VisibilitySelector from '../common/VisibilitySelector';
import { placesAPI } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import {
  formatDateInputValue,
  getDateInputPlaceholder,
  getThumbnailUrl,
  parseDateInputValue,
} from '../../utils/helpers';
import { getEnabledContentModule, getEnabledContentModules } from '../../config/contentModules';
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

function mergeVisibilityUsers(...groups) {
  const seen = new Set();

  return groups.flat().filter((user) => {
    const normalizedId = Number(user?.id);
    const normalizedUsername = String(user?.username || '').trim();
    if (!Number.isFinite(normalizedId) || !normalizedUsername || seen.has(normalizedId)) {
      return false;
    }

    seen.add(normalizedId);
    return true;
  }).map((user) => ({ id: Number(user.id), username: String(user.username).trim() }));
}

function ReviewForm({
  onSubmit,
  initialData = null,
  contentType = 'place',
  allowContentTypeSelection = false,
  loading = false,
  onDirtyChange,
}) {
  const { t, language } = useLanguage();
  const initialContentType = getEnabledContentModule(initialData?.place_content_type || contentType).contentType;
  const [selectedContentType, setSelectedContentType] = useState(initialContentType);
  const module = getEnabledContentModule(selectedContentType);
  const enabledModules = getEnabledContentModules();
  const supportsLocation = module.hasLocation;
  const supportsCategory = module.hasCategory;
  const detailFields = module.detailFields || [];
  const isEditMode = Boolean(initialData?.id);
  const [rating, setRating] = useState(initialData?.rating || 0);
  const [photos, setPhotos] = useState([]);
  const [existingPhotos, setExistingPhotos] = useState(initialData?.photos || []);
  const [photosToDelete, setPhotosToDelete] = useState([]);
  const [places, setPlaces] = useState([]);
  const [ratingError, setRatingError] = useState('');
  const [isNewPlace, setIsNewPlace] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceDetails, setNewPlaceDetails] = useState(() => createContentDetailsState(module));
  const [newPlaceAddress, setNewPlaceAddress] = useState('');
  const [newPlaceCategory, setNewPlaceCategory] = useState('');
  const [newPlaceLatitude, setNewPlaceLatitude] = useState('');
  const [newPlaceLongitude, setNewPlaceLongitude] = useState('');
  const [newPlaceIsPrivate, setNewPlaceIsPrivate] = useState(false);
  const [newPlaceVisibilityUserIds, setNewPlaceVisibilityUserIds] = useState([]);
  const [newPlaceVisibilityUsers, setNewPlaceVisibilityUsers] = useState([]);
  const [placeError, setPlaceError] = useState('');
  const [isPrivate, setIsPrivate] = useState(initialData?.is_private || false);
  const [visibleUserIds, setVisibleUserIds] = useState(initialData?.visibility_user_ids || []);
  const [reviewVisibilityTouched, setReviewVisibilityTouched] = useState(false);
  const [privacyConfirm, setPrivacyConfirm] = useState(null);
  const [geocodeResults, setGeocodeResults] = useState([]);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeSearched, setGeocodeSearched] = useState(false);
  const [visitDateInput, setVisitDateInput] = useState(() => formatDateInputValue(initialData?.visit_date, language));
  const [visitDateError, setVisitDateError] = useState('');

  // Dirty tracking
  const initialSnapshot = useRef(null);
  const hasMounted = useRef(false);
  const previousLanguage = useRef(language);

  const preselectedPlaceId = initialData?.place_id ? String(initialData.place_id) : '';

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      place_id: preselectedPlaceId,
      title: initialData?.title || '',
      comment: initialData?.comment || '',
    },
  });

  const watchedFields = watch();
  const selectedExistingPlace = !isNewPlace && watchedFields.place_id && places.length > 0
    ? places.find((place) => String(place.id) === String(watchedFields.place_id))
    : null;
  const editingCurrentPlace = Boolean(initialData?.place_id)
    && String(initialData.place_id) === String(selectedExistingPlace?.id);
  const currentPlaceIsPrivate = isNewPlace
    ? newPlaceIsPrivate
    : Boolean(selectedExistingPlace?.is_private ?? (editingCurrentPlace ? initialData?.place_is_private : false));
  const currentPlaceVisibilityUserIds = currentPlaceIsPrivate
    ? (isNewPlace
      ? newPlaceVisibilityUserIds
      : (selectedExistingPlace?.visibility_user_ids
        || (editingCurrentPlace ? initialData?.place_visibility_user_ids : [])
        || []))
    : [];
  const currentPlaceVisibilityUsers = currentPlaceIsPrivate
    ? (isNewPlace
      ? newPlaceVisibilityUsers
      : (selectedExistingPlace?.visibility_users
        || (editingCurrentPlace ? initialData?.place_visibility_users : [])
        || []))
    : [];
  const currentPlaceVisibilitySignature = selectedIdsSignature(currentPlaceVisibilityUserIds);
  const visibleUserIdsSignature = selectedIdsSignature(visibleUserIds);
  const reviewVisibilityOutsidePlaceIds = currentPlaceIsPrivate
    ? visibleUserIds.filter((userId) => !currentPlaceVisibilityUserIds.includes(userId))
    : [];
  const canUseInheritedReviewVisibilityDefaults = Boolean(
    currentPlaceIsPrivate
    && (
      !isEditMode
      || initialData?.inherits_place_visibility
      || !initialData?.is_private
    )
  );
  const shouldUseInheritedReviewVisibility = Boolean(
    isPrivate
    && currentPlaceIsPrivate
    && !reviewVisibilityTouched
    && canUseInheritedReviewVisibilityDefaults
  );
  const reviewVisibilityKnownUsers = mergeVisibilityUsers(
    initialData?.visibility_users || [],
    currentPlaceVisibilityUsers,
  );

  // Capture initial snapshot after mount
  useEffect(() => {
    setSelectedContentType(initialContentType);
  }, [initialContentType]);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      initialSnapshot.current = {
        selectedContentType: initialContentType,
        place_id: preselectedPlaceId,
        title: initialData?.title || '',
        comment: initialData?.comment || '',
        visit_date: formatDateInputValue(initialData?.visit_date, language),
        rating: initialData?.rating || 0,
        isPrivate: initialData?.is_private || false,
        isNewPlace: false,
        newPlaceName: '',
        newPlaceDetailsSignature: contentDetailsStateSignature(module, createContentDetailsState(module)),
        newPlaceAddress: '',
        newPlaceCategory: '',
        newPlaceLatitude: '',
        newPlaceLongitude: '',
        newPlaceIsPrivate: false,
        newPlaceVisibilityUserIds: [],
        visibleUserIds: initialData?.visibility_user_ids || [],
        photosCount: 0,
        photosToDeleteCount: 0,
      };
    }
  }, []);

  // Report dirty state to parent
  useEffect(() => {
    if (!onDirtyChange || !initialSnapshot.current) return;
    const snap = initialSnapshot.current;
    const isDirty =
      selectedContentType !== snap.selectedContentType ||
      watchedFields.title !== snap.title ||
      watchedFields.comment !== snap.comment ||
      visitDateInput !== snap.visit_date ||
      watchedFields.place_id !== snap.place_id ||
      rating !== snap.rating ||
      isPrivate !== snap.isPrivate ||
      isNewPlace !== snap.isNewPlace ||
      newPlaceName !== snap.newPlaceName ||
      contentDetailsStateSignature(module, newPlaceDetails) !== snap.newPlaceDetailsSignature ||
      newPlaceAddress !== snap.newPlaceAddress ||
      newPlaceCategory !== snap.newPlaceCategory ||
      String(newPlaceLatitude) !== String(snap.newPlaceLatitude) ||
      String(newPlaceLongitude) !== String(snap.newPlaceLongitude) ||
      newPlaceIsPrivate !== snap.newPlaceIsPrivate ||
      selectedIdsSignature(newPlaceVisibilityUserIds) !== selectedIdsSignature(snap.newPlaceVisibilityUserIds) ||
      selectedIdsSignature(visibleUserIds) !== selectedIdsSignature(snap.visibleUserIds) ||
      photos.length !== snap.photosCount ||
      photosToDelete.length !== snap.photosToDeleteCount;
    onDirtyChange(isDirty);
  }, [
    selectedContentType,
    watchedFields,
    visitDateInput,
    rating,
    isPrivate,
    isNewPlace,
    newPlaceName,
    newPlaceDetails,
    newPlaceAddress,
    newPlaceCategory,
    newPlaceLatitude,
    newPlaceLongitude,
    newPlaceIsPrivate,
    newPlaceVisibilityUserIds,
    visibleUserIds,
    photos,
    photosToDelete,
    onDirtyChange,
  ]);

  useEffect(() => {
    if (previousLanguage.current === language) {
      return;
    }

    const parsedVisitDate = parseDateInputValue(visitDateInput, previousLanguage.current);
    previousLanguage.current = language;

    if (parsedVisitDate.isValid) {
      setVisitDateInput(parsedVisitDate.displayValue ? formatDateInputValue(parsedVisitDate.isoValue, language) : '');
      setVisitDateError('');
    }

    if (initialSnapshot.current) {
      initialSnapshot.current.visit_date = formatDateInputValue(initialData?.visit_date, language);
    }
  }, [initialData?.visit_date, language]);

  const handleContentTypeChange = (event) => {
    const nextContentType = event.target.value;
    setSelectedContentType(nextContentType);
    setPlaceError('');
    setValue('place_id', '');
    setNewPlaceName('');
    setNewPlaceDetails(createContentDetailsState(nextContentType));
    setNewPlaceAddress('');
    setNewPlaceCategory('');
    setNewPlaceLatitude('');
    setNewPlaceLongitude('');
    setNewPlaceIsPrivate(false);
    setNewPlaceVisibilityUserIds([]);
    setNewPlaceVisibilityUsers([]);
    setGeocodeResults([]);
    setGeocodeSearched(false);
  };

  useEffect(() => {
    placesAPI.list({ per_page: 100, sort: 'name', content_type: module.contentType }).then(({ data }) => {
      setPlaces(data.places || []);
    });
  }, [module.contentType]);

  useEffect(() => {
    if (places.length > 0 && preselectedPlaceId) {
      setValue('place_id', preselectedPlaceId);
    }
  }, [places, preselectedPlaceId, setValue]);

  useEffect(() => {
    if (!shouldUseInheritedReviewVisibility) {
      return;
    }

    if (visibleUserIdsSignature !== currentPlaceVisibilitySignature) {
      setVisibleUserIds(currentPlaceVisibilityUserIds);
    }
  }, [
    currentPlaceVisibilitySignature,
    currentPlaceVisibilityUserIds,
    shouldUseInheritedReviewVisibility,
    visibleUserIdsSignature,
  ]);

  // Auto-mark review as private when a private place is selected
  useEffect(() => {
    if (!isNewPlace && watchedFields.place_id && places.length > 0) {
      const selectedPlace = places.find((p) => String(p.id) === String(watchedFields.place_id));
      if (selectedPlace?.is_private) {
        setIsPrivate(true);
      }
    }
  }, [watchedFields.place_id, places, isNewPlace]);

  // Auto-mark review as private when creating a new private place inline
  useEffect(() => {
    if (isNewPlace && newPlaceIsPrivate) {
      setIsPrivate(true);
    }
  }, [isNewPlace, newPlaceIsPrivate]);

  const handleDeleteExistingPhoto = (photo) => {
    setPhotosToDelete((prev) => [...prev, photo.id]);
    setExistingPhotos((prev) => prev.filter((p) => p.id !== photo.id));
  };

  const handleUndoDeletePhoto = (photoId) => {
    setPhotosToDelete((prev) => prev.filter((id) => id !== photoId));
    const restored = initialData?.photos?.find((p) => p.id === photoId);
    if (restored) setExistingPhotos((prev) => [...prev, restored]);
  };

  const getPlaceIsPrivate = () => {
    if (isNewPlace) return newPlaceIsPrivate;
    if (watchedFields.place_id && places.length > 0) {
      const selectedPlace = places.find((p) => String(p.id) === String(watchedFields.place_id));
      return selectedPlace?.is_private || false;
    }
    return false;
  };

  const handleReviewVisibilityChange = (userIds) => {
    setReviewVisibilityTouched(true);
    setVisibleUserIds(userIds);
  };

  const handleApplyPlaceVisibilityDefaults = () => {
    setReviewVisibilityTouched(true);
    setVisibleUserIds(currentPlaceVisibilityUserIds);
  };

  const handleKeepOnlyPlaceAllowedUsers = () => {
    setReviewVisibilityTouched(true);
    setVisibleUserIds(visibleUserIds.filter((userId) => currentPlaceVisibilityUserIds.includes(userId)));
  };

  const handleVisitDateBlur = () => {
    const parsedVisitDate = parseDateInputValue(visitDateInput, language);

    if (!visitDateInput.trim()) {
      setVisitDateInput('');
      setVisitDateError('');
      return;
    }

    if (!parsedVisitDate.isValid) {
      setVisitDateError(t('reviewForm.visitDateInvalid', { format: getDateInputPlaceholder(language) }));
      return;
    }

    setVisitDateInput(parsedVisitDate.displayValue);
    setVisitDateError('');
  };

  const buildSubmitPayload = (data, visitDateValue) => {
    const includeReviewVisibilityUserIds = isPrivate && !shouldUseInheritedReviewVisibility;

    if (isNewPlace) {
      const { place_id: _, ...rest } = data;
      const placeFields = {
        place_name: newPlaceName.trim(),
        place_content_type: module.contentType,
        place_details: buildContentDetailsPayload(module, newPlaceDetails),
        place_address: supportsLocation ? newPlaceAddress.trim() || null : null,
        place_category: supportsCategory ? newPlaceCategory || null : null,
        place_latitude: supportsLocation && newPlaceLatitude ? parseFloat(newPlaceLatitude) : null,
        place_longitude: supportsLocation && newPlaceLongitude ? parseFloat(newPlaceLongitude) : null,
        place_is_private: newPlaceIsPrivate,
        place_visibility_user_ids: newPlaceIsPrivate ? newPlaceVisibilityUserIds : [],
      };
      return {
        ...rest,
        rating,
        visit_date: visitDateValue,
        ...placeFields,
        is_private: isPrivate,
        ...(includeReviewVisibilityUserIds ? { visibility_user_ids: visibleUserIds } : {}),
      };
    }
    return {
      ...data,
      rating,
      place_id: parseInt(data.place_id),
      visit_date: visitDateValue,
      is_private: isPrivate,
      ...(includeReviewVisibilityUserIds ? { visibility_user_ids: visibleUserIds } : {}),
    };
  };

  const doSubmit = (payload) => {
    onSubmit(payload, photos, photosToDelete);
  };

  const handleFormSubmit = (data) => {
    if (rating === 0) {
      setRatingError(t('reviewForm.ratingRequired'));
      return;
    }
    setRatingError('');
    setPlaceError('');

    const parsedVisitDate = parseDateInputValue(visitDateInput, language);
    if (!parsedVisitDate.isValid) {
      setVisitDateError(t('reviewForm.visitDateInvalid', { format: getDateInputPlaceholder(language) }));
      return;
    }
    setVisitDateError('');

    if (isNewPlace) {
      if (!newPlaceName.trim()) {
        setPlaceError(t('reviewForm.placeNameRequired'));
        return;
      }
    } else {
      if (!data.place_id) {
        setPlaceError(t('reviewForm.selectPlaceRequired'));
        return;
      }
    }

    const payload = buildSubmitPayload(data, parsedVisitDate.isoValue || null);
    const placePrivate = getPlaceIsPrivate();

    // Check privacy mismatch
    if (placePrivate && !isPrivate) {
      setPrivacyConfirm({ message: t('reviewForm.confirmPublicOnPrivatePlace'), payload });
      return;
    }
    if (!placePrivate && isPrivate) {
      setPrivacyConfirm({ message: t('reviewForm.confirmPrivateOnPublicPlace'), payload });
      return;
    }

    doSubmit(payload);
  };

  const handleGeocode = async () => {
    if (!newPlaceAddress?.trim()) return;
    setGeocoding(true);
    setGeocodeResults([]);
    setGeocodeSearched(true);
    try {
      const params = new URLSearchParams({
        q: newPlaceAddress.trim(),
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
    setNewPlaceLatitude(String(parseFloat(result.lat)));
    setNewPlaceLongitude(String(parseFloat(result.lon)));
    setNewPlaceAddress(result.display_name);
    setGeocodeResults([]);
    setGeocodeSearched(false);
  };

  const handleLocationChange = ({ latitude, longitude }) => {
    setNewPlaceLatitude(String(latitude));
    setNewPlaceLongitude(String(longitude));
  };

  const clearLocation = () => {
    setNewPlaceLatitude('');
    setNewPlaceLongitude('');
  };

  const hasInlineLocation = Number.isFinite(Number.parseFloat(newPlaceLatitude))
    && Number.isFinite(Number.parseFloat(newPlaceLongitude));

  const inputClass = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white";

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Place selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('reviewForm.place')} <span className="text-red-500">*</span>
        </label>
        {allowContentTypeSelection && (
          <div className="mb-3">
            <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              {t('reviewForm.contentType')}
            </span>
            <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('reviewForm.contentType')}>
              {enabledModules.map((contentModule) => {
                const isActive = selectedContentType === contentModule.contentType;
                const ModuleIcon = contentModule.icon;

                return (
                  <button
                    key={contentModule.contentType}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleContentTypeChange({ target: { value: contentModule.contentType } })}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'border-primary-500 bg-primary-100 text-primary-700 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-300'
                        : 'border-gray-300 bg-white text-gray-600 hover:border-primary-300 hover:text-primary-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-primary-500 dark:hover:text-primary-300'
                    }`}
                  >
                    <ModuleIcon className="h-4 w-4" />
                    <span>{t(contentModule.titleKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="flex items-center space-x-3 mb-2">
          <button
            type="button"
            onClick={() => { setIsNewPlace(false); setPlaceError(''); }}
            className={`text-sm font-medium px-3 py-1 rounded-full transition-colors ${
              !isNewPlace
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t('reviewForm.existingPlace')}
          </button>
          <button
            type="button"
            onClick={() => { setIsNewPlace(true); setPlaceError(''); }}
            className={`text-sm font-medium px-3 py-1 rounded-full transition-colors ${
              isNewPlace
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t('reviewForm.newPlace')}
          </button>
        </div>
        {isNewPlace ? (
          <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t(module.formNameLabelKey)} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newPlaceName}
                onChange={(e) => setNewPlaceName(e.target.value)}
                className={inputClass}
                placeholder={t(module.formNamePlaceholderKey)}
              />
            </div>
            {detailFields.length > 0 && (
              <div className="space-y-3 border-t border-gray-200 pt-3 dark:border-gray-600">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                  {t('contentDetails.section')}
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {detailFields.map((field) => (
                    <div key={field.key} className={field.fullWidth ? 'md:col-span-2' : ''}>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        {t(`contentDetails.fields.${field.key}`)}
                      </label>
                      <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        step={field.type === 'number' ? '1' : undefined}
                        inputMode={field.type === 'number' ? 'numeric' : undefined}
                        value={newPlaceDetails[field.key] ?? ''}
                        onChange={(event) => setNewPlaceDetails((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))}
                        className={inputClass}
                        placeholder={t(`contentDetails.placeholders.${field.key}`)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {supportsLocation && (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t('placeForm.address')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPlaceAddress}
                    onChange={(e) => setNewPlaceAddress(e.target.value)}
                    className={`flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
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
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t('placeForm.category')}
                </label>
                <select
                  value={newPlaceCategory}
                  onChange={(e) => setNewPlaceCategory(e.target.value)}
                  className={inputClass}
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      {t('placeForm.latitude')}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={newPlaceLatitude}
                      onChange={(e) => setNewPlaceLatitude(e.target.value)}
                      className={inputClass}
                      placeholder={t('placeForm.latitudePlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      {t('placeForm.longitude')}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={newPlaceLongitude}
                      onChange={(e) => setNewPlaceLongitude(e.target.value)}
                      className={inputClass}
                      placeholder={t('placeForm.longitudePlaceholder')}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                      {t('placeForm.location')}
                    </label>
                    {hasInlineLocation && (
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
                    latitude={newPlaceLatitude}
                    longitude={newPlaceLongitude}
                    onChange={handleLocationChange}
                    markerLabel={newPlaceName || t(module.newButtonKey)}
                    hint={t('placeForm.locationHint')}
                    emptyMessage={t('placeForm.locationMissing')}
                    heightClassName="h-64"
                  />
                </div>
              </>
            )}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="new_place_is_private"
                checked={newPlaceIsPrivate}
                onChange={(e) => setNewPlaceIsPrivate(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
              />
              <label htmlFor="new_place_is_private" className="text-sm text-gray-700 dark:text-gray-300">
                {t('placeForm.privatePlace')}
              </label>
            </div>

            {newPlaceIsPrivate && (
              <VisibilitySelector
                selectedUserIds={newPlaceVisibilityUserIds}
                onChange={setNewPlaceVisibilityUserIds}
                onKnownUsersChange={setNewPlaceVisibilityUsers}
                title={t('placeForm.shareWithUsers')}
                description={t('visibility.inlinePlaceDescription')}
              />
            )}
          </div>
        ) : (
          <select
            {...register('place_id')}
            className={inputClass}
          >
            <option value="">{t('reviewForm.selectPlace')}</option>
            {places.map((place) => (
              <option key={place.id} value={place.id}>{place.name}</option>
            ))}
          </select>
        )}
        {placeError && <p className="text-red-500 text-xs mt-1">{placeError}</p>}
      </div>

      {/* Rating */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('reviewForm.rating')} <span className="text-red-500">*</span>
        </label>
        <StarRating rating={rating} onChange={setRating} size="lg" />
        {ratingError && <p className="text-red-500 text-xs mt-1">{ratingError}</p>}
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('reviewForm.titleLabel')}</label>
        <input
          type="text"
          {...register('title', { maxLength: { value: 200, message: t('reviewForm.titleMaxLength') } })}
          className={inputClass}
          placeholder={t('reviewForm.titlePlaceholder')}
        />
        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
      </div>

      {/* Comment */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('reviewForm.comment')}</label>
        <textarea
          {...register('comment')}
          rows={4}
          className={inputClass}
          placeholder={t('reviewForm.commentPlaceholder')}
        />
      </div>

      {/* Visit date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('reviewForm.visitDate')}</label>
        <input
          type="text"
          value={visitDateInput}
          onChange={(event) => {
            setVisitDateInput(event.target.value);
            if (visitDateError) {
              setVisitDateError('');
            }
          }}
          onBlur={handleVisitDateBlur}
          inputMode="numeric"
          autoComplete="off"
          className={inputClass}
          placeholder={getDateInputPlaceholder(language)}
        />
        {visitDateError
          ? <p className="text-red-500 text-xs mt-1">{visitDateError}</p>
          : <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('reviewForm.visitDateFormatHint', { format: getDateInputPlaceholder(language) })}</p>}
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="review_is_private"
            checked={isPrivate}
            onChange={(event) => setIsPrivate(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="review_is_private" className="text-sm text-gray-700 dark:text-gray-300">
            {t('reviewForm.private')}
          </label>
        </div>

        {isPrivate && (
          <div className="space-y-3">
            {currentPlaceIsPrivate && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200">
                <p>{t('reviewForm.placeVisibilityRestrictionNotice')}</p>
              </div>
            )}

            {isEditMode && initialData?.place_visibility_mismatch && currentPlaceIsPrivate && currentPlaceVisibilityUserIds.length > 0 && !reviewVisibilityTouched && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                <p>{t('reviewForm.placeVisibilityMismatchWarning')}</p>
                <button
                  type="button"
                  onClick={handleApplyPlaceVisibilityDefaults}
                  className="mt-2 text-sm font-medium text-primary-700 hover:text-primary-800 dark:text-primary-300 dark:hover:text-primary-200"
                >
                  {t('reviewForm.applyPlaceVisibilityDefaults')}
                </button>
              </div>
            )}

            {currentPlaceIsPrivate && reviewVisibilityOutsidePlaceIds.length > 0 && !reviewVisibilityTouched && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                <p>{t('reviewForm.reviewVisibilityOutsidePlaceWarning')}</p>
                <button
                  type="button"
                  onClick={handleKeepOnlyPlaceAllowedUsers}
                  className="mt-2 text-sm font-medium text-primary-700 hover:text-primary-800 dark:text-primary-300 dark:hover:text-primary-200"
                >
                  {t('reviewForm.keepOnlyPlaceAllowedUsers')}
                </button>
              </div>
            )}

            <VisibilitySelector
              selectedUserIds={visibleUserIds}
              knownUsers={reviewVisibilityKnownUsers}
              allowedUsers={currentPlaceIsPrivate ? currentPlaceVisibilityUsers : null}
              onChange={handleReviewVisibilityChange}
              title={t('reviewForm.shareWithUsers')}
              description={t(currentPlaceIsPrivate ? 'visibility.reviewRestrictedDescription' : 'visibility.reviewDescription')}
            />
          </div>
        )}
      </div>

      {/* Photos */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('reviewForm.photos')}</label>

        {existingPhotos.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('reviewForm.existingPhotos')}</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {existingPhotos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <img
                    src={getThumbnailUrl(photo)}
                    alt={photo.original_filename || 'photo'}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDeleteExistingPhoto(photo); }}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <FiX className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {photosToDelete.length > 0 && (
          <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-xs text-red-600 dark:text-red-400 mb-1">{t('reviewForm.photosMarkedForDeletion', { count: photosToDelete.length })}</p>
            <button
              type="button"
              onClick={() => photosToDelete.forEach(handleUndoDeletePhoto)}
              className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
            >
              {t('reviewForm.undoAllDeletions')}
            </button>
          </div>
        )}

        <ImageUploader onFilesSelected={setPhotos} maxFiles={5 - existingPhotos.length} />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
      >
        {loading ? t('reviewForm.saving') : isEditMode ? t('reviewForm.update') : t('reviewForm.create')}
      </button>

      <ConfirmDialog
        open={!!privacyConfirm}
        message={privacyConfirm?.message || ''}
        confirmLabel={t('reviewForm.confirmSave')}
        cancelLabel={t('placeForm.cancel')}
        onConfirm={() => {
          const payload = privacyConfirm.payload;
          setPrivacyConfirm(null);
          doSubmit(payload);
        }}
        onCancel={() => setPrivacyConfirm(null)}
        variant="primary"
      />
    </form>
  );
}

export default ReviewForm;
