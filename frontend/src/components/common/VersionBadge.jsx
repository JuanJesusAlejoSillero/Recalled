import { useState, useEffect } from 'react';
import { FiExternalLink } from 'react-icons/fi';
import { versionAPI } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { getGitHubReleaseUrl } from '../../utils/externalLinks';

function VersionBadge() {
  const { t } = useLanguage();
  const [version, setVersion] = useState(null);

  useEffect(() => {
    versionAPI.get()
      .then(({ data }) => setVersion(data.version))
      .catch(() => {});
  }, []);

  if (!version || version === 'dev') return null;

  const tag = version.startsWith('v') ? version : `v${version}`;

  return (
    <a
      href={getGitHubReleaseUrl(version)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400"
      title={t('nav.versionRelease', { version: tag })}
      aria-label={t('nav.versionRelease', { version: tag })}
    >
      <span>{tag}</span>
      <FiExternalLink className="h-3 w-3" />
    </a>
  );
}

export default VersionBadge;
