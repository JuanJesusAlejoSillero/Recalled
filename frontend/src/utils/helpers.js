function getDateConfig(localeOrLanguage = 'es') {
  const normalized = String(localeOrLanguage || 'es').trim().toLowerCase();

  if (normalized === 'en' || normalized === 'en-us') {
    return {
      locale: 'en-US',
      order: 'mdy',
      placeholder: 'MM/DD/YYYY',
    };
  }

  return {
    locale: 'es-ES',
    order: 'dmy',
    placeholder: 'DD/MM/YYYY',
  };
}

function getIsoDateParts(dateStr) {
  const match = String(dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  return {
    year: match[1],
    month: match[2],
    day: match[3],
  };
}

function formatDateParts(parts, order) {
  if (!parts) {
    return '';
  }

  return order === 'mdy'
    ? `${parts.month}/${parts.day}/${parts.year}`
    : `${parts.day}/${parts.month}/${parts.year}`;
}

function isValidDateParts(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));
  return candidate.getUTCFullYear() === year
    && candidate.getUTCMonth() === month - 1
    && candidate.getUTCDate() === day;
}

export function getDateInputPlaceholder(localeOrLanguage = 'es') {
  return getDateConfig(localeOrLanguage).placeholder;
}

/**
 * Format a date string according to the app language.
 */
export function formatDate(dateStr, localeOrLanguage = 'es') {
  if (!dateStr) return '';

  const config = getDateConfig(localeOrLanguage);
  const isoParts = getIsoDateParts(dateStr);
  if (isoParts) {
    return formatDateParts(isoParts, config.order);
  }

  const parsedDate = new Date(dateStr);
  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(config.locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsedDate);
}

export function formatDateInputValue(dateStr, localeOrLanguage = 'es') {
  return formatDate(dateStr, localeOrLanguage);
}

export function parseDateInputValue(value, localeOrLanguage = 'es') {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    return { isValid: true, isoValue: '', displayValue: '' };
  }

  const isoParts = getIsoDateParts(normalized);
  if (isoParts) {
    const isoValue = `${isoParts.year}-${isoParts.month}-${isoParts.day}`;
    return {
      isValid: true,
      isoValue,
      displayValue: formatDateInputValue(isoValue, localeOrLanguage),
    };
  }

  const match = normalized.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (!match) {
    return { isValid: false, isoValue: '', displayValue: normalized };
  }

  const config = getDateConfig(localeOrLanguage);
  const first = Number(match[1]);
  const second = Number(match[2]);
  const year = Number(match[3]);
  const month = config.order === 'mdy' ? first : second;
  const day = config.order === 'mdy' ? second : first;

  if (!isValidDateParts(year, month, day)) {
    return { isValid: false, isoValue: '', displayValue: normalized };
  }

  const isoValue = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return {
    isValid: true,
    isoValue,
    displayValue: formatDateInputValue(isoValue, localeOrLanguage),
  };
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
  return `/api/v1/media/photos/thumbnails/${photo.filename}`;
}

/**
 * Get the full-size URL for a photo.
 */
export function getPhotoUrl(photo) {
  if (!photo?.filename) return '';
  return `/api/v1/media/photos/${photo.filename}`;
}
