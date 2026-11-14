/**
 * Bus Route Information System — Admin Dashboard Controller
 * Handles authentication checks, CRUD for routes & stops, stop assignment, and stats
 */

// Global State
let currentAdminToken = null;
let currentAdminUser = null;
let allRoutesCache = [];
let allStopsCache = [];
let assignedStops = []; // Array of stopId strings for route form
let deleteTarget = null; // { type: 'route' | 'stop', id: string, name: string }

document.addEventListener('DOMContentLoaded', () => {
  // 1. Authentication Guard (Section 2)
  if (!checkAdminAuth()) return;

  initSidebarAndNavigation();
  initDashboard();
  initRoutesManagement();
  initStopsManagement();
  initFeedbackManagement();
});

// Authentication Guard
function checkAdminAuth() {
  const token = localStorage.getItem('adminToken');
  const userStr = localStorage.getItem('adminUser');

  if (!token || !userStr) {
    window.location.href = 'login.html';
    return false;
  }

  try {
    const user = JSON.parse(userStr);
    if (user.role !== 'admin') {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      window.location.href = 'login.html';
      return false;
    }

    currentAdminToken = token;
    currentAdminUser = user;

    const nameDisplay = document.getElementById('adminUserName');
    if (nameDisplay) {
      nameDisplay.textContent = user.name || user.email;
    }
    return true;
  } catch (err) {
    window.location.href = 'login.html';
    return false;
  }
}

// Sidebar & Tab Navigation
function initSidebarAndNavigation() {
  const sidebar = document.getElementById('adminSidebar');
  const toggleBtn = document.getElementById('sidebarToggle');
  const logoutBtn = document.getElementById('logoutBtn');
  const links = document.querySelectorAll('.sidebar-link[data-tab]');
  const topbarAddRoute = document.getElementById('topbarAddRouteBtn');
  const topbarAddStop = document.getElementById('topbarAddStopBtn');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      showToast('Logged out successfully', 'success');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 500);
    });
  }

  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tabName = link.getAttribute('data-tab');
      switchTab(tabName);
      if (window.innerWidth <= 900 && sidebar) {
        sidebar.classList.remove('open');
      }
    });
  });

  if (topbarAddRoute) {
    topbarAddRoute.addEventListener('click', () => openAddRouteModal());
  }

  if (topbarAddStop) {
    topbarAddStop.addEventListener('click', () => openAddStopModal());
  }
}

function switchTab(tabName) {
  // Update nav links
  document.querySelectorAll('.sidebar-link[data-tab]').forEach((l) => {
    l.classList.toggle('active', l.getAttribute('data-tab') === tabName);
  });

  // Update panes
  document.querySelectorAll('.admin-tab-pane').forEach((p) => {
    p.style.display = 'none';
  });

  const activePane = document.getElementById(`tabContent-${tabName}`);
  if (activePane) {
    activePane.style.display = 'block';
  }

  // Update Page Title
  const titles = {
    dashboard: 'Dashboard Overview',
    routes: 'Route Management',
    stops: 'Stop Management',
    feedback: 'User Feedback'
  };
  const titleElem = document.getElementById('pageTitle');
  if (titleElem) titleElem.textContent = titles[tabName] || 'Admin Console';

  // Trigger data refreshes on tab switch
  if (tabName === 'dashboard') loadDashboardData();
  if (tabName === 'routes') loadRoutesTable();
  if (tabName === 'stops') loadStopsTable();
  if (tabName === 'feedback') loadFeedbackTable();
}

// =========================================================================
// TAB 1: DASHBOARD OVERVIEW & STATS (Section 3 & 18)
// =========================================================================
function initDashboard() {
  loadDashboardData();
}

