import ReviewCard from './ReviewCard';
import { useLanguage } from '../../context/LanguageContext';

function ReviewList({ reviews, onDelete, showPlace = true, emptyMessage, currentUser = null }) {
  const { t } = useLanguage();
  const message = emptyMessage || t('reviewPage.noReviews');

  if (!reviews?.length) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p>{message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          onDelete={onDelete}
          showPlace={showPlace}
          currentUser={currentUser}
        />
      ))}
    </div>
  );
}

export default ReviewList;
