/**
 * Superadmin: users list and employee import.
 */

async function fetchAllUsers() {
  return api.get('/users');
}

async function fetchCurrentUser() {
  return api.get('/users/me');
}

async function importEmployees(file) {
  const formData = new FormData();
  formData.append('file', file);
  return apiRequest('/admin/import-employees', {
    method: 'POST',
    body: formData,
  });
}

function formatManagerLabel(user) {
  if (user.manager?.name) return user.manager.name;
  if (user.manager?.email) return user.manager.email;
  if (user.managerEmail) return user.managerEmail;
  return null;
}

function renderImportSummary(result, container) {
  const summary = result.summary || result;
  const created = summary.created ?? 0;
  const updated = summary.updated ?? 0;
  const skipped = summary.skipped ?? 0;
  const invitesSent = summary.invitesSent ?? 0;
  const errors = summary.errors || [];

  let errorsHtml = '';
  if (errors.length) {
    errorsHtml = `
      <div class="import-errors">
        <h4>Errors (${errors.length})</h4>
        <ul>${errors.map((e) => {
          const text = typeof e === 'string' ? e : e.email ? `${e.email}: ${e.message}` : e.message || JSON.stringify(e);
          return `<li>${escapeHtml(text)}</li>`;
        }).join('')}</ul>
      </div>`;
  }

  container.innerHTML = `
    <div class="import-summary">
      <h3>Import Complete</h3>
      <dl class="detail-grid">
        <dt>Created</dt><dd>${created}</dd>
        <dt>Updated</dt><dd>${updated}</dd>
        <dt>Skipped</dt><dd>${skipped}</dd>
        <dt>Invites Sent</dt><dd>${invitesSent}</dd>
      </dl>
      ${errorsHtml}
    </div>`;
  container.hidden = false;
}

function renderUserRow(user) {
  return `
    <tr>
      <td>${escapeHtml(user.name)}</td>
      <td>${escapeHtml(user.email)}</td>
      <td><span class="badge badge--role">${escapeHtml(user.role)}</span></td>
      <td>${escapeHtml(formatManagerLabel(user) || '—')}</td>
      <td>${user.isActive === false ? 'Inactive' : 'Active'}</td>
    </tr>`;
}
