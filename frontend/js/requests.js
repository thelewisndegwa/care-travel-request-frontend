/**
 * Travel request API calls and form helpers.
 */

async function fetchMyRequests(params = {}) {
  const qs = buildQueryString(params);
  return api.get(`/requests${qs}`);
}

async function fetchPendingApprovals() {
  return api.get('/requests/pending-my-approval');
}

async function fetchRequest(id) {
  return api.get(`/requests/${id}`);
}

async function createRequest(payload) {
  return api.post('/requests', payload);
}

async function updateRequest(id, payload) {
  return api.patch(`/requests/${id}`, payload);
}

async function approveRequest(id) {
  return api.patch(`/requests/${id}/approve`, {});
}

async function rejectRequest(id, comment) {
  return api.patch(`/requests/${id}/reject`, { comment });
}

/** Build request payload from form data */
function buildRequestPayload(form) {
  const fd = new FormData(form);

  const modeOfTravel = {
    careVehicle: fd.get('mode_careVehicle') === 'on',
    publicTransport: fd.get('mode_publicTransport') === 'on',
    aircraft: fd.get('mode_aircraft') === 'on',
  };

  const passengers = [];
  const names = form.querySelectorAll('[data-passenger-name]');
  names.forEach((nameInput) => {
    const idx = nameInput.dataset.passengerName;
    const empInput = form.querySelector(`[data-passenger-employee="${idx}"]`);
    const name = nameInput.value.trim();
    const employeeNumber = empInput?.value.trim() || '';
    if (name) {
      passengers.push({ name, employeeNumber: employeeNumber || undefined });
    }
  });

  return {
    project: {
      name: fd.get('project_name')?.trim() || '',
      businessUnit: fd.get('project_businessUnit')?.trim() || '',
      fundCode: fd.get('project_fundCode')?.trim() || '',
      projectId: fd.get('project_projectId')?.trim() || '',
      departmentId: fd.get('project_departmentId')?.trim() || '',
      activityId: fd.get('project_activityId')?.trim() || '',
    },
    assignedAreaOfOperation: fd.get('assignedAreaOfOperation')?.trim() || '',
    purposeOfTrip: fd.get('purposeOfTrip')?.trim() || '',
    modeOfTravel,
    itinerary: {
      dateFrom: fd.get('itinerary_dateFrom') || '',
      dateTo: fd.get('itinerary_dateTo') || '',
      destination: fd.get('itinerary_destination')?.trim() || '',
      accommodationNeeded: fd.get('itinerary_accommodationNeeded') === 'on',
    },
    passengers,
  };
}

/** Populate form fields from a request object (for edit/resubmit) */
function populateRequestForm(form, request) {
  const set = (name, value) => {
    const el = form.elements[name];
    if (el) el.value = value ?? '';
  };

  const p = request.project || {};
  set('project_name', p.name);
  set('project_businessUnit', p.businessUnit);
  set('project_fundCode', p.fundCode);
  set('project_projectId', p.projectId);
  set('project_departmentId', p.departmentId);
  set('project_activityId', p.activityId);
  set('assignedAreaOfOperation', request.assignedAreaOfOperation);
  set('purposeOfTrip', request.purposeOfTrip);

  const modes = request.modeOfTravel || {};
  form.elements.mode_careVehicle.checked = !!modes.careVehicle;
  form.elements.mode_publicTransport.checked = !!modes.publicTransport;
  form.elements.mode_aircraft.checked = !!modes.aircraft;

  const it = request.itinerary || {};
  set('itinerary_dateFrom', it.dateFrom ? it.dateFrom.slice(0, 10) : '');
  set('itinerary_dateTo', it.dateTo ? it.dateTo.slice(0, 10) : '');
  set('itinerary_destination', it.destination);
  form.elements.itinerary_accommodationNeeded.checked = !!it.accommodationNeeded;

  const container = form.querySelector('#passengers-list');
  if (container) {
    container.innerHTML = '';
    const passengers = request.passengers?.length ? request.passengers : [{ name: '', employeeNumber: '' }];
    passengers.forEach((pass) => addPassengerRow(container, pass.name, pass.employeeNumber));
  }
}

let passengerIndex = 0;

function addPassengerRow(container, name = '', employeeNumber = '') {
  const idx = passengerIndex++;
  const row = document.createElement('div');
  row.className = 'passenger-row';
  row.innerHTML = `
    <div class="form-group">
      <label for="passenger-name-${idx}">Passenger Name</label>
      <input type="text" id="passenger-name-${idx}" data-passenger-name="${idx}" value="${escapeHtml(name)}" required />
    </div>
    <div class="form-group">
      <label for="passenger-emp-${idx}">Employee Number</label>
      <input type="text" id="passenger-emp-${idx}" data-passenger-employee="${idx}" value="${escapeHtml(employeeNumber)}" />
    </div>
    <button type="button" class="btn btn--ghost btn--sm passenger-remove" aria-label="Remove passenger">Remove</button>`;
  row.querySelector('.passenger-remove').addEventListener('click', () => {
    if (container.querySelectorAll('.passenger-row').length > 1) row.remove();
    else showToast('At least one passenger is required.', 'warning');
  });
  container.appendChild(row);
}

