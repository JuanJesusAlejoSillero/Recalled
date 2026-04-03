export const GITHUB_REPO_URL = 'https://github.com/JuanJesusAlejoSillero/Recalled';

function normalizeVersionTag(version) {
  if (!version) {
    return null;
  }

  return version.startsWith('v') ? version : `v${version}`;
}

export function getGitHubReleaseUrl(version) {
  const tag = normalizeVersionTag(version);
  return tag ? `${GITHUB_REPO_URL}/releases/tag/${tag}` : `${GITHUB_REPO_URL}/releases`;
}