import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { reviewsAPI } from '../services/api';
import ReviewList from '../components/reviews/ReviewList';

function MyReviewsPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReviews = async () => {
    try {
      const { data } = await reviewsAPI.list({ user_id: user.id, per_page: 50 });
      setReviews(data.reviews || []);
    } catch (err) {
      console.error('Error loading reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) loadReviews();
  }, [user]);

  const handleDelete = async (reviewId) => {
    if (!window.confirm('¿Eliminar esta review?')) return;
    try {
      await reviewsAPI.delete(reviewId);
      setReviews(reviews.filter((r) => r.id !== reviewId));
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar review');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Mis Reviews</h1>
      <ReviewList
        reviews={reviews}
        onDelete={handleDelete}
        emptyMessage="Aún no has escrito ninguna review."
        currentUser={user}
      />
    </div>
  );
}

export default MyReviewsPage;
