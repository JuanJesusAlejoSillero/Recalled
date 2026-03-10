import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { usersAPI } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

function CreateUserForm({ onSuccess }) {
  const { t } = useLanguage();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setError('');
    setLoading(true);
    try {
      const response = await usersAPI.create(data);
      reset();
      onSuccess(response.data);
    } catch (err) {
      setError(err.response?.data?.error || t('createUser.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('createUser.title')}</h3>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('createUser.username')}</label>
          <input
            type="text"
            {...register('username', {
              required: t('createUser.required'),
              minLength: { value: 3, message: t('createUser.minChars3') },
              pattern: { value: /^[a-zA-Z0-9_]+$/, message: t('createUser.usernamePattern') },
            })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('createUser.email')}</label>
          <input
            type="email"
            {...register('email', { required: t('createUser.required') })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('createUser.password')}</label>
          <input
            type="password"
            {...register('password', {
              required: t('createUser.required'),
              minLength: { value: 8, message: t('createUser.minChars8') },
            })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>

        <div className="flex items-end">
          <label className="flex items-center space-x-2">
            <input type="checkbox" {...register('is_admin')} className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">{t('createUser.isAdmin')}</span>
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? t('createUser.creating') : t('createUser.create')}
      </button>
    </form>
  );
}

export default CreateUserForm;