async function loadDashboardData() {
  try {
    const stats = await window.BusRouteAPI.getDashboardStats();

    if (stats) {
      document.getElementById('statTotalRoutes').textContent = stats.totalRoutes || 0;
      document.getElementById('statTotalStops').textContent = stats.totalStops || 0;
      document.getElementById('statActiveRoutes').textContent = stats.activeRoutes || 0;
      document.getElementById('statTotalFeedback').textContent = stats.totalFeedback || 0;

      // Render Route with Most Stops
      const mostStopsBox = document.getElementById('statMostStopsContainer');
      if (stats.routeWithMostStops) {
        mostStopsBox.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
            <span class="route-badge" style="font-size: 0.95rem;">
              🚌 Route ${escapeHtml(stats.routeWithMostStops.routeNumber)}
            </span>
            <span style="font-weight: 800; font-size: 1.15rem; color: var(--admin-accent);">
              ${stats.routeWithMostStops.stopsCount} Stops
            </span>
          </div>
          <div style="font-size: 0.95rem; font-weight: 700; color: var(--admin-text-main);">
            ${escapeHtml(stats.routeWithMostStops.startStop)} → ${escapeHtml(stats.routeWithMostStops.endStop)}
          </div>
          <div style="font-size: 0.82rem; color: var(--admin-text-muted); margin-top: 0.25rem;">
            Distance: ${stats.routeWithMostStops.distance} km
          </div>
        `;
      } else {
        mostStopsBox.innerHTML = '<p style="color: var(--admin-text-muted);">No routes available.</p>';
      }

      // Render Top Connected Stops
      const topStopsBox = document.getElementById('statTopConnectedContainer');
      if (stats.topConnectedStops && stats.topConnectedStops.length > 0) {
        topStopsBox.innerHTML = stats.topConnectedStops
          .map(
            (s) => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid #f1f5f9;">
              <span style="font-weight: 600; font-size: 0.9rem;">📍 ${escapeHtml(s.stopName)} (${escapeHtml(s.stopId)})</span>
              <span class="route-stops-count" style="font-weight: 700; background: var(--accent-blue-soft); color: var(--admin-accent);">
                ${s.routesCount} Routes
              </span>
            </div>
          `
          )
          .join('');
      } else {
        topStopsBox.innerHTML = '<p style="color: var(--admin-text-muted);">No stops registered.</p>';
      }
    }

    // Populate Overview Table
    const routes = await window.BusRouteAPI.getRoutes();
    allRoutesCache = routes;
    const tbody = document.getElementById('dashboardRoutesTableBody');
    if (!routes || routes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--admin-text-muted);">No routes registered yet.</td></tr>';
      return;
    }

    tbody.innerHTML = routes
      .slice(0, 5)
      .map(
        (r) => `
        <tr>
          <td><strong style="color: var(--admin-primary); font-size: 1rem;">Route ${escapeHtml(r.routeNumber)}</strong></td>
          <td>${escapeHtml(r.startStop)}</td>
          <td>${escapeHtml(r.endStop)}</td>
          <td>${r.distance} km</td>
          <td>${r.duration} min</td>
          <td><span class="route-stops-count">${r.stops ? r.stops.length : 0} stops</span></td>
          <td>
            <a href="../route-details.html?id=${encodeURIComponent(r.routeId || r.routeNumber)}" target="_blank" class="btn-action btn-view">
              View
            </a>
          </td>
        </tr>
      `
      )
      .join('');
  } catch (error) {
    console.error('Dashboard load error:', error);
  }
}

// =========================================================================
// TAB 2: ROUTE MANAGEMENT (Section 5, 6, 7, 8, 13)
// =========================================================================
function initRoutesManagement() {
  const searchInput = document.getElementById('searchRoutesAdminInput');
  const addBtn = document.getElementById('openAddRouteModalBtn');
  const routeForm = document.getElementById('routeForm');
  const appendStopBtn = document.getElementById('appendStopToRouteBtn');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase().trim();
      const filtered = allRoutesCache.filter(
        (r) =>
          r.routeNumber.toLowerCase().includes(q) ||
          r.startStop.toLowerCase().includes(q) ||
          r.endStop.toLowerCase().includes(q)
      );
      renderRoutesTableRows(filtered);
    });
  }

  if (addBtn) {
    addBtn.addEventListener('click', () => openAddRouteModal());
  }

  if (appendStopBtn) {
    appendStopBtn.addEventListener('click', () => {
      const select = document.getElementById('addStopPickerSelect');
      const stopId = select.value;
      if (!stopId) return;

      if (assignedStops.includes(stopId)) {
        showToast(`Stop ${stopId} is already added in this route`, 'error');
        return;
      }

      assignedStops.push(stopId);
      renderAssignedStopsList();
      select.value = '';
    });
  }

  if (routeForm) {
    routeForm.addEventListener('submit', handleSaveRoute);
  }

  loadRoutesTable();
}

