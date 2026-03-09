import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiTrendingUp } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import { reviewsAPI, statsAPI } from '../services/api';
import ReviewList from '../components/reviews/ReviewList';
import PlaceList from '../components/places/PlaceList';

function HomePage() {
  const { user } = useAuth();
  const [recentReviews, setRecentReviews] = useState([]);
  const [topPlaces, setTopPlaces] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [reviewsRes, placesRes, statsRes] = await Promise.all([
          reviewsAPI.list({ per_page: 5 }),
          statsAPI.topPlaces(),
          statsAPI.user(user.id),
        ]);
        setRecentReviews(reviewsRes.data.reviews || []);
        setTopPlaces(placesRes.data.places || []);
        setUserStats(statsRes.data.stats || null);
      } catch (err) {
        console.error('Error loading home data:', err);
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) loadData();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome + Quick Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hola, {user?.username}!</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Bienvenido a tu diario de viaje</p>
          </div>
          <Link
            to="/reviews/new"
            className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            <FiPlus className="w-4 h-4" />
            <span>Nueva Review</span>
          </Link>
        </div>

        {userStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{userStats.total_reviews}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Reviews</p>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{userStats.places_visited}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Lugares</p>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{userStats.avg_rating || '-'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Media</p>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{userStats.total_photos}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Fotos</p>
            </div>
          </div>
        )}
      </div>

      {/* Top Places */}
      {topPlaces.length > 0 && (
        <section>
          <div className="flex items-center space-x-2 mb-4">
            <FiTrendingUp className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Lugares mejor valorados</h2>
          </div>
          <PlaceList places={topPlaces.slice(0, 6)} />
        </section>
      )}

      {/* Recent Reviews */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Reviews recientes</h2>
        <ReviewList reviews={recentReviews} emptyMessage="¡Aún no hay reviews. Crea la primera!" />
      </section>
    </div>
  );
}

export default HomePage;
