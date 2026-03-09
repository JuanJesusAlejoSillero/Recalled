import ReviewCard from './ReviewCard';

function ReviewList({ reviews, onDelete, showPlace = true, emptyMessage = 'No hay reviews todavía.', currentUser = null }) {
  if (!reviews?.length) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p>{emptyMessage}</p>
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