async function loadRoutesTable() {
  const tbody = document.getElementById('routesAdminTableBody');
  tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;"><div class="spinner"></div></td></tr>';

  try {
    const routes = await window.BusRouteAPI.getRoutes();
    allRoutesCache = routes;
    renderRoutesTableRows(routes);
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--admin-red);">Failed to load routes: ${escapeHtml(error.message)}</td></tr>`;
  }
}

function renderRoutesTableRows(routes) {
  const tbody = document.getElementById('routesAdminTableBody');
  if (!routes || routes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--admin-text-muted); padding: 2rem;">No matching routes found.</td></tr>';
    return;
  }

  tbody.innerHTML = routes
    .map((r) => {
      const first = r.timings ? r.timings.firstTrip : (r.firstTrip || 'N/A');
      const last = r.timings ? r.timings.lastTrip : (r.lastTrip || 'N/A');
      const stopsCount = r.stops ? r.stops.length : 0;
      const targetId = r.routeId || r.routeNumber;

      return `
        <tr>
          <td><strong style="color: var(--admin-primary); font-size: 1rem;">Route ${escapeHtml(r.routeNumber)}</strong></td>
          <td>${escapeHtml(r.startStop)}</td>
          <td>${escapeHtml(r.endStop)}</td>
          <td>${r.distance} km</td>
          <td>${r.duration} min</td>
          <td><small style="color: var(--admin-text-muted);">${escapeHtml(first)} - ${escapeHtml(last)}</small></td>
          <td><span class="route-stops-count">${stopsCount} stops</span></td>
          <td style="text-align: right; white-space: nowrap;">
            <a href="../route-details.html?id=${encodeURIComponent(targetId)}" target="_blank" class="btn-action btn-view" title="View Public Page">
              View
            </a>
            <button class="btn-action btn-edit" onclick="openEditRouteModal('${escapeHtml(targetId)}')" title="Edit Route">
              Edit
            </button>
            <button class="btn-action btn-delete" onclick="promptDeleteRoute('${escapeHtml(targetId)}', '${escapeHtml(r.routeNumber)}')" title="Delete Route">
              Delete
            </button>
          </td>
        </tr>
      `;
    })
    .join('');
}

// Open Add Route Modal
async function openAddRouteModal() {
  document.getElementById('routeModalTitle').textContent = 'Add New Bus Route';
  document.getElementById('routeEditId').value = '';
  document.getElementById('routeForm').reset();
  hideRouteModalAlert();

  assignedStops = [];
  await populateStopsPickerSelect();
  renderAssignedStopsList();

  document.getElementById('routeModal').style.display = 'flex';
  document.getElementById('formRouteNumber').focus();
}

// Open Edit Route Modal
async function openEditRouteModal(routeId) {
  document.getElementById('routeModalTitle').textContent = `Edit Route ${routeId}`;
  document.getElementById('routeEditId').value = routeId;
  hideRouteModalAlert();

  await populateStopsPickerSelect();

  try {
    const route = await window.BusRouteAPI.getRouteById(routeId);
    if (!route) throw new Error('Route not found');

    document.getElementById('formRouteNumber').value = route.routeNumber || '';
    document.getElementById('formRouteId').value = route.routeId || '';
    document.getElementById('formStartStop').value = route.startStop || '';
    document.getElementById('formEndStop').value = route.endStop || '';
    document.getElementById('formDistance').value = route.distance || '';
    document.getElementById('formDuration').value = route.duration || '';
    document.getElementById('formFirstTrip').value = route.timings ? route.timings.firstTrip : '';
    document.getElementById('formLastTrip').value = route.timings ? route.timings.lastTrip : '';

    assignedStops = Array.isArray(route.stops) ? [...route.stops] : [];
    renderAssignedStopsList();

    document.getElementById('routeModal').style.display = 'flex';
  } catch (error) {
    showToast('Failed to load route for editing: ' + error.message, 'error');
  }
}

function closeRouteModal() {
  document.getElementById('routeModal').style.display = 'none';
}

async function populateStopsPickerSelect() {
  const select = document.getElementById('addStopPickerSelect');
  try {
    const stops = await window.BusRouteAPI.getStops();
    allStopsCache = stops;
    stops.sort((a, b) => a.stopName.localeCompare(b.stopName));

    select.innerHTML = [
      '<option value="" disabled selected>-- Select a stop to append --</option>',
      ...stops.map((s) => `<option value="${s.stopId}">${escapeHtml(s.stopName)} (${s.stopId})</option>`)
    ].join('');
  } catch (err) {
    select.innerHTML = '<option value="" disabled>Error loading stops</option>';
  }
}

