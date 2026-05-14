import { useSyncExternalStore } from 'react';

// GDPR-style consent. "Essential" is always on (auth tokens, theme — strictly
// necessary for the app to function). "Functional" is opt-in and unlocks the
// remember-me hint we use to streamline re-login.

export type ConsentRecord = {
  essential: true;
  functional: boolean;
  decidedAt: string;
  version: 2;
};

const STORAGE_KEY = 'dx-cookie-consent-v2';
const LEGACY_KEY = 'dx-cookie-consent';
const LAST_LOGIN_KEY = 'dx-last-login';

const listeners = new Set<() => void>();
let bannerOpenFor: 'first-visit' | 'edit' | null = null;
let cachedConsent: ConsentRecord | null = null;
let consentLoaded = false;

function emit() {
  for (const l of listeners) l();
}

function loadFromStorage(): ConsentRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ConsentRecord;
      if (parsed && parsed.version === 2) return parsed;
    }
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy === 'accepted' || legacy === 'declined') {
      const migrated: ConsentRecord = {
        essential: true,
        functional: legacy === 'accepted',
        decidedAt: new Date().toISOString(),
        version: 2,
      };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        window.localStorage.removeItem(LEGACY_KEY);
      } catch {
        /* ignore */
      }
      return migrated;
    }
  } catch {
    /* localStorage unavailable */
  }
  return null;
}

// useSyncExternalStore requires getSnapshot to be referentially stable. We
// cache the parsed record and only mutate it through setConsent — reads are
// pure and return the same reference between updates.
function ensureLoaded() {
  if (!consentLoaded) {
    cachedConsent = loadFromStorage();
    consentLoaded = true;
  }
}

function readConsent(): ConsentRecord | null {
  ensureLoaded();
  return cachedConsent;
}

export function setConsent(functional: boolean) {
  const next: ConsentRecord = {
    essential: true,
    functional,
    decidedAt: new Date().toISOString(),
    version: 2,
  };
  cachedConsent = next;
  consentLoaded = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  if (!functional) forgetLogin();
  emit();
}

export function getConsent(): ConsentRecord | null {
  return readConsent();
}

export function openCookiePreferences() {
  bannerOpenFor = 'edit';
  emit();
}

export function closeCookiePreferences() {
  bannerOpenFor = null;
  emit();
}

function getBannerState(): 'first-visit' | 'edit' | null {
  if (bannerOpenFor) return bannerOpenFor;
  return readConsent() ? null : 'first-visit';
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useCookieConsent() {
  const consent = useSyncExternalStore(subscribe, readConsent, () => null);
  const bannerState = useSyncExternalStore(subscribe, getBannerState, () => null);
  return { consent, bannerState };
}

// --- Remember-me hint (only stored when functional consent is true) ---

export type AuthMethod = 'google' | 'password' | 'otp';

export type LoginHint = {
  email: string;
  method: AuthMethod;
  updatedAt: string;
};

export function rememberLogin(email: string, method: AuthMethod) {
  const consent = readConsent();
  if (!consent?.functional) return;
  try {
    const hint: LoginHint = { email, method, updatedAt: new Date().toISOString() };
    window.localStorage.setItem(LAST_LOGIN_KEY, JSON.stringify(hint));
  } catch {
    /* ignore */
  }
}

export function getLastLogin(): LoginHint | null {
  const consent = readConsent();
  if (!consent?.functional) return null;
  try {
    const raw = window.localStorage.getItem(LAST_LOGIN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LoginHint;
  } catch {
    return null;
  }
}

export function forgetLogin() {
  try {
    window.localStorage.removeItem(LAST_LOGIN_KEY);
  } catch {
    /* ignore */
  }
}
