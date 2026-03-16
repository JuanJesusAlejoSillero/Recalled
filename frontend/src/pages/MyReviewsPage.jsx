import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { reviewsAPI, placesAPI } from '../services/api';
import ReviewList from '../components/reviews/ReviewList';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useLanguage } from '../context/LanguageContext';

function MyReviewsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orphanedDialog, setOrphanedDialog] = useState(null);

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
    if (!window.confirm(t('reviewPage.confirmDelete'))) return;
    try {
      const { data: result } = await reviewsAPI.delete(reviewId);
      setReviews(reviews.filter((r) => r.id !== reviewId));

      // Handle orphaned place (no reviews left)
      if (result.orphaned_place?.can_delete) {
        setOrphanedDialog(result.orphaned_place);
      }
    } catch (err) {
      alert(err.response?.data?.error || t('reviewPage.errorDelete'));
    }
  };

  const handleOrphanedDelete = async () => {
    try {
      await placesAPI.delete(orphanedDialog.id);
    } catch (err) {
      alert(err.response?.data?.error || t('places.errorDelete'));
    }
    setOrphanedDialog(null);
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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('reviewPage.title')}</h1>
      <ReviewList
        reviews={reviews}
        onDelete={handleDelete}
        emptyMessage={t('reviewPage.noReviews')}
        currentUser={user}
      />
      <ConfirmDialog
        open={!!orphanedDialog}
        message={orphanedDialog ? t('reviewPage.orphanedPlaceMessage', { name: orphanedDialog.name }) : ''}
        confirmLabel={t('reviewPage.orphanedPlaceDelete')}
        cancelLabel={t('reviewPage.orphanedPlaceKeep')}
        onConfirm={handleOrphanedDelete}
        onCancel={() => setOrphanedDialog(null)}
      />
    </div>
  );
}

export default MyReviewsPage;
