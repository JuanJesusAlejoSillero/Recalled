import { useState, useEffect } from 'react';
import { versionAPI } from '../../services/api';

function VersionBadge() {
  const [version, setVersion] = useState(null);

  useEffect(() => {
    versionAPI.get()
      .then(({ data }) => setVersion(data.version))
      .catch(() => {});
  }, []);

  if (!version || version === 'dev') return null;

  return (
    <span className="text-xs text-gray-400 dark:text-gray-500 hidden md:inline" title={`v${version}`}>
      v{version}
    </span>
  );
}

export default VersionBadge;
