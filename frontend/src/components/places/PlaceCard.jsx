import { Link } from 'react-router-dom';
import { FiLock, FiMapPin, FiUser, FiUsers } from 'react-icons/fi';
import StarRating from '../common/StarRating';
import { useLanguage } from '../../context/LanguageContext';

function PlaceCard({ place }) {
  const { t } = useLanguage();
  const visibilityMode = place.visibility_mode || (place.is_private ? 'private' : 'public');
  const VisibilityIcon = visibilityMode === 'shared' ? FiUsers : FiLock;
  const visibilityBadgeClass = visibilityMode === 'shared'
    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';

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
          {place.creator_username && (
            <p className="flex items-center space-x-1 text-xs text-gray-400 dark:text-gray-500 mt-1">
              <FiUser className="w-3 h-3" />
              <span>{place.creator_username}</span>
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {place.category && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 capitalize">
              {t(`categories.${place.category}`)}
            </span>
          )}
          {visibilityMode !== 'public' && (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${visibilityBadgeClass}`}>
              <VisibilityIcon className="h-3 w-3" />
              <span>{t(`visibility.badges.${visibilityMode}`)}</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center space-x-2">
          {place.avg_rating ? (
            <>
              <StarRating rating={Math.round(place.avg_rating)} readonly size="sm" />
              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">{place.avg_rating}</span>
            </>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500">{t('places.noRatings')}</span>
          )}
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {place.review_count} {place.review_count === 1 ? t('places.review') : t('places.reviews')}
        </span>
      </div>
    </Link>
  );
}

export default PlaceCard;