// Render Assigned Stops with Up/Down and Remove controls (Section 13)
function renderAssignedStopsList() {
  const container = document.getElementById('assignedStopsListContainer');
  const counter = document.getElementById('assignedStopsCounter');
  counter.textContent = `${assignedStops.length} Stop${assignedStops.length === 1 ? '' : 's'}`;

  if (assignedStops.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--admin-text-muted); padding: 1.5rem; font-size: 0.88rem;">
        No stops assigned yet. Select stops from above to add in order.
      </div>
    `;
    return;
  }

  const stopMap = new Map();
  allStopsCache.forEach((s) => stopMap.set(s.stopId, s));

  container.innerHTML = assignedStops
    .map((sid, index) => {
      const stopObj = stopMap.get(sid);
      const stopName = stopObj ? stopObj.stopName : sid;
      const isFirst = index === 0;
      const isLast = index === assignedStops.length - 1;

      return `
        <div class="stop-assign-item ${isFirst ? 'selected' : ''}">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-weight: 800; color: var(--admin-primary); width: 20px;">${index + 1}.</span>
            <span><strong>${escapeHtml(stopName)}</strong> <small style="color: var(--admin-text-muted);">(${escapeHtml(sid)})</small></span>
            ${isFirst ? '<span class="stop-type-badge start-badge" style="margin-left: 0.4rem;">Start</span>' : ''}
            ${isLast && assignedStops.length > 1 ? '<span class="stop-type-badge end-badge" style="margin-left: 0.4rem;">End</span>' : ''}
          </div>

          <div class="reorder-btns">
            <button type="button" class="reorder-btn" title="Move Up" onclick="moveAssignedStop(${index}, -1)" ${isFirst ? 'disabled style="opacity: 0.3;"' : ''}>▲</button>
            <button type="button" class="reorder-btn" title="Move Down" onclick="moveAssignedStop(${index}, 1)" ${isLast ? 'disabled style="opacity: 0.3;"' : ''}>▼</button>
            <button type="button" class="reorder-btn" title="Remove" style="color: #ef4444;" onclick="removeAssignedStop(${index})">✕</button>
          </div>
        </div>
      `;
    })
    .join('');

  // Auto-fill Start Stop and End Stop names if fields are empty
  if (assignedStops.length >= 1) {
    const firstStopObj = stopMap.get(assignedStops[0]);
    const startInput = document.getElementById('formStartStop');
    if (firstStopObj && (!startInput.value || startInput.value === '')) {
      startInput.value = firstStopObj.stopName;
    }
  }
  if (assignedStops.length >= 2) {
    const lastStopObj = stopMap.get(assignedStops[assignedStops.length - 1]);
    const endInput = document.getElementById('formEndStop');
    if (lastStopObj && (!endInput.value || endInput.value === '')) {
      endInput.value = lastStopObj.stopName;
    }
  }
}

window.moveAssignedStop = (index, delta) => {
  const targetIndex = index + delta;
  if (targetIndex < 0 || targetIndex >= assignedStops.length) return;
  const temp = assignedStops[index];
  assignedStops[index] = assignedStops[targetIndex];
  assignedStops[targetIndex] = temp;
  renderAssignedStopsList();
};

window.removeAssignedStop = (index) => {
  assignedStops.splice(index, 1);
  renderAssignedStopsList();
};

// Handle Route Form Submit (Create / Update)
async function handleSaveRoute(e) {
  e.preventDefault();
  hideRouteModalAlert();

  const editId = document.getElementById('routeEditId').value;
  const routeNumber = document.getElementById('formRouteNumber').value.trim();
  const routeId = document.getElementById('formRouteId').value.trim();
  const startStop = document.getElementById('formStartStop').value.trim();
  const endStop = document.getElementById('formEndStop').value.trim();
  const distance = parseFloat(document.getElementById('formDistance').value);
  const duration = parseInt(document.getElementById('formDuration').value, 10);
  const firstTrip = document.getElementById('formFirstTrip').value.trim();
  const lastTrip = document.getElementById('formLastTrip').value.trim();

  // Route Validation (Section 6 & 14)
  if (!routeNumber || !startStop || !endStop || isNaN(distance) || isNaN(duration) || !firstTrip || !lastTrip) {
    showRouteModalAlert('All fields are required and must have valid values.');
    return;
  }

  // Minimum 2 stops validation
  if (!assignedStops || assignedStops.length < 2) {
    showRouteModalAlert('Route must contain at least 2 stops. Please add stops using the selector above.');
    return;
  }

  const payload = {
    routeNumber,
    startStop,
    endStop,
    distance,
    duration,
    stops: assignedStops,
    timings: {
      firstTrip,
      lastTrip
    }
  };
  if (routeId) payload.routeId = routeId;

  const submitBtn = document.getElementById('saveRouteSubmitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'SAVING ROUTE...';

  try {
    if (editId) {
      // Update existing route (Section 7)
      await window.BusRouteAPI.updateRoute(editId, payload, currentAdminToken);
      showToast(`Route ${routeNumber} updated successfully.`, 'success');
    } else {
      // Create new route (Section 6)
      await window.BusRouteAPI.createRoute(payload, currentAdminToken);
      showToast(`Route ${routeNumber} created successfully.`, 'success');
    }

    closeRouteModal();
    loadRoutesTable();
    loadDashboardData();
  } catch (error) {
    showRouteModalAlert(error.message || 'Failed to save route. Please check your data.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'SAVE ROUTE';
  }
}

function showRouteModalAlert(msg) {
  const alert = document.getElementById('routeModalAlert');
  const alertMsg = document.getElementById('routeModalAlertMsg');
  alert.className = 'form-alert error';
  alertMsg.textContent = msg;
  alert.style.display = 'flex';
}

function hideRouteModalAlert() {
  document.getElementById('routeModalAlert').style.display = 'none';
}

// Prompt Route Deletion (Section 8)
function promptDeleteRoute(routeId, routeNumber) {
  deleteTarget = { type: 'route', id: routeId, name: `Route ${routeNumber}` };
  document.getElementById('deleteModalTitle').textContent = 'Confirm Route Deletion';
  document.getElementById('deleteModalPromptText').innerHTML = `
    Are you sure you want to delete <strong>Route ${escapeHtml(routeNumber)}</strong>?<br>
    This will remove the route from transit searches and disconnect it from all associated stops.
  `;
  document.getElementById('deleteModalWarningBox').style.display = 'none';
  document.getElementById('confirmDeleteBtn').disabled = false;
  document.getElementById('deleteConfirmModal').style.display = 'flex';
}

// =========================================================================
// TAB 3: STOP MANAGEMENT (Section 9, 10, 11, 12)
// =========================================================================
function initStopsManagement() {
  const searchInput = document.getElementById('searchStopsAdminInput');
  const addBtn = document.getElementById('openAddStopModalBtn');
  const stopForm = document.getElementById('stopForm');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase().trim();
      const filtered = allStopsCache.filter(
        (s) =>
          s.stopId.toLowerCase().includes(q) ||
          s.stopName.toLowerCase().includes(q)
      );
      renderStopsTableRows(filtered);
    });
  }

  if (addBtn) {
    addBtn.addEventListener('click', () => openAddStopModal());
  }

  if (stopForm) {
    stopForm.addEventListener('submit', handleSaveStop);
  }

  loadStopsTable();
}

async function loadStopsTable() {
  const tbody = document.getElementById('stopsAdminTableBody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;"><div class="spinner"></div></td></tr>';

  try {
    const stops = await window.BusRouteAPI.getStops();
    allStopsCache = stops;
    renderStopsTableRows(stops);
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--admin-red);">Failed to load stops: ${escapeHtml(error.message)}</td></tr>`;
  }
}

