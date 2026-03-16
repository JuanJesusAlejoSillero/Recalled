import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../hooks/useAuth';
import { usersAPI } from '../../services/api';

const CATEGORY_KEYS = [
  'restaurant', 'hotel', 'museum', 'park', 'beach',
  'monument', 'shopping', 'nightlife', 'cafe', 'bar', 'other',
];

function PlaceForm({ onSubmit, initialData = null, loading = false, onCancel }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [isPrivate, setIsPrivate] = useState(initialData?.is_private || false);
  const [owner, setOwner] = useState(initialData?.created_by || '');
  const [users, setUsers] = useState([]);
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: initialData?.name || '',
      address: initialData?.address || '',
      category: initialData?.category || '',
      latitude: initialData?.latitude || '',
      longitude: initialData?.longitude || '',
    },
  });

  // Load users list for admin owner selector
  useEffect(() => {
    if (user?.is_admin && initialData) {
      usersAPI.list().then(({ data }) => {
        setUsers(data.users || data || []);
      }).catch(() => {});
    }
  }, [user?.is_admin, initialData]);

  const onFormSubmit = (data) => {
    const payload = {
      ...data,
      latitude: data.latitude ? parseFloat(data.latitude) : null,
      longitude: data.longitude ? parseFloat(data.longitude) : null,
      category: data.category || null,
      is_private: isPrivate,
    };
    if (user?.is_admin && initialData && owner) {
      payload.created_by = parseInt(owner);
    }
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('placeForm.name')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          {...register('name', { required: t('placeForm.nameRequired') })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder={t('placeForm.namePlaceholder')}
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('placeForm.address')}</label>
        <input
          type="text"
          {...register('address')}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder={t('placeForm.addressPlaceholder')}
        />
      </div>

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
          {loading ? t('placeForm.saving') : initialData ? t('placeForm.update') : t('placeForm.create')}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
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
