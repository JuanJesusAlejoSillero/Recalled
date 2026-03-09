import { useState, useEffect } from 'react';
import { FiUsers, FiMapPin, FiStar } from 'react-icons/fi';
import { usersAPI, placesAPI, reviewsAPI } from '../../services/api';

function Dashboard() {
  const [stats, setStats] = useState({ users: 0, places: 0, reviews: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [usersRes, placesRes, reviewsRes] = await Promise.all([
          usersAPI.list({ per_page: 1 }),
          placesAPI.list({ per_page: 1 }),
          reviewsAPI.list({ per_page: 1 }),
        ]);
        setStats({
          users: usersRes.data.total || 0,
          places: placesRes.data.total || 0,
          reviews: reviewsRes.data.total || 0,
        });
      } catch (err) {
        console.error('Error loading stats:', err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const cards = [
    { label: 'Usuarios', value: stats.users, icon: FiUsers, color: 'bg-blue-500' },
    { label: 'Lugares', value: stats.places, icon: FiMapPin, color: 'bg-green-500' },
    { label: 'Reviews', value: stats.reviews, icon: FiStar, color: 'bg-yellow-500' },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Panel de Administración</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div key={card.label} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {loading ? '...' : card.value}
                </p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
