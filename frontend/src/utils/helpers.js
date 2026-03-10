/**
 * Format a date string to a locale-friendly format.
 */
export function formatDate(dateStr, locale = 'es-ES') {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Truncate text to a max length with ellipsis.
 */
export function truncate(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Get the thumbnail URL for a photo.
 */
export function getThumbnailUrl(photo) {
  if (!photo?.filename) return '';
  return `/uploads/photos/thumbnails/${photo.filename}`;
}

/**
 * Get the full-size URL for a photo.
 */
export function getPhotoUrl(photo) {
  if (!photo?.filename) return '';
  return `/uploads/photos/${photo.filename}`;
}
