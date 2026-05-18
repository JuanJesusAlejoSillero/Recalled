import {
  FiBookOpen,
  FiFilm,
  FiMapPin,
  FiMonitor,
  FiTv,
  FiUser,
} from 'react-icons/fi';

const CONTENT_MODULES = {
  place: {
    contentType: 'place',
    routeSegment: 'places',
    envKey: 'ENABLE_PLACES',
    supportsReviews: true,
    icon: FiMapPin,
    navKey: 'nav.places',
    titleKey: 'places.title',
    newButtonKey: 'places.newPlace',
    searchPlaceholderKey: 'places.searchPlaceholder',
    emptyStateKey: 'places.noPlaces',
    formNameLabelKey: 'placeForm.name',
    formNamePlaceholderKey: 'placeForm.namePlaceholder',
    createLabelKey: 'placeForm.create',
    hasLocation: true,
    hasCategory: true,
    detailFields: [],
  },
  movie: {
    contentType: 'movie',
    routeSegment: 'movies',
    envKey: 'ENABLE_MOVIES',
    supportsReviews: true,
    icon: FiFilm,
    navKey: 'nav.movies',
    titleKey: 'contentModules.movie.title',
    newButtonKey: 'contentModules.movie.newItem',
    searchPlaceholderKey: 'contentModules.movie.searchPlaceholder',
    emptyStateKey: 'contentModules.movie.empty',
    formNameLabelKey: 'contentModules.movie.nameLabel',
    formNamePlaceholderKey: 'contentModules.movie.namePlaceholder',
    createLabelKey: 'contentModules.movie.create',
    hasLocation: false,
    hasCategory: false,
    detailFields: [
      { key: 'director', type: 'text' },
      { key: 'release_year', type: 'number' },
      { key: 'genre', type: 'text' },
      { key: 'duration_minutes', type: 'number' },
      { key: 'country', type: 'text' },
    ],
  },
  series: {
    contentType: 'series',
    routeSegment: 'series',
    envKey: 'ENABLE_SERIES',
    supportsReviews: true,
    icon: FiTv,
    navKey: 'nav.series',
    titleKey: 'contentModules.series.title',
    newButtonKey: 'contentModules.series.newItem',
    searchPlaceholderKey: 'contentModules.series.searchPlaceholder',
    emptyStateKey: 'contentModules.series.empty',
    formNameLabelKey: 'contentModules.series.nameLabel',
    formNamePlaceholderKey: 'contentModules.series.namePlaceholder',
    createLabelKey: 'contentModules.series.create',
    hasLocation: false,
    hasCategory: false,
    detailFields: [
      { key: 'creator', type: 'text' },
      { key: 'start_year', type: 'number' },
      { key: 'end_year', type: 'number' },
      { key: 'seasons', type: 'number' },
      { key: 'genre', type: 'text' },
    ],
  },
  book: {
    contentType: 'book',
    routeSegment: 'books',
    envKey: 'ENABLE_BOOKS',
    supportsReviews: true,
    icon: FiBookOpen,
    navKey: 'nav.books',
    titleKey: 'contentModules.book.title',
    newButtonKey: 'contentModules.book.newItem',
    searchPlaceholderKey: 'contentModules.book.searchPlaceholder',
    emptyStateKey: 'contentModules.book.empty',
    formNameLabelKey: 'contentModules.book.nameLabel',
    formNamePlaceholderKey: 'contentModules.book.namePlaceholder',
    createLabelKey: 'contentModules.book.create',
    hasLocation: false,
    hasCategory: false,
    detailFields: [
      { key: 'author', type: 'text' },
      { key: 'publication_year', type: 'number' },
      { key: 'genre', type: 'text' },
      { key: 'pages', type: 'number' },
      { key: 'publisher', type: 'text' },
    ],
  },
  videogame: {
    contentType: 'videogame',
    routeSegment: 'videogames',
    envKey: 'ENABLE_VIDEOGAMES',
    supportsReviews: true,
    icon: FiMonitor,
    navKey: 'nav.videogames',
    titleKey: 'contentModules.videogame.title',
    newButtonKey: 'contentModules.videogame.newItem',
    searchPlaceholderKey: 'contentModules.videogame.searchPlaceholder',
    emptyStateKey: 'contentModules.videogame.empty',
    formNameLabelKey: 'contentModules.videogame.nameLabel',
    formNamePlaceholderKey: 'contentModules.videogame.namePlaceholder',
    createLabelKey: 'contentModules.videogame.create',
    hasLocation: false,
    hasCategory: false,
    detailFields: [
      { key: 'developer', type: 'text' },
      { key: 'release_year', type: 'number' },
      { key: 'platform', type: 'text' },
      { key: 'genre', type: 'text' },
      { key: 'publisher', type: 'text' },
    ],
  },
  person: {
    contentType: 'person',
    routeSegment: 'people',
    envKey: 'ENABLE_PEOPLE',
    supportsReviews: false,
    icon: FiUser,
    navKey: 'nav.people',
    titleKey: 'contentModules.person.title',
    newButtonKey: 'contentModules.person.newItem',
    searchPlaceholderKey: 'contentModules.person.searchPlaceholder',
    emptyStateKey: 'contentModules.person.empty',
    formNameLabelKey: 'contentModules.person.nameLabel',
    formNamePlaceholderKey: 'contentModules.person.namePlaceholder',
    createLabelKey: 'contentModules.person.create',
    hasLocation: false,
    hasCategory: false,
    detailFields: [
      { key: 'occupation', type: 'text' },
      { key: 'birth_year', type: 'number' },
      { key: 'death_year', type: 'number' },
      { key: 'nationality', type: 'text' },
      { key: 'known_for', type: 'text', fullWidth: true },
      { key: 'notes', type: 'textarea', fullWidth: true },
    ],
  },
};

