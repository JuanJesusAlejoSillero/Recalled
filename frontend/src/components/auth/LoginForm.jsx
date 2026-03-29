import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';

function LoginForm() {
  const { login, verify2FA } = useAuth();
  const { t } = useLanguage();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState(false);
  const [tempToken, setTempToken] = useState(null);
  const [totpCode, setTotpCode] = useState('');
  const [savedUsername, setSavedUsername] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setError('');
    setLoading(true);
    try {
      const result = await login(data.username, data.password);
      if (result?.twoFactorRequired) {
        setSavedUsername(data.username);
        setTempToken(result.tempToken);
        setTwoFactorStep(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || t('login.error'));
    } finally {
      setLoading(false);
    }
  };

  const onVerify2FA = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verify2FA(tempToken, totpCode);
    } catch (err) {
      setError(err.response?.data?.error || t('login.twoFactorInvalid'));
    } finally {
      setLoading(false);
    }
  };

  if (twoFactorStep) {
    return (
      <form onSubmit={onVerify2FA} className="space-y-6">
        <input type="hidden" name="username" autoComplete="username" value={savedUsername} readOnly />
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{t('login.twoFactorTitle')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('login.twoFactorSubtitle')}</p>
        </div>

        <div>
          <label htmlFor="totp_code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('login.twoFactorCode')}
          </label>
          <input
            id="totp_code"
            name="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-center text-2xl tracking-widest"
            placeholder={t('login.twoFactorCodePlaceholder')}
            autoFocus
          />
        </div>

        <button
          type="submit"
          disabled={loading || totpCode.length !== 6}
          className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t('login.twoFactorVerifying') : t('login.twoFactorVerify')}
        </button>

        <button
          type="button"
          onClick={() => { setTwoFactorStep(false); setTempToken(null); setTotpCode(''); setSavedUsername(''); setError(''); }}
          className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          {t('login.twoFactorBack')}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('login.username')}
        </label>
        <input
          id="username"
          type="text"
          autoComplete="username"
          {...register('username', { required: t('login.usernameRequired') })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          placeholder={t('login.usernamePlaceholder')}
        />
        {errors.username && (
          <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('login.password')}
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register('password', { required: t('login.passwordRequired') })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          placeholder={t('login.passwordPlaceholder')}
        />
        {errors.password && (
          <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? t('login.submitting') : t('login.submit')}
      </button>
    </form>
  );
}

export default LoginForm;
