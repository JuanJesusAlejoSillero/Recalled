import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { reviewsAPI } from '../services/api';
import ReviewForm from '../components/reviews/ReviewForm';

function CreateReviewPage() {
  const { id } = useParams(); // for edit mode
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState(null);
  const [pageLoading, setPageLoading] = useState(!!id);

  // Pre-select place from URL param
  const preselectedPlace = searchParams.get('place');

  useEffect(() => {
    if (id) {
      reviewsAPI.get(id).then(({ data }) => {
        setInitialData(data);
        setPageLoading(false);
      }).catch(() => {
        navigate('/my-reviews');
      });
    }
  }, [id, navigate]);

  const handleSubmit = async (data, photos) => {
    setLoading(true);
    try {
      if (id) {
        // Update
        await reviewsAPI.update(id, data);

        // Upload new photos if any
        if (photos?.length > 0) {
          const formData = new FormData();
          photos.forEach((file) => formData.append('photos', file));
          await reviewsAPI.uploadPhotos(id, formData);
        }

        navigate('/my-reviews');
      } else {
        // Create - backend handles place creation atomically if place_name is provided
        const { data: review } = await reviewsAPI.create(data);

        // Upload photos if any
        if (photos?.length > 0) {
          const formData = new FormData();
          photos.forEach((file) => formData.append('photos', file));
          await reviewsAPI.uploadPhotos(review.id, formData);
        }

        navigate('/my-reviews');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Error al guardar review');
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

  const formInitial = initialData || (preselectedPlace ? { place_id: preselectedPlace } : null);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {id ? 'Editar Review' : 'Nueva Review'}
      </h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <ReviewForm
          onSubmit={handleSubmit}
          initialData={formInitial}
          loading={loading}
        />
      </div>
    </div>
  );
}

export default CreateReviewPage;
