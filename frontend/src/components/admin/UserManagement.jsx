import { useState, useEffect } from 'react';
import { FiTrash2, FiShield, FiUser } from 'react-icons/fi';
import { usersAPI } from '../../services/api';
import CreateUserForm from './CreateUserForm';
import { formatDate } from '../../utils/helpers';
import { useLanguage } from '../../context/LanguageContext';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const { t, language } = useLanguage();
  const locale = language === 'es' ? 'es-ES' : 'en-US';

  const loadUsers = async () => {
    try {
      const { data } = await usersAPI.list({ per_page: 100 });
      setUsers(data.users || []);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleDelete = async (userId, username) => {
    if (!window.confirm(t('admin.confirmDeleteUser', { username }))) return;
    try {
      await usersAPI.delete(userId);
      setUsers(users.filter((u) => u.id !== userId));
    } catch (err) {
      alert(err.response?.data?.error || t('admin.errorDeleteUser'));
    }
  };

  const handleUserCreated = (newUser) => {
    setUsers([newUser, ...users]);
    setShowForm(false);
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500 dark:text-gray-400">{t('admin.loadingUsers')}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('admin.userManagement')}</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
        >
          {showForm ? t('admin.cancel') : t('admin.newUser')}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <CreateUserForm onSuccess={handleUserCreated} />
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('admin.tableUser')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('admin.tableRole')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('admin.tableCreated')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('admin.tableActions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {user.is_admin ? <FiShield className="w-4 h-4 text-yellow-500" /> : <FiUser className="w-4 h-4 text-gray-400" />}
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{user.username}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.is_admin ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                  }`}>
                    {user.is_admin ? t('admin.roleAdmin') : t('admin.roleUser')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(user.created_at, locale)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    onClick={() => handleDelete(user.id, user.username)}
                    className="text-red-600 hover:text-red-800"
                    title={t('admin.deleteUser')}
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default UserManagement;
