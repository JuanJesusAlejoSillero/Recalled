import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../hooks/useAuth';
import ProfileSettings from '../components/settings/ProfileSettings';
import ChangePassword from '../components/settings/ChangePassword';
import TwoFactorSetup from '../components/settings/TwoFactorSetup';
import DeleteAccount from '../components/settings/DeleteAccount';

function SettingsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('settings.title')}</h1>
      <ProfileSettings />
      <ChangePassword />
      <TwoFactorSetup />
      {!user?.is_admin && <DeleteAccount />}
    </div>
  );
}

export default SettingsPage;
