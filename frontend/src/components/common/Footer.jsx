import { useLanguage } from '../../context/LanguageContext';

function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>{t('footer.rights', { year: new Date().getFullYear() })}</p>
      </div>
    </footer>
  );
}

export default Footer;
