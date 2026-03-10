import { useState } from 'react';
import { FiShield, FiShieldOff } from 'react-icons/fi';
import { authAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';

function TwoFactorSetup() {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const [step, setStep] = useState('idle'); // idle, setup, disable
  const [setupData, setSetupData] = useState(null);
  const [totpCode, setTotpCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleStartSetup = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const { data } = await authAPI.setup2FA();
      setSetupData(data);
      setStep('setup');
    } catch (err) {
      setError(err.response?.data?.error || t('settings.twoFactor.errorSetup'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSetup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authAPI.confirmSetup2FA({ totp_code: totpCode });
      updateUser(data.user);
      setSuccess(t('settings.twoFactor.successEnabled'));
      setStep('idle');
      setSetupData(null);
      setTotpCode('');
    } catch (err) {
      setError(err.response?.data?.error || t('settings.twoFactor.errorConfirm'));
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authAPI.disable2FA({ password, totp_code: totpCode });
      updateUser(data.user);
      setSuccess(t('settings.twoFactor.successDisabled'));
      setStep('idle');
      setTotpCode('');
      setPassword('');
    } catch (err) {
      setError(err.response?.data?.error || t('settings.twoFactor.errorDisable'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setStep('idle');
    setSetupData(null);
    setTotpCode('');
    setPassword('');
    setError('');
  };

  const isEnabled = user?.totp_enabled;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center space-x-3 mb-4">
        {isEnabled ? (
          <FiShield className="w-6 h-6 text-green-600 dark:text-green-400" />
        ) : (
          <FiShieldOff className="w-6 h-6 text-gray-400 dark:text-gray-500" />
        )}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.twoFactor.title')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.twoFactor.description')}</p>
        </div>
      </div>

      {/* Status badge */}
      <div className="mb-4">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          isEnabled
            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
        }`}>
          {isEnabled ? t('settings.twoFactor.enabled') : t('settings.twoFactor.disabled')}
        </span>
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

      {/* Idle state - show enable/disable button */}
      {step === 'idle' && (
        <button
          onClick={isEnabled ? () => { setStep('disable'); setError(''); setSuccess(''); } : handleStartSetup}
          disabled={loading}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            isEnabled
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          } disabled:opacity-50`}
        >
          {loading
            ? t('settings.twoFactor.loading')
            : isEnabled
              ? t('settings.twoFactor.disable')
              : t('settings.twoFactor.enable')
          }
        </button>
      )}

      {/* Setup step - show QR + secret + verify */}
      {step === 'setup' && setupData && (
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('settings.twoFactor.scanQR')}</p>
            <div className="flex justify-center bg-white p-4 rounded-lg inline-block">
              <img src={setupData.qr_code} alt="TOTP QR Code" className="w-48 h-48" />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.twoFactor.orCopySecret')}</p>
            <code className="block bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-lg text-sm font-mono text-gray-900 dark:text-gray-100 select-all break-all">
              {setupData.secret}
            </code>
          </div>

          <form onSubmit={handleConfirmSetup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('settings.twoFactor.enterCode')}
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-2xl tracking-widest"
                placeholder={t('settings.twoFactor.codePlaceholder')}
                autoFocus
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading || totpCode.length !== 6}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? t('settings.twoFactor.confirming') : t('settings.twoFactor.confirm')}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('settings.twoFactor.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Disable step - ask for password + code */}
      {step === 'disable' && (
        <form onSubmit={handleDisable} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('settings.twoFactor.passwordLabel')}
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('settings.twoFactor.codeLabel')}
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-2xl tracking-widest"
              placeholder={t('settings.twoFactor.codePlaceholder')}
            />
          </div>
          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={loading || totpCode.length !== 6 || !password}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? t('settings.twoFactor.disabling') : t('settings.twoFactor.disable')}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t('settings.twoFactor.cancel')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default TwoFactorSetup;
