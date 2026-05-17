import { useEffect, useMemo, useState } from 'react';
import { FiSearch, FiUsers } from 'react-icons/fi';
import { usersAPI } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../hooks/useAuth';

const MAX_KNOWN_USERS = 25;


function mergeUsers(...groups) {
  const merged = [];
  const seen = new Set();

  groups.flat().forEach((user) => {
    const normalized = normalizeUser(user);
    if (!normalized || seen.has(normalized.id)) {
      return;
    }

    seen.add(normalized.id);
    merged.push(normalized);
  });

  return merged;
}


function normalizeUser(user) {
  if (!user || !Number.isFinite(Number(user.id)) || !String(user.username || '').trim()) {
    return null;
  }

  return {
    id: Number(user.id),
    username: String(user.username).trim(),
  };
}

function normalizeUserIds(userIds) {
  return [...new Set((userIds || []).map((userId) => Number(userId)).filter(Number.isFinite))]
    .sort((left, right) => left - right);
}

function mergeKnownUsers(...groups) {
  return mergeUsers(...groups).slice(0, MAX_KNOWN_USERS);
}

function sortUsers(users) {
  return [...users].sort((left, right) => left.username.localeCompare(right.username));
}

function filterUsers(users, searchTerm) {
  if (!searchTerm) {
    return users;
  }

  const normalizedSearch = searchTerm.toLowerCase();
  return users.filter((candidate) => candidate.username.toLowerCase().includes(normalizedSearch));
}

