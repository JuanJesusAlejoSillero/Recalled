import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { reviewsAPI } from '../services/api';
import ReviewForm from '../components/reviews/ReviewForm';
import { useLanguage } from '../context/LanguageContext';
import { useNavigationPrompt } from '../hooks/useNavigationPrompt';

function CreateReviewPage() {
  const { id } = useParams(); // for edit mode
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState(null);
  const [pageLoading, setPageLoading] = useState(!!id);
  const [isDirty, setIsDirty] = useState(false);
  const isSubmitting = useRef(false);

  // Pre-select place from URL param
  const preselectedPlace = searchParams.get('place');

  // Navigation guard - intercept all navigation when dirty
  useNavigationPrompt(isDirty && !isSubmitting.current, t('reviewForm.unsavedChanges'));

  useEffect(() => {
    if (id) {
      reviewsAPI.get(id).then(({ data }) => {
        setInitialData(data);
        setPageLoading(false);
      }).catch(() => {
        navigate('/my-reviews');
      });
    } else {
      // Reset when switching from edit to new review
      setInitialData(null);
      setPageLoading(false);
    }
  }, [id, navigate]);

  const handleDirtyChange = useCallback((dirty) => {
    setIsDirty(dirty);
  }, []);

  const handleSubmit = async (data, photos, photosToDelete = []) => {
    setLoading(true);
    isSubmitting.current = true;
    try {
      let reviewId = id;

      if (id) {
        // Update
        await reviewsAPI.update(id, data);

        // Delete photos marked for removal
        for (const photoId of photosToDelete) {
          await reviewsAPI.deletePhoto(id, photoId);
        }
      } else {
        // Create - backend handles place creation atomically if place_name is provided
        const { data: review } = await reviewsAPI.create(data);
        reviewId = review.id;
      }

      // Upload photos one by one to avoid request size limits
      if (photos?.length > 0) {
        const failed = [];
        for (const file of photos) {
          try {
            const formData = new FormData();
            formData.append('photos', file);
            await reviewsAPI.uploadPhotos(reviewId, formData);
          } catch {
            failed.push(file.name);
          }
        }
        if (failed.length > 0) {
          alert(t('reviewPage.somePhotosFailed', { count: failed.length, total: photos.length, names: failed.join(', ') }));
        }
      }

      navigate('/my-reviews');
    } catch (err) {
      isSubmitting.current = false;
      alert(err.response?.data?.error || t('reviewPage.errorSave'));
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const formInitial = id ? initialData : (preselectedPlace ? { place_id: preselectedPlace } : null);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {id ? t('reviewPage.editTitle') : t('reviewPage.newTitle')}
      </h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <ReviewForm
          key={id || 'new'}
          onSubmit={handleSubmit}
          initialData={formInitial}
          loading={loading}
          onDirtyChange={handleDirtyChange}
        />
      </div>
    </div>
  );
}

export default CreateReviewPage;
