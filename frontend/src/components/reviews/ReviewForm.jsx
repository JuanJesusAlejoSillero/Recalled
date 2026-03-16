import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { FiX } from 'react-icons/fi';
import StarRating from '../common/StarRating';
import ImageUploader from '../common/ImageUploader';
import ConfirmDialog from '../common/ConfirmDialog';
import { placesAPI } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { getThumbnailUrl } from '../../utils/helpers';

const CATEGORY_KEYS = [
  'restaurant', 'hotel', 'museum', 'park', 'beach',
  'monument', 'shopping', 'nightlife', 'cafe', 'bar', 'other',
];

function ReviewForm({ onSubmit, initialData = null, loading = false, onDirtyChange }) {
  const { t } = useLanguage();
  const [rating, setRating] = useState(initialData?.rating || 0);
  const [photos, setPhotos] = useState([]);
  const [existingPhotos, setExistingPhotos] = useState(initialData?.photos || []);
  const [photosToDelete, setPhotosToDelete] = useState([]);
  const [places, setPlaces] = useState([]);
  const [ratingError, setRatingError] = useState('');
  const [isNewPlace, setIsNewPlace] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceAddress, setNewPlaceAddress] = useState('');
  const [newPlaceCategory, setNewPlaceCategory] = useState('');
  const [newPlaceLatitude, setNewPlaceLatitude] = useState('');
  const [newPlaceLongitude, setNewPlaceLongitude] = useState('');
  const [newPlaceIsPrivate, setNewPlaceIsPrivate] = useState(false);
  const [placeError, setPlaceError] = useState('');
  const [isPrivate, setIsPrivate] = useState(initialData?.is_private || false);
  const [privacyConfirm, setPrivacyConfirm] = useState(null);

  // Dirty tracking
  const initialSnapshot = useRef(null);
  const hasMounted = useRef(false);

  const preselectedPlaceId = initialData?.place_id ? String(initialData.place_id) : '';

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      place_id: preselectedPlaceId,
      title: initialData?.title || '',
      comment: initialData?.comment || '',
      visit_date: initialData?.visit_date || '',
    },
  });

  const watchedFields = watch();

  // Capture initial snapshot after mount
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      initialSnapshot.current = {
        place_id: preselectedPlaceId,
        title: initialData?.title || '',
        comment: initialData?.comment || '',
        visit_date: initialData?.visit_date || '',
        rating: initialData?.rating || 0,
        isPrivate: initialData?.is_private || false,
        isNewPlace: false,
        newPlaceName: '',
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
      watchedFields.title !== snap.title ||
      watchedFields.comment !== snap.comment ||
      watchedFields.visit_date !== snap.visit_date ||
      watchedFields.place_id !== snap.place_id ||
      rating !== snap.rating ||
      isPrivate !== snap.isPrivate ||
      isNewPlace !== snap.isNewPlace ||
      newPlaceName !== snap.newPlaceName ||
      photos.length !== snap.photosCount ||
      photosToDelete.length !== snap.photosToDeleteCount;
    onDirtyChange(isDirty);
  }, [watchedFields, rating, isPrivate, isNewPlace, newPlaceName, photos, photosToDelete, onDirtyChange]);

  useEffect(() => {
    placesAPI.list({ per_page: 100, sort: 'name' }).then(({ data }) => {
      setPlaces(data.places || []);
    });
  }, []);

  useEffect(() => {
    if (places.length > 0 && preselectedPlaceId) {
      setValue('place_id', preselectedPlaceId);
    }
  }, [places, preselectedPlaceId, setValue]);

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

  const buildSubmitPayload = (data) => {
    if (isNewPlace) {
      const { place_id: _, ...rest } = data;
      const placeFields = {
        place_name: newPlaceName.trim(),
        place_address: newPlaceAddress.trim() || null,
        place_category: newPlaceCategory || null,
        place_latitude: newPlaceLatitude ? parseFloat(newPlaceLatitude) : null,
        place_longitude: newPlaceLongitude ? parseFloat(newPlaceLongitude) : null,
        place_is_private: newPlaceIsPrivate,
      };
      return { ...rest, rating, visit_date: data.visit_date || null, ...placeFields, is_private: isPrivate };
    }
    return { ...data, rating, place_id: parseInt(data.place_id), visit_date: data.visit_date || null, is_private: isPrivate };
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

    const payload = buildSubmitPayload(data);
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

  const inputClass = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white";

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Place selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('reviewForm.place')} <span className="text-red-500">*</span>
        </label>
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
                {t('placeForm.name')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newPlaceName}
                onChange={(e) => setNewPlaceName(e.target.value)}
                className={inputClass}
                placeholder={t('reviewForm.newPlacePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t('placeForm.address')}
              </label>
              <input
                type="text"
                value={newPlaceAddress}
                onChange={(e) => setNewPlaceAddress(e.target.value)}
                className={inputClass}
                placeholder={t('placeForm.addressPlaceholder')}
              />
            </div>
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
          type="date"
          {...register('visit_date')}
          className={inputClass}
        />
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

      {/* Private toggle */}
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="is_private"
          checked={isPrivate}
          onChange={(e) => setIsPrivate(e.target.checked)}
          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
        />
        <label htmlFor="is_private" className="text-sm text-gray-700 dark:text-gray-300">
          {t('reviewForm.private')}
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
      >
        {loading ? t('reviewForm.saving') : initialData ? t('reviewForm.update') : t('reviewForm.create')}
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
