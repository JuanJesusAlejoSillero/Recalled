import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FiMapPin, FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { placesAPI, reviewsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import StarRating from '../components/common/StarRating';
import ReviewList from '../components/reviews/ReviewList';
import PlaceForm from '../components/places/PlaceForm';

function PlaceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [place, setPlace] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    const loadPlace = async () => {
      try {
        const { data } = await placesAPI.get(id);
        setPlace(data);
        setReviews(data.reviews || []);
      } catch (err) {
        console.error('Error loading place:', err);
      } finally {
        setLoading(false);
      }
    };
    loadPlace();
  }, [id]);

  const handleUpdate = async (data) => {
    setEditLoading(true);
    try {
      const { data: updated } = await placesAPI.update(id, data);
      setPlace(updated);
      setEditing(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Error al actualizar lugar');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar "${place.name}" y todas sus reviews?`)) return;
    try {
      await placesAPI.delete(id);
      navigate('/places');
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar lugar');
    }
  };

  const handleDeleteReview = async (reviewId) => {
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

  if (!place) {
    return <div className="text-center py-12 text-gray-500 dark:text-gray-400">Lugar no encontrado</div>;
  }

  return (
    <div className="space-y-6">
      {/* Place Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {editing ? (
          <PlaceForm
            initialData={place}
            onSubmit={handleUpdate}
            loading={editLoading}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{place.name}</h1>
              {place.address && (
                <p className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 mt-1">
                  <FiMapPin className="w-4 h-4" />
                  <span>{place.address}</span>
                </p>
              )}
              <div className="flex items-center space-x-3 mt-3">
                {place.avg_rating ? (
                  <>
                    <StarRating rating={Math.round(place.avg_rating)} readonly />
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">{place.avg_rating}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">({place.review_count} reviews)</span>
                  </>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500">Sin valoraciones todavía</span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end space-y-2">
              {place.category && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 capitalize">
                  {place.category}
                </span>
              )}
              <Link
                to={`/reviews/new?place=${place.id}`}
                className="flex items-center space-x-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm"
              >
                <FiPlus className="w-4 h-4" />
                <span>Escribir Review</span>
              </Link>
              {user?.is_admin && (
                <div className="flex space-x-3">
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    <FiEdit2 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Reviews */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Reviews ({reviews.length})
        </h2>
        <ReviewList
          reviews={reviews}
          showPlace={false}
          emptyMessage="¡Sé el primero en escribir una review!"
          onDelete={user?.is_admin ? handleDeleteReview : undefined}
          currentUser={user}
        />
      </section>
    </div>
  );
}

export default PlaceDetailPage;