const CONTENT_TYPE_ALIASES = {
  places: 'place',
  movies: 'movie',
  books: 'book',
  videogames: 'videogame',
  people: 'person',
};

export function normalizeContentType(contentType) {
  const normalized = String(contentType || 'place').trim().toLowerCase();
  return CONTENT_TYPE_ALIASES[normalized] || normalized || 'place';
}

export function getContentModule(contentType = 'place') {
  return CONTENT_MODULES[normalizeContentType(contentType)] || CONTENT_MODULES.place;
}

export function getEnabledContentModule(contentType = 'place') {
  const module = getContentModule(contentType);
  if (isContentModuleEnabled(module.contentType)) {
    return module;
  }

  return getEnabledContentModules()[0] || CONTENT_MODULES.place;
}

export function supportsContentModuleReviews(contentType) {
  return getContentModule(contentType).supportsReviews !== false;
}

export function isContentModuleEnabled(contentType) {
  const module = getContentModule(contentType);
  if (!module.envKey) {
    return true;
  }

  const rawValue = window.ENV?.[module.envKey];
  if (rawValue == null) {
    return true;
  }

  return String(rawValue).trim().toLowerCase() === 'true';
}

export function getEnabledContentModules() {
  return Object.values(CONTENT_MODULES).filter((module) => isContentModuleEnabled(module.contentType));
}

export function getEnabledReviewableContentModules() {
  return getEnabledContentModules().filter((module) => supportsContentModuleReviews(module.contentType));
}

export function getEnabledReviewableContentModule(contentType = 'place') {
  const module = getEnabledContentModule(contentType);
  if (supportsContentModuleReviews(module.contentType)) {
    return module;
  }

  return getEnabledReviewableContentModules()[0] || module;
}

export function getContentListPath(contentType) {
  return `/${getContentModule(contentType).routeSegment}`;
}

export function getContentDetailPath(contentType, id) {
  return `${getContentListPath(contentType)}/${id}`;
}

export function getNewReviewPath(contentType, placeId = null) {
  const searchParams = new URLSearchParams({ contentType: getEnabledReviewableContentModule(contentType).contentType });
  if (placeId != null) {
    searchParams.set('place', String(placeId));
  }
  return `/reviews/new?${searchParams.toString()}`;
}

export function isPlaceContentType(contentType) {
  return getContentModule(contentType).contentType === 'place';
}