import { useLanguage } from '../../context/LanguageContext';
import { FiExternalLink, FiGithub } from 'react-icons/fi';
import { GITHUB_REPO_URL } from '../../utils/externalLinks';

function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400 space-y-2">
        <p>{t('footer.rights', { year: new Date().getFullYear() })}</p>
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 hover:text-primary-600 dark:hover:text-primary-400"
        >
          <FiGithub className="h-4 w-4" />
          <span>{t('footer.githubRepo')}</span>
          <FiExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </footer>
  );
}

export default Footer;
