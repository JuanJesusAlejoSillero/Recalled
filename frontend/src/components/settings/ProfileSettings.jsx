import { useState } from 'react';
import { FiUser } from 'react-icons/fi';
import { usersAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';

function ProfileSettings() {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const updates = {};
    if (username !== user.username) updates.username = username;
    if (email !== user.email) updates.email = email;

    if (Object.keys(updates).length === 0) return;

    setLoading(true);
    try {
      const { data } = await usersAPI.update(user.id, updates);
      updateUser(data);
      setSuccess(t('settings.profile.success'));
    } catch (err) {
      setError(err.response?.data?.error || t('settings.profile.error'));
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = username !== user?.username || email !== user?.email;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <FiUser className="w-6 h-6 text-primary-600 dark:text-primary-400" />
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.profile.title')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.profile.description')}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg text-sm mb-4">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('settings.profile.username')}
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            minLength={3}
            maxLength={50}
            pattern="^[a-zA-Z0-9_]+$"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('settings.profile.email')}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading || !hasChanges}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? t('settings.profile.saving') : t('settings.profile.save')}
        </button>
      </form>
    </div>
  );
}

export default ProfileSettings;