function renderStopsTableRows(stops) {
  const tbody = document.getElementById('stopsAdminTableBody');
  if (!stops || stops.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--admin-text-muted); padding: 2rem;">No matching stops found.</td></tr>';
    return;
  }

  tbody.innerHTML = stops
    .map((s) => {
      const lat = s.latitude !== undefined && s.latitude !== null ? s.latitude.toFixed(4) : '—';
      const lon = s.longitude !== undefined && s.longitude !== null ? s.longitude.toFixed(4) : '—';
      const connected = s.connectedRoutes || [];

      return `
        <tr>
          <td><strong style="color: var(--admin-primary);">${escapeHtml(s.stopId)}</strong></td>
          <td><strong>${escapeHtml(s.stopName)}</strong></td>
          <td>${lat}</td>
          <td>${lon}</td>
          <td>
            <span class="route-stops-count" style="font-weight: 700;">
              ${connected.length} routes (${escapeHtml(connected.join(', ') || 'none')})
            </span>
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="btn-action btn-edit" onclick="openEditStopModal('${escapeHtml(s.stopId)}')" title="Edit Stop">
              Edit
            </button>
            <button class="btn-action btn-delete" onclick="promptDeleteStop('${escapeHtml(s.stopId)}', '${escapeHtml(s.stopName)}', ${connected.length})" title="Delete Stop">
              Delete
            </button>
          </td>
        </tr>
      `;
    })
    .join('');
}

