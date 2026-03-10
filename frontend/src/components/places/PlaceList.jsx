import PlaceCard from './PlaceCard';
import { useLanguage } from '../../context/LanguageContext';

function PlaceList({ places, emptyMessage }) {
  const { t } = useLanguage();
  const message = emptyMessage || t('places.noPlaces');

  if (!places?.length) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p>{message}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {places.map((place) => (
        <PlaceCard key={place.id} place={place} />
      ))}
    </div>
  );
}

export default PlaceList;
