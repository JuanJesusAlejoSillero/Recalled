import { useState, useEffect } from 'react';
import { FiTrash2, FiShield, FiUser, FiKey } from 'react-icons/fi';
import { usersAPI } from '../../services/api';
import CreateUserForm from './CreateUserForm';
import { formatDate } from '../../utils/helpers';
import { useLanguage } from '../../context/LanguageContext';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [resetModal, setResetModal] = useState(null); // { user }
  const [resetMode, setResetMode] = useState('generate');
  const [manualPassword, setManualPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState(null); // { new_password } or null
  const [copied, setCopied] = useState(false);
  const { t, language } = useLanguage();

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

  const openResetModal = (user) => {
    setResetModal(user);
    setResetMode('generate');
    setManualPassword('');
    setResetResult(null);
    setCopied(false);
  };

  const closeResetModal = () => {
    setResetModal(null);
    setResetResult(null);
    loadUsers();
  };

  const handleReset = async () => {
    const user = resetModal;
    if (!user) return;

    if (resetMode === 'manual' && manualPassword.length < 8) {
      alert(t('admin.passwordTooShort'));
      return;
    }

    setResetting(true);
    setResetResult(null);

    try {
      const data = resetMode === 'generate'
        ? { generate: true }
        : { new_password: manualPassword };

      const response = await usersAPI.resetPassword(user.id, data);
      setResetResult(response.data);
    } catch (err) {
      const errorMsg = err.response?.data?.error || t('admin.errorResetPassword');
      alert(errorMsg);
    } finally {
      setResetting(false);
    }
  };

  const handleCopyPassword = async () => {
    if (resetResult?.new_password) {
      try {
        await navigator.clipboard.writeText(resetResult.new_password);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = resetResult.new_password;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(user.created_at, language)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right space-x-3">
                  <button
                    onClick={() => openResetModal(user)}
                    className="text-primary-600 hover:text-primary-800"
                    title={t('admin.resetPassword')}
                  >
                    <FiKey className="w-4 h-4" />
                  </button>
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

      {/* Reset Password Modal */}
      {resetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {t('admin.resetPasswordFor', { username: resetModal.username })}
            </h3>

            {!resetResult ? (
              <>
                {/* Mode selection */}
                <div className="space-y-3 mb-4">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="resetMode"
                      checked={resetMode === 'generate'}
                      onChange={() => setResetMode('generate')}
                      className="w-4 h-4 text-primary-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('admin.generateRandom')}</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="resetMode"
                      checked={resetMode === 'manual'}
                      onChange={() => setResetMode('manual')}
                      className="w-4 h-4 text-primary-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('admin.manualPassword')}</span>
                  </label>
                </div>

                {/* Manual password input */}
                {resetMode === 'manual' && (
                  <div className="mb-4">
                    <input
                      type="password"
                      value={manualPassword}
                      onChange={(e) => setManualPassword(e.target.value)}
                      placeholder={t('createUser.password')}
                      minLength={8}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('admin.passwordTooShort')}</p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={closeResetModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    {t('admin.cancel')}
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={resetting}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {resetting ? '...' : t('admin.resetButton')}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Success result */}
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-300 font-medium mb-2">
                    {t('admin.passwordResetSuccess')}
                  </p>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm font-mono text-gray-900 dark:text-white">
                      {resetResult.new_password}
                    </code>
                    <button
                      onClick={handleCopyPassword}
                      className="px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                    >
                      {copied ? t('admin.copied') : t('admin.copy')}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={closeResetModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    {t('admin.close')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
