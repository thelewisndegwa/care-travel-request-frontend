/**
 * UI helpers: toasts, loading states, status badges, app shell layout.
 */

const STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

function showToast(message, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'alert');
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast--fade');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function setLoading(button, loading, loadingText = 'Please wait…') {
  if (!button) return;
  if (loading) {
    button.dataset.originalText = button.textContent;
    button.disabled = true;
    button.classList.add('is-loading');
    button.textContent = loadingText;
  } else {
    button.disabled = false;
    button.classList.remove('is-loading');
    button.textContent = button.dataset.originalText || button.textContent;
  }
}

function statusBadge(status) {
  const label = STATUS_LABELS[status] || status;
  return `<span class="badge badge--${escapeHtml(status)}">${escapeHtml(label)}</span>`;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return escapeHtml(dateStr);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return escapeHtml(dateStr);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Render API validation errors into a container element */
function renderApiErrors(container, error) {
  if (!container) return;
  container.hidden = true;
  container.innerHTML = '';

  const messages = [];
  if (error instanceof ApiError) {
    messages.push(error.message);
    const body = error.body;
    if (body?.network) {
      messages.push('Ensure care-travel-request-backend is running: npm start (port 5000).');
    }
    if (body?.details?.code === 'ACCOUNT_NOT_ACTIVATED') {
      messages.push('Please check your email for the activation link.');
    }
    if (body?.errors && Array.isArray(body.errors)) {
      body.errors.forEach((e) => {
        if (typeof e === 'string') messages.push(e);
        else if (e.msg) messages.push(e.path ? `${e.path}: ${e.msg}` : e.msg);
        else if (e.message) messages.push(e.message);
        else if (e.field && e.msg) messages.push(`${e.field}: ${e.msg}`);
        else messages.push(JSON.stringify(e));
      });
    }
    if (body?.details && typeof body.details === 'string') {
      messages.push(body.details);
    }
  } else if (error?.message) {
    messages.push(error.message);
  } else {
    messages.push('An unexpected error occurred.');
  }

  if (messages.length) {
    container.hidden = false;
    container.innerHTML = `<ul>${messages.map((m) => `<li>${escapeHtml(m)}</li>`).join('')}</ul>`;
  }
}

/** Show API connectivity status on login / activate pages */
async function showBackendConnectionStatus(containerId) {
  const container = document.getElementById(containerId);
  if (!container || typeof checkBackendConnection !== 'function') return;

  const result = await checkBackendConnection();
  if (result.ok && !result.frontendUrlMismatch) {
    container.hidden = true;
    return;
  }

  if (result.ok && result.frontendUrlMismatch) {
    container.hidden = false;
    container.className = 'alert alert--warning';
    container.innerHTML = `
      <strong>Backend connected, but activation links may be wrong</strong>
      <ul>
        <li>You are on: <code>${escapeHtml(result.frontendOrigin)}</code></li>
        <li>Backend <code>FRONTEND_URL</code>: <code>${escapeHtml(result.backendFrontendUrl)}</code></li>
        <li>Update <code>FRONTEND_URL</code> in the backend <code>.env</code> to match your frontend URL, then restart the backend.</li>
      </ul>`;
    return;
  }

  container.hidden = false;
  container.className = 'alert alert--error';
  container.innerHTML = `
    <strong>Backend not reachable</strong>
    <ul>
      <li>Expected API: <code>${escapeHtml(result.url)}</code></li>
      <li>Start the backend: <code>cd care-travel-request-backend && npm start</code></li>
      <li>Open this frontend on a different port (e.g. Live Server on <code>http://localhost:5500</code>).</li>
      <li>Override API URL: add <code>?apiBase=http://127.0.0.1:5000/api</code> to this page URL.</li>
    </ul>`;
}

function showEmptyState(container, message, actionHtml = '') {
  container.innerHTML = `
    <div class="empty-state">
      <p>${escapeHtml(message)}</p>
      ${actionHtml}
    </div>`;
}

function showPageLoading(container, message = 'Loading…') {
  container.innerHTML = `<div class="page-loading"><span class="spinner"></span> ${escapeHtml(message)}</div>`;
}

/** Navigation items by role */
function getNavItems() {
  const user = getUser();
  if (!user) return [];

  const items = [];

  if (user.role === 'superadmin') {
    items.push(
      { href: 'requests.html?scope=all', label: 'All Requests', id: 'all-requests' },
      { href: 'admin-users.html', label: 'All Users', id: 'admin-users' },
      { href: 'admin-import.html', label: 'Import Employees', id: 'admin-import' }
    );
  } else {
    items.push(
      { href: 'requests.html', label: 'My Requests', id: 'my-requests' },
      { href: 'request-new.html', label: 'New Request', id: 'new-request' }
    );
    if (user.role === 'admin') {
      items.push(
        { href: 'approvals.html', label: 'Pending My Approval', id: 'approvals' },
        { href: 'requests.html?scope=team', label: 'Team Requests', id: 'team-requests' }
      );
    }
  }

  items.push(
    { href: 'notifications.html', label: 'Notifications', id: 'notifications' },
    { href: 'dashboard.html', label: 'My Profile', id: 'profile' }
  );

  return items;
}

/**
 * Render shared app shell (header + sidebar).
 * @param {string} activeId - nav item id to mark active
 */
function renderAppShell(activeId) {
  const user = getUser();
  if (!user) return;

  const shell = document.getElementById('app-shell');
  if (!shell) return;

  const navItems = getNavItems();
  const navHtml = navItems
    .map(
      (item) =>
        `<a href="${item.href}" class="nav-link${item.id === activeId ? ' nav-link--active' : ''}" data-nav="${item.id}">${escapeHtml(item.label)}</a>`
    )
    .join('');

  shell.innerHTML = `
    <header class="app-header">
      <div class="app-header__brand">
        <span class="app-header__logo">CARE</span>
        <span class="app-header__title">Travel Authority Request</span>
      </div>
      <div class="app-header__actions">
        <a href="notifications.html" class="notifications-link" id="notifications-badge-link" title="Notifications">
          <span class="notifications-icon" aria-hidden="true">🔔</span>
          <span class="notifications-badge" id="notifications-badge" hidden>0</span>
        </a>
        <div class="user-menu">
          <span class="user-menu__name">${escapeHtml(user.name)}</span>
          <span class="user-menu__role badge badge--role">${escapeHtml(user.role)}</span>
          <button type="button" class="btn btn--ghost btn--sm" id="logout-btn">Log out</button>
        </div>
      </div>
    </header>
    <div class="app-body">
      <nav class="app-sidebar" aria-label="Main navigation">
        ${navHtml}
      </nav>
      <main class="app-main" id="app-main">
        <!-- page content injected by each page -->
      </main>
    </div>`;

  document.getElementById('logout-btn')?.addEventListener('click', logout);

  if (typeof initNotificationBadge === 'function') {
    initNotificationBadge();
  }
}

/** Move page-specific content into app-main after shell renders */
function mountPageContent(contentSelector) {
  const main = document.getElementById('app-main');
  const content = document.querySelector(contentSelector);
  if (main && content) {
    main.appendChild(content);
    content.hidden = false;
  }
}

function buildQueryString(params) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      qs.set(key, String(value));
    }
  });
  const str = qs.toString();
  return str ? `?${str}` : '';
}

function confirmAction(message) {
  return window.confirm(message);
}

function formatModeOfTravel(modes) {
  if (!modes) return '—';
  const labels = [];
  if (modes.careVehicle) labels.push('CARE Vehicle');
  if (modes.publicTransport) labels.push('Public Transport');
  if (modes.aircraft) labels.push('Aircraft');
  return labels.length ? labels.join(', ') : '—';
}

function renderPagination(container, pagination, onPageChange) {
  if (!pagination || pagination.totalPages <= 1) {
    container.innerHTML = '';
    container.hidden = true;
    return;
  }
  container.hidden = false;
  const { page, totalPages, total } = pagination;

  let html = `<div class="pagination">
    <span class="pagination__info">${total} total · Page ${page} of ${totalPages}</span>
    <div class="pagination__buttons">`;

  if (page > 1) {
    html += `<button type="button" class="btn btn--secondary btn--sm" data-page="${page - 1}">Previous</button>`;
  }
  if (page < totalPages) {
    html += `<button type="button" class="btn btn--secondary btn--sm" data-page="${page + 1}">Next</button>`;
  }

  html += '</div></div>';
  container.innerHTML = html;

  container.querySelectorAll('[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => onPageChange(Number(btn.dataset.page)));
  });
}
