import { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiSearch } from 'react-icons/fi';
import { placesAPI } from '../services/api';
import PlaceList from '../components/places/PlaceList';
import PlaceForm from '../components/places/PlaceForm';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';

const CATEGORY_KEYS = [
  'restaurant', 'hotel', 'museum', 'park', 'beach',
  'monument', 'shopping', 'nightlife', 'cafe', 'bar', 'other',
];

function PlacesPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const handleFormDirtyChange = useCallback((dirty) => {
    setFormDirty(dirty);
  }, []);

  const toggleForm = () => {
    if (showForm && formDirty) {
      if (!window.confirm(t('reviewForm.unsavedChanges'))) return;
    }
    setShowForm(!showForm);
    if (showForm) setFormDirty(false);
  };

  const loadPlaces = async () => {
    setLoading(true);
    try {
      const params = { page, per_page: 12 };
      if (search) params.search = search;
      if (category) params.category = category;

      const { data } = await placesAPI.list(params);
      setPlaces(data.places || []);
      setTotalPages(data.pages || 1);
    } catch (err) {
      console.error('Error loading places:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPlaces(); }, [page, category]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadPlaces();
  };

  const handleCreatePlace = async (data) => {
    setFormLoading(true);
    try {
      await placesAPI.create(data);
      setShowForm(false);
      loadPlaces();
    } catch (err) {
      alert(err.response?.data?.error || t('places.errorCreate'));
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('places.title')}</h1>
        <button
          onClick={toggleForm}
          className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm font-medium"
        >
          <FiPlus className="w-4 h-4" />
          <span>{showForm ? t('places.cancel') : t('places.newPlace')}</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <PlaceForm onSubmit={handleCreatePlace} loading={formLoading} onCancel={() => { setFormDirty(false); setShowForm(false); }} onDirtyChange={handleFormDirtyChange} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('places.searchPlaceholder')}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <button type="submit" className="ml-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">{t('places.search')}</button>
        </form>
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="">{t('places.allCategories')}</option>
          {CATEGORY_KEYS.map((key) => (
            <option key={key} value={key}>{t(`categories.${key}`)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          <PlaceList places={places} />
          {totalPages > 1 && (
            <div className="flex justify-center space-x-2 pt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-4 py-2 border dark:border-gray-600 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                {t('places.previous')}
              </button>
              <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                {t('places.pageOf', { page, totalPages })}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-4 py-2 border dark:border-gray-600 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                {t('places.next')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PlacesPage;
