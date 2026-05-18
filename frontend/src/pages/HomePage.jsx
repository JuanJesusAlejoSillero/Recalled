import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiChevronDown, FiPlus, FiStar, FiTrendingUp } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import { reviewsAPI, statsAPI } from '../services/api';
import ReviewList from '../components/reviews/ReviewList';
import PlaceList from '../components/places/PlaceList';
import { useLanguage } from '../context/LanguageContext';
import { getContentListPath, getEnabledContentModules, getEnabledReviewableContentModules } from '../config/contentModules';

function HomePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [recentReviews, setRecentReviews] = useState([]);
  const [topPlaces, setTopPlaces] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const enabledModules = getEnabledContentModules();
  const peopleModule = enabledModules.find((module) => module.contentType === 'person');
  const hasExtraModules = enabledModules.some((module) => module.contentType !== 'place');
  const hasReviewableModules = getEnabledReviewableContentModules().length > 0;
  const hasCreateOptions = hasReviewableModules || Boolean(peopleModule);

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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('home.greeting', { username: user?.username })}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{t('home.subtitle')}</p>
          </div>
          {hasCreateOptions && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setCreateMenuOpen((open) => !open)}
                className="flex items-center space-x-2 whitespace-nowrap bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
              >
                <FiPlus className="w-4 h-4" />
                <span>{t('common.newItem')}</span>
                <FiChevronDown className={`w-4 h-4 transition-transform ${createMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {createMenuOpen && (
                <div className="absolute right-0 z-10 mt-2 w-56 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  {hasReviewableModules && (
                    <Link
                      to="/reviews/new"
                      onClick={() => setCreateMenuOpen(false)}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-primary-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-primary-400"
                    >
                      <FiStar className="h-4 w-4" />
                      <span>{t('common.newReview')}</span>
                    </Link>
                  )}
                  {peopleModule && (
                    <Link
                      to={`${getContentListPath(peopleModule.contentType)}?create=1`}
                      onClick={() => setCreateMenuOpen(false)}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-primary-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-primary-400"
                    >
                      <peopleModule.icon className="h-4 w-4" />
                      <span>{t(peopleModule.newButtonKey)}</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {userStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{userStats.total_reviews}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Reviews</p>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{userStats.reviewed_items ?? userStats.places_visited}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t(hasExtraModules ? 'home.stats.items' : 'home.stats.places')}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{userStats.avg_rating || '-'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('home.stats.average')}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{userStats.total_photos}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('home.stats.photos')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Top Places */}
      {topPlaces.length > 0 && (
        <section>
          <div className="flex items-center space-x-2 mb-4">
            <FiTrendingUp className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t(hasExtraModules ? 'home.topContent' : 'home.topPlaces')}</h2>
          </div>
          <PlaceList places={topPlaces.slice(0, 6)} />
        </section>
      )}

      {/* Recent Reviews */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('home.recentReviews')}</h2>
        <ReviewList reviews={recentReviews} emptyMessage={t('home.noReviews')} />
      </section>
    </div>
  );
}

export default HomePage;