function VisibilitySelector({ selectedUserIds = [], knownUsers = [], allowedUsers = null, onChange, onKnownUsersChange, title, description }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAdmin = Boolean(user?.is_admin);
  const hasAllowedUsersConstraint = allowedUsers !== null;
  const normalizedAllowedUsers = useMemo(
    () => sortUsers(mergeUsers(allowedUsers || [])),
    [allowedUsers]
  );
  const allowedUserIdsKey = useMemo(
    () => normalizedAllowedUsers.map((allowedUser) => allowedUser.id).join(','),
    [normalizedAllowedUsers]
  );
  const allowedUserIds = useMemo(
    () => new Set(normalizedAllowedUsers.map((allowedUser) => allowedUser.id)),
    [allowedUserIdsKey, normalizedAllowedUsers]
  );
  const storageKey = useMemo(
    () => (user?.id ? `recalled.visibilityKnownUsers.v1.user.${user.id}` : null),
    [user?.id]
  );

  const [rememberedUsers, setRememberedUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupState, setLookupState] = useState('idle');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [availableUsersState, setAvailableUsersState] = useState('idle');

  useEffect(() => {
    if (!storageKey) {
      setRememberedUsers(mergeKnownUsers(knownUsers));
      return;
    }

    try {
      const rawValue = window.localStorage.getItem(storageKey);
      const parsedValue = rawValue ? JSON.parse(rawValue) : [];
      setRememberedUsers(mergeKnownUsers(knownUsers, parsedValue));
    } catch {
      setRememberedUsers(mergeKnownUsers(knownUsers));
    }
  }, [storageKey]);

  useEffect(() => {
    if (!knownUsers?.length) {
      return;
    }

    setRememberedUsers((currentUsers) => mergeKnownUsers(knownUsers, currentUsers));
  }, [knownUsers]);

  useEffect(() => {
    if (!storageKey) {
      return;
    }

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(rememberedUsers));
    } catch {
      // Ignore storage errors; the selector still works without persistence.
    }
  }, [rememberedUsers, storageKey]);

  useEffect(() => {
    if (onKnownUsersChange) {
      onKnownUsersChange(rememberedUsers);
    }
  }, [onKnownUsersChange, rememberedUsers]);

  const normalizedIds = normalizeUserIds(selectedUserIds);
  const trimmedSearch = search.trim();
  const isUserAllowed = (candidateUser) => {
    if (!hasAllowedUsersConstraint) {
      return true;
    }

    return allowedUserIds.has(Number(candidateUser?.id));
  };

  useEffect(() => {
    if (!isAdmin) {
      setAvailableUsers([]);
      setAvailableUsersState('idle');
      return undefined;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setAvailableUsersState('loading');

      try {
        const params = trimmedSearch ? { search: trimmedSearch } : undefined;
        const { data } = await usersAPI.shareable(params);
        if (cancelled) {
          return;
        }

        setAvailableUsers(sortUsers(mergeUsers(data.users || [])));
        setAvailableUsersState('loaded');
      } catch {
        if (!cancelled) {
          setAvailableUsers([]);
          setAvailableUsersState('error');
        }
      }
    }, trimmedSearch ? 250 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isAdmin, trimmedSearch]);

  useEffect(() => {
    if (isAdmin) {
      setSearching(false);
      setLookupResult(null);
      setLookupState('idle');
      return undefined;
    }

    if (!trimmedSearch) {
      setSearching(false);
      setLookupResult(null);
      setLookupState('idle');
      return undefined;
    }

    const exactKnownUser = rememberedUsers.find(
      (candidate) => candidate.username.toLowerCase() === trimmedSearch.toLowerCase()
    );
    if (exactKnownUser) {
      setSearching(false);
      if (isUserAllowed(exactKnownUser)) {
        setLookupResult(exactKnownUser);
        setLookupState('found');
      } else {
        setLookupResult(null);
        setLookupState('not-allowed');
      }
      return undefined;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await usersAPI.shareable({ search: trimmedSearch });
        if (cancelled) {
          return;
        }

        const foundUser = normalizeUser(data.users?.[0]);
        if (foundUser && !isUserAllowed(foundUser)) {
          setLookupResult(null);
          setLookupState('not-allowed');
          return;
        }

        setLookupResult(foundUser);
        setLookupState(foundUser ? 'found' : 'not-found');
      } catch {
        if (!cancelled) {
          setLookupResult(null);
          setLookupState('error');
        }
      } finally {
        if (!cancelled) {
          setSearching(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [allowedUserIdsKey, hasAllowedUsersConstraint, isAdmin, trimmedSearch, rememberedUsers]);

  const rememberUser = (userToRemember) => {
    setRememberedUsers((currentUsers) => mergeKnownUsers([userToRemember], currentUsers));
  };

  const listedUsers = isAdmin
    ? filterUsers(sortUsers(mergeUsers(availableUsers, knownUsers, rememberedUsers)), trimmedSearch)
    : rememberedUsers;
  const visibleListedUsers = hasAllowedUsersConstraint
    ? listedUsers.filter(isUserAllowed)
    : listedUsers;

  const toggleUser = (candidateUser) => {
    const normalizedUser = normalizeUser(candidateUser);
    if (!normalizedUser || !isUserAllowed(normalizedUser)) {
      return;
    }

    rememberUser(normalizedUser);

    const nextIds = normalizedIds.includes(normalizedUser.id)
      ? normalizedIds.filter((currentId) => currentId !== normalizedUser.id)
      : [...normalizedIds, normalizedUser.id];

    onChange(normalizeUserIds(nextIds));
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-950/10">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          <FiUsers className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{description}</p>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t(isAdmin ? 'visibility.searchPlaceholderAdmin' : 'visibility.searchPlaceholder')}
                className="w-full rounded-lg border border-amber-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-amber-900/40 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t(isAdmin ? 'visibility.searchHintAdmin' : 'visibility.searchHint')}
            </p>
          </div>

          {!isAdmin && trimmedSearch && (
            <div className="rounded-lg border border-amber-200 bg-white dark:border-amber-900/40 dark:bg-gray-900">
              {searching ? (
                <p className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">{t('visibility.searching')}</p>
              ) : lookupState === 'found' && lookupResult ? (
                <label className="flex cursor-pointer items-center justify-between gap-3 px-3 py-3 text-sm text-gray-700 dark:text-gray-200">
                  <span className="truncate">{lookupResult.username}</span>
                  <input
                    type="checkbox"
                    checked={normalizedIds.includes(lookupResult.id)}
                    onChange={() => toggleUser(lookupResult)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </label>
              ) : lookupState === 'error' ? (
                <p className="px-3 py-3 text-sm text-red-600 dark:text-red-400">{t('visibility.lookupError')}</p>
              ) : lookupState === 'not-allowed' ? (
                <p className="px-3 py-3 text-sm text-amber-700 dark:text-amber-300">{t('visibility.notAllowedForPlace')}</p>
              ) : lookupState === 'not-found' ? (
                <p className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">{t('visibility.notFound')}</p>
              ) : null}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
              {t(isAdmin ? 'visibility.availableUsers' : 'visibility.knownUsers')}
            </p>
            <div className="max-h-44 overflow-y-auto rounded-lg border border-amber-200 bg-white dark:border-amber-900/40 dark:bg-gray-900">
              {isAdmin && availableUsersState === 'loading' ? (
                <p className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{t('visibility.loading')}</p>
              ) : isAdmin && availableUsersState === 'error' && visibleListedUsers.length === 0 ? (
                <p className="px-3 py-4 text-sm text-red-600 dark:text-red-400">{t('visibility.listError')}</p>
              ) : visibleListedUsers.length > 0 ? visibleListedUsers.map((knownUser) => {
                const checked = normalizedIds.includes(knownUser.id);
                return (
                  <label
                    key={knownUser.id}
                    className="flex cursor-pointer items-center justify-between gap-3 border-b border-amber-100 px-3 py-2 text-sm text-gray-700 last:border-b-0 hover:bg-amber-50 dark:border-amber-900/30 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <span className="truncate">{knownUser.username}</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleUser(knownUser)}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </label>
                );
              }) : (
                <p className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {t(
                    hasAllowedUsersConstraint
                      ? 'visibility.noAllowedUsers'
                      : (isAdmin ? (trimmedSearch ? 'visibility.noSearchResults' : 'visibility.noUsers') : 'visibility.noKnownUsers')
                  )}
                </p>
              )}
            </div>
          </div>

          <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
            {t('visibility.selectedCount', { count: normalizedIds.length })}
          </p>
        </div>
      </div>
    </div>
  );
}

export default VisibilitySelector;
