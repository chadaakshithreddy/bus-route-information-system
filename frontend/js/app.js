/**
 * Application Logic for Home Page (index.html)
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initSystemHealthCheck();
  initHeroSearchAndSuggestions();
  initQuickTags();
  initPathFinder();
  loadAvailableRoutes();
});

// 1. Mobile Navigation Toggle
function initMobileNav() {
  const toggleBtn = document.getElementById('mobileNavToggle');
  const navMenu = document.getElementById('navMenu');
  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', () => {
      navMenu.classList.toggle('open');
    });
  }
}

// 2. System Health Status Indicator in Footer
async function initSystemHealthCheck() {
  const statusBadge = document.getElementById('systemStatusBadge');
  const statusText = document.getElementById('systemStatusText');
  if (!statusBadge || !statusText) return;

  try {
    const health = await window.BusRouteAPI.checkHealth();
    if (health.success) {
      statusBadge.style.background = 'rgba(16, 185, 129, 0.2)';
      statusBadge.style.color = '#10b981';
      statusText.textContent = 'API Operational';
    }
  } catch (error) {
    statusBadge.style.background = 'rgba(239, 68, 68, 0.2)';
    statusBadge.style.color = '#ef4444';
    statusText.textContent = 'API Offline';
  }
}

// 3. Hero Search & Autocomplete Suggestions (Section 6, 7, 17)
function initHeroSearchAndSuggestions() {
  const searchForm = document.getElementById('heroSearchForm');
  const searchInput = document.getElementById('heroSearchInput');
  const suggestionsDropdown = document.getElementById('heroSuggestionsDropdown');

  if (!searchForm || !searchInput) return;

  // Form submission: redirect to search.html with query
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (query) {
      window.location.href = `search.html?q=${encodeURIComponent(query)}`;
    }
  });

  // Debounced autocomplete suggestions
  let debounceTimeout = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimeout);
    const text = searchInput.value.trim();

    if (text.length < 2) {
      suggestionsDropdown.style.display = 'none';
      suggestionsDropdown.innerHTML = '';
      return;
    }

    debounceTimeout = setTimeout(async () => {
      try {
        const stops = await window.BusRouteAPI.searchStops(text);
        renderSuggestions(stops, text);
      } catch (err) {
        suggestionsDropdown.style.display = 'none';
      }
    }, 250);
  });

  // Hide suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!searchForm.contains(e.target)) {
      suggestionsDropdown.style.display = 'none';
    }
  });

  function renderSuggestions(stops, query) {
    if (!stops || stops.length === 0) {
      suggestionsDropdown.style.display = 'none';
      return;
    }

    suggestionsDropdown.innerHTML = stops
      .slice(0, 6)
      .map(
        (stop) => `
        <div class="suggestion-item" data-value="${escapeHtml(stop.stopName)}">
          <div>
            <span style="font-weight: 700; color: var(--text-main);">📍 ${escapeHtml(stop.stopName)}</span>
            <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 0.5rem;">(${stop.stopId})</span>
          </div>
          <span class="suggestion-type">Stop</span>
        </div>
      `
      )
      .join('');

    suggestionsDropdown.style.display = 'block';

    // Click handler for suggestion items
    const items = suggestionsDropdown.querySelectorAll('.suggestion-item');
    items.forEach((item) => {
      item.addEventListener('click', () => {
        const val = item.getAttribute('data-value');
        searchInput.value = val;
        suggestionsDropdown.style.display = 'none';
        window.location.href = `search.html?q=${encodeURIComponent(val)}`;
      });
    });
  }
}

// 4. Quick Search Tag Chips
function initQuickTags() {
  const tagButtons = document.querySelectorAll('.tag-btn[data-query]');
  tagButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const q = btn.getAttribute('data-query');
      window.location.href = `search.html?q=${encodeURIComponent(q)}`;
    });
  });
}

// 5. Find Route Between Two Stops (Section 11, 12, 13, 14, 23)
async function initPathFinder() {
  const fromSelect = document.getElementById('fromStopSelect');
  const toSelect = document.getElementById('toStopSelect');
  const swapBtn = document.getElementById('swapStopsBtn');
  const pathForm = document.getElementById('pathFinderForm');
  const alertBox = document.getElementById('pathAlertBox');
  const alertMsg = document.getElementById('pathAlertMsg');
  const resultsContainer = document.getElementById('pathResultsContainer');

  if (!fromSelect || !toSelect || !pathForm) return;

  // Load master stops list from API
  try {
    const stops = await window.BusRouteAPI.getStops();
    stops.sort((a, b) => a.stopName.localeCompare(b.stopName));

    const optionsHtml = [
      '<option value="" disabled selected>Select stop...</option>',
      ...stops.map((s) => `<option value="${s.stopId}">${escapeHtml(s.stopName)} (${s.stopId})</option>`)
    ].join('');

    fromSelect.innerHTML = optionsHtml;
    toSelect.innerHTML = optionsHtml;
  } catch (error) {
    fromSelect.innerHTML = '<option value="" disabled>Error loading stops</option>';
    toSelect.innerHTML = '<option value="" disabled>Error loading stops</option>';
    showAlert('Unable to load stops from server. Please check your backend connection.', 'error');
  }

  // Swap Stops Button
  if (swapBtn) {
    swapBtn.addEventListener('click', () => {
      const tempVal = fromSelect.value;
      fromSelect.value = toSelect.value;
      toSelect.value = tempVal;
      hideAlert();
    });
  }

  // Handle Form Submission
  pathForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const fromStopId = fromSelect.value;
    const toStopId = toSelect.value;

    // Validation 1: Ensure both are selected
    if (!fromStopId || !toStopId) {
      showAlert('Please select both starting and destination stops.', 'warning');
      return;
    }

    // Validation 2: Ensure FROM != TO (Section 23)
    if (fromStopId === toStopId) {
      showAlert('Please select two different stops.', 'warning');
      return;
    }

    // Display loading state (Section 15)
    resultsContainer.style.display = 'block';
    resultsContainer.innerHTML = `
      <div class="state-box">
        <div class="spinner"></div>
        <h4 class="state-title">Searching Direct Routes...</h4>
        <p class="state-desc">Checking all route schedules connecting your selected stops...</p>
      </div>
    `;

    try {
      const result = await window.BusRouteAPI.findRoutesBetweenStops(fromStopId, toStopId);
      const routes = result.routes || [];

      if (routes.length === 0) {
        // No Route Found State (Section 14)
        resultsContainer.innerHTML = `
          <div class="state-box">
            <div class="state-icon">🚫</div>
            <h3 class="state-title">No Route Found</h3>
            <p class="state-desc">There is currently no direct bus route between the selected stops.</p>
            <button type="button" class="btn-secondary" onclick="document.getElementById('fromStopSelect').focus()">
              Try Different Stops
            </button>
          </div>
        `;
      } else {
        // Display matching routes (Section 13)
        const fromName = fromSelect.options[fromSelect.selectedIndex].text.split(' (')[0];
        const toName = toSelect.options[toSelect.selectedIndex].text.split(' (')[0];

        resultsContainer.innerHTML = `
          <div style="margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between;">
            <h3 style="font-size: 1.3rem; font-weight: 800; color: var(--text-main);">
              Available Routes: ${escapeHtml(fromName)} → ${escapeHtml(toName)}
            </h3>
            <span class="active-filter-badge" style="background: var(--accent-green-soft); color: var(--accent-green-dark);">
              ${routes.length} direct route(s) found
            </span>
          </div>
          <div class="routes-grid">
            ${routes.map(renderRouteCard).join('')}
          </div>
        `;
      }
    } catch (err) {
      // Error Handling (Section 16)
      resultsContainer.innerHTML = `
        <div class="state-box">
          <div class="state-icon">⚠️</div>
          <h3 class="state-title">Unable to Connect</h3>
          <p class="state-desc">Unable to connect to the transit server. Please ensure the backend is running and try again.</p>
        </div>
      `;
    }
  });

  function showAlert(msg, type = 'warning') {
    alertBox.className = `form-alert ${type}`;
    alertMsg.textContent = msg;
    alertBox.style.display = 'flex';
  }

  function hideAlert() {
    alertBox.style.display = 'none';
  }
}

// 6. Load Available Routes for Homepage
async function loadAvailableRoutes() {
  const grid = document.getElementById('homeRoutesGrid');
  if (!grid) return;

  try {
    const routes = await window.BusRouteAPI.getRoutes();

    if (!routes || routes.length === 0) {
      grid.innerHTML = `
        <div class="state-box" style="grid-column: 1 / -1;">
          <div class="state-icon">🚌</div>
          <h3 class="state-title">No Routes Available</h3>
          <p class="state-desc">No active bus routes found in the database. Please run the seeder.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = routes.map(renderRouteCard).join('');
  } catch (error) {
    grid.innerHTML = `
      <div class="state-box" style="grid-column: 1 / -1;">
        <div class="state-icon">⚠️</div>
        <h3 class="state-title">Unable to Load Routes</h3>
        <p class="state-desc">Unable to connect to the server. Please verify backend is running on port 5000.</p>
      </div>
    `;
  }
}

// Reusable Helper: Render Route Card HTML (Section 8, 13)
function renderRouteCard(route) {
  const stopsCount = route.stops ? route.stops.length : 0;
  const start = route.startStop || 'Start Stop';
  const end = route.endStop || 'End Stop';
  const firstTrip = route.timings ? route.timings.firstTrip : (route.firstTrip || 'N/A');
  const lastTrip = route.timings ? route.timings.lastTrip : (route.lastTrip || 'N/A');
  const routeNum = route.routeNumber || route.routeId;
  const targetId = route.routeId || route.routeNumber;

  return `
    <article class="route-card">
      <div>
        <div class="route-card-header">
          <div class="route-badge">
            <span>🚌</span> Route ${escapeHtml(routeNum)}
          </div>
          <span class="route-stops-count">${stopsCount} Stops</span>
        </div>

        <div class="route-terminals">
          <h3 class="route-title">
            <span>${escapeHtml(start)}</span>
            <span class="terminal-arrow">→</span>
            <span>${escapeHtml(end)}</span>
          </h3>
        </div>

        <div class="route-metrics-bar">
          <div class="metric-item">
            <span class="metric-label">Route Distance</span>
            <span class="metric-value highlight-green">${route.distance} km</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Est. Duration</span>
            <span class="metric-value">${route.duration} min</span>
          </div>
        </div>

        <div class="route-timings">
          <div class="timing-badge">
            <span class="timing-label">First:</span>
            <strong>${escapeHtml(firstTrip)}</strong>
          </div>
          <div class="timing-badge">
            <span class="timing-label">Last:</span>
            <strong>${escapeHtml(lastTrip)}</strong>
          </div>
        </div>
      </div>

      <a href="route-details.html?id=${encodeURIComponent(targetId)}" class="btn-view-route">
        <span>VIEW ROUTE</span>
        <span>→</span>
      </a>
    </article>
  `;
}

// Security Helper: Escape HTML
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
