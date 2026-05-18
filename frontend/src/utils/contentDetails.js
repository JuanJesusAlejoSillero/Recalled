import { getContentModule } from '../config/contentModules';

function resolveModule(moduleOrContentType) {
  if (moduleOrContentType?.contentType) {
    return moduleOrContentType;
  }
  return getContentModule(moduleOrContentType);
}

function parseIntegerValue(rawValue) {
  const normalized = String(rawValue ?? '').trim();
  if (!/^[-]?\d+$/.test(normalized)) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function createContentDetailsState(moduleOrContentType, initialDetails = {}) {
  const module = resolveModule(moduleOrContentType);
  return Object.fromEntries(
    (module.detailFields || []).map((field) => {
      const value = initialDetails?.[field.key];
      return [field.key, value == null ? '' : String(value)];
    })
  );
}

export function buildContentDetailsPayload(moduleOrContentType, detailsState = {}) {
  const module = resolveModule(moduleOrContentType);
  const payload = {};

  for (const field of module.detailFields || []) {
    const rawValue = detailsState?.[field.key];

    if (field.type === 'number') {
      if (rawValue === '' || rawValue == null) {
        continue;
      }

      const parsed = parseIntegerValue(rawValue);
      if (parsed != null) {
        payload[field.key] = parsed;
      }
      continue;
    }

    const normalized = String(rawValue ?? '').trim();
    if (normalized) {
      payload[field.key] = normalized;
    }
  }

  return payload;
}

export function contentDetailsStateSignature(moduleOrContentType, detailsState = {}) {
  const module = resolveModule(moduleOrContentType);
  return (module.detailFields || [])
    .map((field) => `${field.key}:${String(detailsState?.[field.key] ?? '').trim()}`)
    .join('|');
}

export function getVisibleContentDetails(moduleOrContentType, details = {}) {
  const module = resolveModule(moduleOrContentType);

  return (module.detailFields || [])
    .map((field) => {
      const value = details?.[field.key];
      if (value == null || value === '') {
        return null;
      }

      return {
        key: field.key,
        labelKey: `contentDetails.fields.${field.key}`,
        value: String(value),
        fullWidth: Boolean(field.fullWidth),
      };
    })
    .filter(Boolean);
}