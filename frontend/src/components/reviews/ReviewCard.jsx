import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMapPin, FiX, FiChevronLeft, FiChevronRight, FiLock } from 'react-icons/fi';
import StarRating from '../common/StarRating';
import { formatDate, truncate } from '../../utils/helpers';
import { useLanguage } from '../../context/LanguageContext';

function ReviewCard({ review, onDelete, showPlace = true, currentUser = null }) {
  const { t, language } = useLanguage();
  const locale = language === 'es' ? 'es-ES' : 'en-US';
  const [lightbox, setLightbox] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const isOwner = currentUser && review.user_id === currentUser.id;
  const isAdmin = currentUser?.is_admin;

  const openLightbox = (index) => setLightbox(index);
  const closeLightbox = () => setLightbox(null);
  const prevPhoto = () => setLightbox((i) => (i > 0 ? i - 1 : review.photos.length - 1));
  const nextPhoto = () => setLightbox((i) => (i < review.photos.length - 1 ? i + 1 : 0));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {showPlace && review.place_name && (
            <Link
              to={`/places/${review.place_id}`}
              className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700 mb-1"
            >
              <FiMapPin className="w-3.5 h-3.5" />
              <span>{review.place_name}</span>
            </Link>
          )}
          {review.title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{review.title}</h3>
          )}
          <div className="flex items-center space-x-3 mt-1">
            <StarRating rating={review.rating} readonly size="sm" />
            <span className="text-xs text-gray-500 dark:text-gray-400">{t('reviewCard.by')} {review.author}</span>
            {review.is_private && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                <FiLock className="w-3 h-3" />
                <span>{t('reviewCard.private')}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {review.comment && (
        <div className="mt-3">
          <p className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-line">
            {expanded ? review.comment : truncate(review.comment, 200)}
          </p>
          {review.comment.length > 200 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-primary-600 dark:text-primary-400 text-xs font-medium mt-1 hover:underline"
            >
              {expanded ? t('reviewCard.showLess') : t('reviewCard.showMore')}
            </button>
          )}
        </div>
      )}

      {review.photos?.length > 0 && (
        <div className="flex space-x-2 mt-3 overflow-x-auto">
          {review.photos.slice(0, 4).map((photo, index) => (
            <img
              key={photo.id}
              src={photo.url}
              alt={photo.original_filename}
              onClick={() => openLightbox(index)}
              className="w-20 h-20 object-cover rounded-lg flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
              loading="lazy"
            />
          ))}
          {review.photos.length > 4 && (
            <div
              onClick={() => openLightbox(4)}
              className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 flex-shrink-0 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              +{review.photos.length - 4}
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && review.photos?.length > 0 && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
          >
            <FiX className="w-8 h-8" />
          </button>

          {review.photos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                className="absolute left-4 text-white hover:text-gray-300"
              >
                <FiChevronLeft className="w-10 h-10" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                className="absolute right-4 text-white hover:text-gray-300"
              >
                <FiChevronRight className="w-10 h-10" />
              </button>
            </>
          )}

          <img
            src={review.photos[lightbox].url}
            alt={review.photos[lightbox].original_filename}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {review.visit_date ? t('reviewCard.visited', { date: formatDate(review.visit_date, locale) }) : formatDate(review.created_at, locale)}
        </span>
        {onDelete && (isOwner || isAdmin) && (
          <div className="flex space-x-2">
            {isOwner && (
              <Link
                to={`/reviews/${review.id}/edit`}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                {t('reviewCard.edit')}
              </Link>
            )}
            <button
              onClick={() => onDelete(review.id)}
              className="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              {t('reviewCard.delete')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReviewCard;
