import { useForm } from 'react-hook-form';
import { useLanguage } from '../../context/LanguageContext';

const CATEGORY_KEYS = [
  'restaurant', 'hotel', 'museum', 'park', 'beach',
  'monument', 'shopping', 'nightlife', 'cafe', 'bar', 'other',
];

function PlaceForm({ onSubmit, initialData = null, loading = false, onCancel }) {
  const { t } = useLanguage();
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: initialData?.name || '',
      address: initialData?.address || '',
      category: initialData?.category || '',
      latitude: initialData?.latitude || '',
      longitude: initialData?.longitude || '',
    },
  });

  const onFormSubmit = (data) => {
    onSubmit({
      ...data,
      latitude: data.latitude ? parseFloat(data.latitude) : null,
      longitude: data.longitude ? parseFloat(data.longitude) : null,
      category: data.category || null,
    });
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('placeForm.name')}</label>
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