// Open Add Stop Modal (Section 10)
function openAddStopModal() {
  document.getElementById('stopModalTitle').textContent = 'Add New Bus Stop';
  document.getElementById('stopEditMode').value = 'add';
  const idInput = document.getElementById('formStopId');
  idInput.disabled = false;
  idInput.value = '';
  document.getElementById('formStopName').value = '';
  document.getElementById('formLatitude').value = '';
  document.getElementById('formLongitude').value = '';
  hideStopModalAlert();

  document.getElementById('stopModal').style.display = 'flex';
  idInput.focus();
}

// Open Edit Stop Modal (Section 11)
function openEditStopModal(stopId) {
  const stop = allStopsCache.find((s) => s.stopId === stopId);
  if (!stop) return;

  document.getElementById('stopModalTitle').textContent = `Edit Stop ${stopId}`;
  document.getElementById('stopEditMode').value = 'edit';
  const idInput = document.getElementById('formStopId');
  idInput.value = stop.stopId;
  idInput.disabled = true; // Stop ID should not be changed (Section 11)

  document.getElementById('formStopName').value = stop.stopName || '';
  document.getElementById('formLatitude').value = stop.latitude !== undefined ? stop.latitude : '';
  document.getElementById('formLongitude').value = stop.longitude !== undefined ? stop.longitude : '';
  hideStopModalAlert();

  document.getElementById('stopModal').style.display = 'flex';
  document.getElementById('formStopName').focus();
}

function closeStopModal() {
  document.getElementById('stopModal').style.display = 'none';
}

// Handle Save Stop Submit
async function handleSaveStop(e) {
  e.preventDefault();
  hideStopModalAlert();

  const mode = document.getElementById('stopEditMode').value;
  const stopId = document.getElementById('formStopId').value.trim();
  const stopName = document.getElementById('formStopName').value.trim();
  const latVal = document.getElementById('formLatitude').value;
  const lonVal = document.getElementById('formLongitude').value;

  if (!stopId || !stopName) {
    showStopModalAlert('Stop ID and Stop Name are required.');
    return;
  }

  const payload = {
    stopId,
    stopName,
    latitude: latVal !== '' ? parseFloat(latVal) : undefined,
    longitude: lonVal !== '' ? parseFloat(lonVal) : undefined
  };

  const submitBtn = document.getElementById('saveStopSubmitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'SAVING STOP...';

  try {
    if (mode === 'edit') {
      await window.BusRouteAPI.updateStop(stopId, payload, currentAdminToken);
      showToast(`Stop '${stopName}' updated successfully.`, 'success');
    } else {
      await window.BusRouteAPI.createStop(payload, currentAdminToken);
      showToast(`Stop '${stopName}' (${stopId}) created successfully.`, 'success');
    }

    closeStopModal();
    loadStopsTable();
    loadDashboardData();
  } catch (error) {
    showStopModalAlert(error.message || 'Failed to save stop.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'SAVE STOP';
  }
}

function showStopModalAlert(msg) {
  const alert = document.getElementById('stopModalAlert');
  const alertMsg = document.getElementById('stopModalAlertMsg');
  alert.className = 'form-alert error';
  alertMsg.textContent = msg;
  alert.style.display = 'flex';
}

function hideStopModalAlert() {
  document.getElementById('stopModalAlert').style.display = 'none';
}

// Prompt Stop Deletion with Safety Check (Section 12)
function promptDeleteStop(stopId, stopName, connectedCount) {
  deleteTarget = { type: 'stop', id: stopId, name: stopName };
  document.getElementById('deleteModalTitle').textContent = 'Confirm Stop Deletion';

  const promptText = document.getElementById('deleteModalPromptText');
  const warningBox = document.getElementById('deleteModalWarningBox');
  const warningMsg = document.getElementById('deleteModalWarningMsg');
  const confirmBtn = document.getElementById('confirmDeleteBtn');

  if (connectedCount > 0) {
    // Safety requirement (Section 12): Prevent deleting stops in active use
    promptText.innerHTML = `Cannot delete stop <strong>${escapeHtml(stopName)} (${escapeHtml(stopId)})</strong>.`;
    warningMsg.innerHTML = `
      <strong>Safety Warning:</strong> This stop is currently used by one or more active routes (${connectedCount} route connections).<br>
      Please remove this stop from those routes before deleting it.
    `;
    warningBox.style.display = 'flex';
    confirmBtn.disabled = true;
  } else {
    promptText.innerHTML = `Are you sure you want to delete stop <strong>${escapeHtml(stopName)} (${escapeHtml(stopId)})</strong>?`;
    warningBox.style.display = 'none';
    confirmBtn.disabled = false;
  }

  document.getElementById('deleteConfirmModal').style.display = 'flex';
}

// =========================================================================
// DELETION CONFIRMATION HANDLER
// =========================================================================
function closeDeleteModal() {
  document.getElementById('deleteConfirmModal').style.display = 'none';
  deleteTarget = null;
}

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
  if (!deleteTarget) return;

  const confirmBtn = document.getElementById('confirmDeleteBtn');
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'DELETING...';

  try {
    if (deleteTarget.type === 'route') {
      await window.BusRouteAPI.deleteRoute(deleteTarget.id, currentAdminToken);
      showToast(`${deleteTarget.name} deleted successfully.`, 'success');
      loadRoutesTable();
    } else if (deleteTarget.type === 'stop') {
      await window.BusRouteAPI.deleteStop(deleteTarget.id, currentAdminToken);
      showToast(`Stop '${deleteTarget.name}' deleted successfully.`, 'success');
      loadStopsTable();
    }

    loadDashboardData();
    closeDeleteModal();
  } catch (error) {
    showToast('Failed to delete: ' + error.message, 'error');
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'DELETE';
  }
});

