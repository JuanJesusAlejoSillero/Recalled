import { useState, useEffect } from 'react';
import { FiPlus, FiSearch } from 'react-icons/fi';
import { placesAPI } from '../services/api';
import PlaceList from '../components/places/PlaceList';
import PlaceForm from '../components/places/PlaceForm';
import { useAuth } from '../hooks/useAuth';

function PlacesPage() {
  const { user } = useAuth();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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
      alert(err.response?.data?.error || 'Error al crear lugar');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lugares</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm font-medium"
        >
          <FiPlus className="w-4 h-4" />
          <span>{showForm ? 'Cancelar' : 'Nuevo Lugar'}</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <PlaceForm onSubmit={handleCreatePlace} loading={formLoading} onCancel={() => setShowForm(false)} />
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
              placeholder="Buscar lugares..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <button type="submit" className="ml-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">Buscar</button>
        </form>
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="">Todas las categorías</option>
          <option value="restaurant">Restaurante</option>
          <option value="hotel">Hotel</option>
          <option value="museum">Museo</option>
          <option value="park">Parque</option>
          <option value="beach">Playa</option>
          <option value="monument">Monumento</option>
          <option value="shopping">Tienda</option>
          <option value="nightlife">Vida nocturna</option>
          <option value="cafe">Cafetería</option>
          <option value="bar">Bar</option>
          <option value="other">Otro</option>
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
                Anterior
              </button>
              <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                P\u00e1gina {page} de {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-4 py-2 border dark:border-gray-600 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PlacesPage;
