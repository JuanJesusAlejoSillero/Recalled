import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import StarRating from '../common/StarRating';
import ImageUploader from '../common/ImageUploader';
import { placesAPI } from '../../services/api';

function ReviewForm({ onSubmit, initialData = null, loading = false }) {
  const [rating, setRating] = useState(initialData?.rating || 0);
  const [photos, setPhotos] = useState([]);
  const [places, setPlaces] = useState([]);
  const [ratingError, setRatingError] = useState('');
  const [isNewPlace, setIsNewPlace] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [placeError, setPlaceError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      place_id: initialData?.place_id ? String(initialData.place_id) : '',
      title: initialData?.title || '',
      comment: initialData?.comment || '',
      visit_date: initialData?.visit_date || '',
    },
  });

  useEffect(() => {
    placesAPI.list({ per_page: 100 }).then(({ data }) => {
      setPlaces(data.places || []);
    });
  }, []);

  const handleFormSubmit = (data) => {
    if (rating === 0) {
      setRatingError('Selecciona una puntuación');
      return;
    }
    setRatingError('');
    setPlaceError('');

    if (isNewPlace) {
      if (!newPlaceName.trim()) {
        setPlaceError('Escribe el nombre del lugar');
        return;
      }
      const { place_id: _, ...rest } = data;
      onSubmit(
        { ...rest, rating, visit_date: data.visit_date || null, place_name: newPlaceName.trim() },
        photos
      );
    } else {
      if (!data.place_id) {
        setPlaceError('Selecciona un lugar');
        return;
      }
      onSubmit(
        { ...data, rating, place_id: parseInt(data.place_id), visit_date: data.visit_date || null },
        photos
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lugar</label>
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
            Lugar existente
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
            Nuevo lugar
          </button>
        </div>
        {isNewPlace ? (
          <input
            type="text"
            value={newPlaceName}
            onChange={(e) => setNewPlaceName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Nombre del nuevo lugar"
          />
        ) : (
          <select
            {...register('place_id')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Selecciona un lugar...</option>
            {places.map((place) => (
              <option key={place.id} value={place.id}>{place.name}</option>
            ))}
          </select>
        )}
        {placeError && <p className="text-red-500 text-xs mt-1">{placeError}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Puntuación</label>
        <StarRating rating={rating} onChange={setRating} size="lg" />
        {ratingError && <p className="text-red-500 text-xs mt-1">{ratingError}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título</label>
        <input
          type="text"
          {...register('title', { maxLength: { value: 200, message: 'Máximo 200 caracteres' } })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Un título para tu review"
        />
        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Comentario</label>
        <textarea
          {...register('comment')}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Cuenta tu experiencia..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha de visita</label>
        <input
          type="date"
          {...register('visit_date')}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fotos</label>
        <ImageUploader onFilesSelected={setPhotos} maxFiles={5} />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
      >
        {loading ? 'Guardando...' : initialData ? 'Actualizar Review' : 'Crear Review'}
      </button>
    </form>
  );
}

export default ReviewForm;
