/**
 * Notifications API and badge polling.
 */

let notificationPollTimer = null;

async function fetchNotifications() {
  return api.get('/notifications');
}

async function markNotificationRead(id) {
  return api.patch(`/notifications/${id}/read`);
}

async function getUnreadCount() {
  try {
    const data = await fetchNotifications();
    const list = Array.isArray(data) ? data : data.data || data.notifications || [];
    return list.filter((n) => !n.read && !n.isRead).length;
  } catch {
    return 0;
  }
}

function updateBadgeElement(count) {
  const badge = document.getElementById('notifications-badge');
  if (!badge) return;
  if (count > 0) {
    badge.hidden = false;
    badge.textContent = count > 99 ? '99+' : String(count);
  } else {
    badge.hidden = true;
  }
}

async function refreshNotificationBadge() {
  const count = await getUnreadCount();
  updateBadgeElement(count);
}

function initNotificationBadge() {
  refreshNotificationBadge();
  if (notificationPollTimer) clearInterval(notificationPollTimer);
  notificationPollTimer = setInterval(refreshNotificationBadge, CONFIG.NOTIFICATION_POLL_MS);
}

function renderNotificationItem(notification) {
  const isRead = notification.read || notification.isRead;
  const title = notification.title || notification.message || 'Notification';
  const body = notification.body || notification.details || '';
  const date = formatDateTime(notification.createdAt);

  return `
    <article class="notification-item${isRead ? ' notification-item--read' : ''}" data-id="${escapeHtml(notification.id || notification._id)}">
      <div class="notification-item__content">
        <h3 class="notification-item__title">${escapeHtml(title)}</h3>
        ${body ? `<p class="notification-item__body">${escapeHtml(body)}</p>` : ''}
        <time class="notification-item__time">${date}</time>
      </div>
      ${!isRead ? `<button type="button" class="btn btn--secondary btn--sm mark-read-btn">Mark read</button>` : ''}
    </article>`;
}
