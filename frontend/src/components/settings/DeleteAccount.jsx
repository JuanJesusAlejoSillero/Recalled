import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiTrash2 } from 'react-icons/fi';
import { authAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';

function DeleteAccount() {
  const { logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authAPI.deleteAccount({ password });
      await logout();
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || t('settings.deleteAccount.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-red-200 dark:border-red-800 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <FiTrash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
        <div>
          <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">{t('settings.deleteAccount.title')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.deleteAccount.description')}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
        >
          {t('settings.deleteAccount.button')}
        </button>
      ) : (
        <form onSubmit={handleDelete} className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-700 dark:text-red-400 font-medium">
              {t('settings.deleteAccount.warning')}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('settings.deleteAccount.passwordLabel')}
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>
          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={loading || !password}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? t('settings.deleteAccount.deleting') : t('settings.deleteAccount.confirmButton')}
            </button>
            <button
              type="button"
              onClick={() => { setShowConfirm(false); setPassword(''); setError(''); }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t('settings.deleteAccount.cancel')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default DeleteAccount;
