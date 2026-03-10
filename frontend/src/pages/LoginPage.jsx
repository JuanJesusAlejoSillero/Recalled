import LoginForm from '../components/auth/LoginForm';
import ThemeToggle from '../components/common/ThemeToggle';
import LanguageToggle from '../components/common/LanguageToggle';
import { useLanguage } from '../context/LanguageContext';

function LoginPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="absolute top-4 right-4 flex items-center space-x-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{t('login.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('login.subtitle')}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
