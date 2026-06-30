/**
 * API and app configuration.
 * API_BASE_URL must match the backend (default port 5000, routes under /api).
 */

const CONFIG_VERSION = '2';
const CONFIG_VERSION_KEY = 'tar_config_version';
const DEFAULT_API_HOST = '127.0.0.1';
const DEFAULT_API_PORT = '5000';

function normalizeApiBaseUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim().replace(/\/+$/, '');
  if (!trimmed.endsWith('/api')) {
    return `${trimmed}/api`;
  }
  return trimmed;
}

function getDefaultApiBaseUrl() {
  return `http://${DEFAULT_API_HOST}:${DEFAULT_API_PORT}/api`;
}

function resolveApiBaseUrl() {
  if (localStorage.getItem(CONFIG_VERSION_KEY) !== CONFIG_VERSION) {
    localStorage.removeItem('tar_api_base_url');
    localStorage.setItem(CONFIG_VERSION_KEY, CONFIG_VERSION);
  }

  // Optional override: ?apiBase=http://127.0.0.1:5000/api
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('apiBase');
  if (fromQuery) {
    const normalized = normalizeApiBaseUrl(fromQuery);
    if (normalized) {
      localStorage.setItem('tar_api_base_url', normalized);
      return normalized;
    }
  }

  const fromStorage = localStorage.getItem('tar_api_base_url');
  if (fromStorage) {
    const normalized = normalizeApiBaseUrl(fromStorage);
    if (normalized) return normalized;
  }

  return getDefaultApiBaseUrl();
}

const CONFIG = {
  API_BASE_URL: resolveApiBaseUrl(),
  TOKEN_KEY: 'tar_token',
  USER_KEY: 'tar_user',
  NOTIFICATION_POLL_MS: 60_000,
};

/** Public auth paths — 401 here means bad credentials, not expired session */
const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/activate', '/auth/set-password'];
