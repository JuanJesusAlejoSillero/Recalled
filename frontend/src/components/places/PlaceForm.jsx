import { useForm } from 'react-hook-form';

const CATEGORIES = [
  { value: 'restaurant', label: 'Restaurante' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'museum', label: 'Museo' },
  { value: 'park', label: 'Parque' },
  { value: 'beach', label: 'Playa' },
  { value: 'monument', label: 'Monumento' },
  { value: 'shopping', label: 'Tienda' },
  { value: 'nightlife', label: 'Vida nocturna' },
  { value: 'cafe', label: 'Cafetería' },
  { value: 'bar', label: 'Bar' },
  { value: 'other', label: 'Otro' },
];

function PlaceForm({ onSubmit, initialData = null, loading = false, onCancel }) {
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
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del lugar</label>
        <input
          type="text"
          {...register('name', { required: 'El nombre es obligatorio' })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Ej: Torre Eiffel"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dirección</label>
        <input
          type="text"
          {...register('address')}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Ej: Champ de Mars, Paris"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoría</label>
        <select
          {...register('category')}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">Sin categoría</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Latitud</label>
          <input
            type="number"
            step="any"
            {...register('latitude', { valueAsNumber: true })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="-90 a 90"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Longitud</label>
          <input
            type="number"
            step="any"
            {...register('longitude', { valueAsNumber: true })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="-180 a 180"
          />
        </div>
      </div>

      <div className="flex space-x-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'Guardando...' : initialData ? 'Actualizar' : 'Crear Lugar'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

export default PlaceForm;