// =========================================================================
// TAB 4: USER FEEDBACK (Section 16)
// =========================================================================
function initFeedbackManagement() {
  loadFeedbackTable();
}

async function loadFeedbackTable() {
  const tbody = document.getElementById('feedbackTableBody');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;"><div class="spinner"></div></td></tr>';

  try {
    const feedbackList = await window.BusRouteAPI.getFeedback();

    if (!feedbackList || feedbackList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--admin-text-muted); padding: 2rem;">No feedback submitted yet.</td></tr>';
      return;
    }

    tbody.innerHTML = feedbackList
      .map((f) => {
        const dateStr = f.createdAt ? new Date(f.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent';
        return `
          <tr>
            <td><small style="color: var(--admin-text-muted); font-weight: 600;">${dateStr}</small></td>
            <td><code>${escapeHtml(f.feedbackId || '—')}</code></td>
            <td><strong style="color: var(--admin-primary);">${escapeHtml(f.routeId || 'General')}</strong></td>
            <td>${escapeHtml(f.userId || 'Passenger')}</td>
            <td>${escapeHtml(f.message)}</td>
          </tr>
        `;
      })
      .join('');
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--admin-red);">Failed to load feedback: ${escapeHtml(error.message)}</td></tr>`;
  }
}

// Toast Notification Helper (Section 24)
function showToast(message, type = 'success') {
  const toast = document.getElementById('adminToast');
  const msgElem = document.getElementById('toastMessage');
  const iconElem = document.getElementById('toastIcon');

  toast.className = `admin-toast ${type} show`;
  msgElem.textContent = message;
  iconElem.textContent = type === 'success' ? '✓' : '⚠️';

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// Security Escape Helper
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Make functions globally accessible for HTML onclick handlers
window.openAddRouteModal = openAddRouteModal;
window.openEditRouteModal = openEditRouteModal;
window.closeRouteModal = closeRouteModal;
window.promptDeleteRoute = promptDeleteRoute;
window.openAddStopModal = openAddStopModal;
window.openEditStopModal = openEditStopModal;
window.closeStopModal = closeStopModal;
window.promptDeleteStop = promptDeleteStop;
window.closeDeleteModal = closeDeleteModal;
window.switchTab = switchTab;
