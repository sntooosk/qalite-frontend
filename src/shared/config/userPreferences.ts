import {
  DEFAULT_USER_PREFERENCES,
  type LanguagePreference,
  type ThemePreference,
  type UserPreferences,
} from '../../domain/entities/auth';

export const THEME_PREFERENCE_STORAGE_KEY = 'qalite.themePreference';
export const LEGACY_THEME_STORAGE_KEY = 'qalite-theme';
export const LANGUAGE_STORAGE_KEY = 'qalite.language';

const isThemePreference = (value: unknown): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system';

const isLanguagePreference = (value: unknown): value is LanguagePreference =>
  value === 'pt' || value === 'en';

const normalizeLanguagePreference = (value?: string | null): LanguagePreference | null => {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase();
  const base = normalized.split('-')[0];

  return isLanguagePreference(base) ? base : null;
};

const safeGetLocalStorageItem = (key: string): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.error('Failed to read localStorage', error);
    return null;
  }
};

const safeSetLocalStorageItem = (key: string, value: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.error('Failed to persist localStorage', error);
  }
};

export const normalizeUserPreferences = (
  value: unknown,
  fallback: UserPreferences = DEFAULT_USER_PREFERENCES,
): UserPreferences => {
  if (!value || typeof value !== 'object') {
    return fallback;
  }

  const preferences = value as Partial<UserPreferences>;
  const theme = isThemePreference(preferences.theme) ? preferences.theme : fallback.theme;
  const language = isLanguagePreference(preferences.language)
    ? preferences.language
    : fallback.language;

  return { theme, language };
};

export const getStoredThemePreference = (): ThemePreference | null => {
  const stored = safeGetLocalStorageItem(THEME_PREFERENCE_STORAGE_KEY);
  if (isThemePreference(stored)) {
    return stored;
  }

  const legacy = safeGetLocalStorageItem(LEGACY_THEME_STORAGE_KEY);
  if (legacy === 'light' || legacy === 'dark') {
    return legacy;
  }

  return null;
};

export const getDeviceLanguagePreference = (): LanguagePreference | null => {
  if (typeof navigator === 'undefined') {
    return null;
  }

  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];

  for (const language of languages) {
    const resolved = normalizeLanguagePreference(language);
    if (resolved) {
      return resolved;
    }
  }

  return null;
};

export const getStoredLanguagePreference = (): LanguagePreference | null => {
  const stored = safeGetLocalStorageItem(LANGUAGE_STORAGE_KEY);
  if (isLanguagePreference(stored)) {
    return stored;
  }

  return null;
};

export const persistPreferencesLocally = (preferences: UserPreferences): void => {
  safeSetLocalStorageItem(THEME_PREFERENCE_STORAGE_KEY, preferences.theme);
  safeSetLocalStorageItem(LANGUAGE_STORAGE_KEY, preferences.language);
};

export const persistLanguagePreferenceLocally = (language: string): void => {
  safeSetLocalStorageItem(LANGUAGE_STORAGE_KEY, language);
};