function initPassengerList(container) {
  passengerIndex = 0;
  container.innerHTML = '';
  addPassengerRow(container);
  const addBtn = container.closest('form')?.querySelector('#add-passenger-btn');
  if (addBtn) {
    const freshBtn = addBtn.cloneNode(true);
    addBtn.replaceWith(freshBtn);
    freshBtn.addEventListener('click', () => addPassengerRow(container));
  }
}

function getRequestId(request) {
  return request.id || request._id;
}

/** Render a request summary card for list views */
function renderRequestRow(request) {
  const dest = request.itinerary?.destination || 'No destination';
  const dates = `${formatDate(request.itinerary?.dateFrom)} – ${formatDate(request.itinerary?.dateTo)}`;
  const requester = request.requestedBy?.name || request.requestedBy?.email || '—';

  return `
    <a href="request-detail.html?id=${encodeURIComponent(getRequestId(request))}" class="request-card">
      <div class="request-card__header">
        <span class="request-card__dest">${escapeHtml(dest)}</span>
        ${statusBadge(request.status)}
      </div>
      <div class="request-card__meta">
        <span>${escapeHtml(dates)}</span>
        ${request.requestedBy ? `<span>Requested by: ${escapeHtml(requester)}</span>` : ''}
      </div>
      <p class="request-card__purpose">${escapeHtml(request.purposeOfTrip || '')}</p>
    </a>`;
}

function renderRequestDetail(request) {
  const p = request.project || {};
  const it = request.itinerary || {};
  const approver = request.approver?.name || request.approver?.email || 'Assigned by system';
  const requester = request.requestedBy?.name || request.requestedBy?.email || '—';

  let passengersHtml = '<p class="text-muted">No passengers listed</p>';
  if (request.passengers?.length) {
    passengersHtml = `<ul class="detail-list">${request.passengers
      .map(
        (pass) =>
          `<li>${escapeHtml(pass.name)}${pass.employeeNumber ? ` (${escapeHtml(pass.employeeNumber)})` : ''}</li>`
      )
      .join('')}</ul>`;
  }

  const rejectionComment = request.decision?.comment;
  let rejectionHtml = '';
  if (request.status === 'rejected' && rejectionComment) {
    rejectionHtml = `
      <section class="detail-section detail-section--rejected">
        <h3>Rejection Reason</h3>
        <p>${escapeHtml(rejectionComment)}</p>
      </section>`;
  }

  return `
    <div class="page-header">
      <div>
        <a href="javascript:history.back()" class="back-link">← Back</a>
        <h1>Request Details</h1>
      </div>
      ${statusBadge(request.status)}
    </div>

    ${rejectionHtml}

    <section class="detail-section">
      <h2>Project Information</h2>
      <dl class="detail-grid">
        <dt>Project Name</dt><dd>${escapeHtml(p.name)}</dd>
        <dt>Business Unit</dt><dd>${escapeHtml(p.businessUnit)}</dd>
        <dt>Fund Code</dt><dd>${escapeHtml(p.fundCode)}</dd>
        <dt>Project ID</dt><dd>${escapeHtml(p.projectId)}</dd>
        <dt>Department ID</dt><dd>${escapeHtml(p.departmentId)}</dd>
        <dt>Activity ID</dt><dd>${escapeHtml(p.activityId)}</dd>
      </dl>
    </section>

    <section class="detail-section">
      <h2>Trip Details</h2>
      <dl class="detail-grid">
        <dt>Area of Operation</dt><dd>${escapeHtml(request.assignedAreaOfOperation)}</dd>
        <dt>Purpose of Trip</dt><dd>${escapeHtml(request.purposeOfTrip)}</dd>
        <dt>Mode of Travel</dt><dd>${escapeHtml(formatModeOfTravel(request.modeOfTravel))}</dd>
        <dt>Destination</dt><dd>${escapeHtml(it.destination)}</dd>
        <dt>Travel Dates</dt><dd>${formatDate(it.dateFrom)} – ${formatDate(it.dateTo)}</dd>
        <dt>Accommodation Needed</dt><dd>${it.accommodationNeeded ? 'Yes' : 'No'}</dd>
      </dl>
    </section>

    <section class="detail-section">
      <h2>Passengers</h2>
      ${passengersHtml}
    </section>

    <section class="detail-section">
      <h2>Workflow</h2>
      <dl class="detail-grid">
        <dt>Requested By</dt><dd>${escapeHtml(requester)}</dd>
        <dt>Approver</dt><dd>${escapeHtml(approver)}</dd>
        <dt>Submitted</dt><dd>${formatDateTime(request.submittedAt || request.createdAt)}</dd>
        ${request.updatedAt ? `<dt>Last Updated</dt><dd>${formatDateTime(request.updatedAt)}</dd>` : ''}
      </dl>
    </section>`;
}
