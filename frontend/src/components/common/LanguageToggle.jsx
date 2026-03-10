import { FiGlobe } from 'react-icons/fi';
import { useLanguage } from '../../context/LanguageContext';

function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'es' ? 'en' : 'es');
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center space-x-1 p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
      aria-label={language === 'es' ? 'Switch to English' : 'Cambiar a español'}
    >
      <FiGlobe className="w-5 h-5" />
      <span>{language === 'es' ? 'EN' : 'ES'}</span>
    </button>
  );
}

export default LanguageToggle;
