import { Link } from 'react-router-dom';
import { FiMapPin } from 'react-icons/fi';
import StarRating from '../common/StarRating';

function PlaceCard({ place }) {
  return (
    <Link
      to={`/places/${place.id}`}
      className="block bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{place.name}</h3>
          {place.address && (
            <p className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400 mt-1">
              <FiMapPin className="w-3.5 h-3.5" />
              <span>{place.address}</span>
            </p>
          )}
        </div>
        {place.category && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 capitalize">
            {place.category}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center space-x-2">
          {place.avg_rating ? (
            <>
              <StarRating rating={Math.round(place.avg_rating)} readonly size="sm" />
              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">{place.avg_rating}</span>
            </>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500">Sin valoraciones</span>
          )}
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {place.review_count} {place.review_count === 1 ? 'review' : 'reviews'}
        </span>
      </div>
    </Link>
  );
}

export default PlaceCard;
