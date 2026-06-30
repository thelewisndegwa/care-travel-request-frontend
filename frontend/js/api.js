/**
 * Fetch wrapper: attaches JWT, parses JSON errors, redirects on 401.
 */

const ApiError = class extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
};

function buildApiUrl(path) {
  const base = CONFIG.API_BASE_URL.replace(/\/+$/, '');
  const route = path.startsWith('/') ? path : `/${path}`;
  return `${base}${route}`;
}

function isPublicAuthPath(path) {
  return PUBLIC_AUTH_PATHS.some((p) => path === p || path.startsWith(`${p}?`));
}

async function apiRequest(path, options = {}) {
  const url = buildApiUrl(path);
  const headers = { ...(options.headers || {}) };

  const token = typeof getToken === 'function' ? getToken() : null;
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new ApiError(
      `Cannot reach the API at ${CONFIG.API_BASE_URL}. Start the backend (npm start in care-travel-request-backend) and refresh.`,
      0,
      { network: true }
    );
  }

  if (response.status === 401 && !isPublicAuthPath(path)) {
    if (typeof clearAuth === 'function') clearAuth();
    const loginPath = pathIncludesHtml() ? 'login.html' : '/frontend/login.html';
    window.location.href = loginPath;
    throw new ApiError('Session expired. Please log in again.', 401);
  }

  const contentType = response.headers.get('content-type') || '';
  let body = null;
  if (contentType.includes('application/json')) {
    body = await response.json();
  } else if (response.status !== 204) {
    body = await response.text();
  }

  if (!response.ok) {
    const message =
      (body && body.message) ||
      (typeof body === 'string' ? body : null) ||
      `Request failed (${response.status})`;

    if (response.status === 404 && message === 'Route not found') {
      throw new ApiError(
        `${message} — requested ${url}. Check that API_BASE_URL in js/config.js ends with /api and the backend is running.`,
        response.status,
        body
      );
    }

    throw new ApiError(message, response.status, body);
  }

  return body;
}

/** Detect if we're in a flat HTML page context */
function pathIncludesHtml() {
  return window.location.pathname.endsWith('.html') || !window.location.pathname.includes('/frontend/');
}

/** Treat localhost and 127.0.0.1 as the same host for FRONTEND_URL checks */
function normalizeOriginForCompare(origin) {
  try {
    const url = new URL(origin);
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
      url.hostname = 'localhost';
    }
    return url.origin;
  } catch {
    return origin;
  }
}

/** Verify backend is reachable (GET /api/health) */
async function checkBackendConnection() {
  try {
    const response = await fetch(buildApiUrl('/health'), { method: 'GET' });
    if (!response.ok) return { ok: false, url: CONFIG.API_BASE_URL };
    const data = await response.json();
    const frontendOrigin = window.location.origin;
    const backendFrontendOrigin = data.frontendUrl
      ? new URL(data.frontendUrl).origin
      : null;
    const frontendUrlMismatch =
      backendFrontendOrigin &&
      normalizeOriginForCompare(backendFrontendOrigin) !== normalizeOriginForCompare(frontendOrigin);

    return {
      ok: data.status === 'ok',
      url: CONFIG.API_BASE_URL,
      data,
      frontendOrigin,
      backendFrontendUrl: data.frontendUrl || null,
      frontendUrlMismatch,
    };
  } catch {
    return { ok: false, url: CONFIG.API_BASE_URL };
  }
}

const api = {
  get: (path) => apiRequest(path),
  post: (path, body) => apiRequest(path, { method: 'POST', body }),
  patch: (path, body) => apiRequest(path, { method: 'PATCH', body }),
  delete: (path) => apiRequest(path, { method: 'DELETE' }),
};
