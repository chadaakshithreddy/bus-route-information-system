/**
 * Search Page Logic (search.html)
 * Handles route query search, path finder between two stops, and URL parameter triggers
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initSearchTabs();
  initGeneralSearch();
  initPathSearch();
  processUrlParameters();
});

function initMobileNav() {
  const toggleBtn = document.getElementById('mobileNavToggle');
  const navMenu = document.getElementById('navMenu');
  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', () => {
      navMenu.classList.toggle('open');
    });
  }
}

// 1. Search Mode Tabs Switching
function initSearchTabs() {
  const tabGeneral = document.getElementById('tabGeneralSearch');
  const tabPath = document.getElementById('tabPathSearch');
  const panelGeneral = document.getElementById('panelGeneralSearch');
  const panelPath = document.getElementById('panelPathSearch');

  if (!tabGeneral || !tabPath) return;

  tabGeneral.addEventListener('click', () => {
    tabGeneral.classList.add('active');
    tabGeneral.setAttribute('aria-selected', 'true');
    tabPath.classList.remove('active');
    tabPath.setAttribute('aria-selected', 'false');

    panelGeneral.style.display = 'block';
    panelPath.style.display = 'none';
  });

  tabPath.addEventListener('click', () => {
    tabPath.classList.add('active');
    tabPath.setAttribute('aria-selected', 'true');
    tabGeneral.classList.remove('active');
    tabGeneral.setAttribute('aria-selected', 'false');

    panelPath.style.display = 'block';
    panelGeneral.style.display = 'none';
  });
}

// 2. Tab 1: General Query Search (By Route Number or Stop Name)
function initGeneralSearch() {
  const form = document.getElementById('generalSearchForm');
  const input = document.getElementById('querySearchInput');
  const clearBtn = document.getElementById('clearSearchBtn');
  const suggestionButtons = document.querySelectorAll('.tag-btn[data-fill]');

  if (!form || !input) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = input.value.trim();
    executeGeneralSearch(query);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      clearBtn.style.display = 'none';
      executeGeneralSearch('');
    });
  }

  suggestionButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const fillVal = btn.getAttribute('data-fill');
      input.value = fillVal;
      executeGeneralSearch(fillVal);
    });
  });
}

async function executeGeneralSearch(query) {
  const resultsContent = document.getElementById('resultsContent');
  const countTitle = document.getElementById('resultsCountTitle');
  const filterBadgeContainer = document.getElementById('activeFilterBadgeContainer');
  const clearBtn = document.getElementById('clearSearchBtn');

  if (clearBtn) {
    clearBtn.style.display = query ? 'inline-flex' : 'none';
  }

  // Show loading indicator (Section 15)
  showLoading('Searching routes...');

  try {
    const routes = await window.BusRouteAPI.searchRoutes(query);

    if (query) {
      filterBadgeContainer.innerHTML = `
        <span class="active-filter-badge">
          Query: "${escapeHtml(query)}"
        </span>
      `;
      countTitle.textContent = `Found ${routes.length} Route${routes.length === 1 ? '' : 's'}`;
    } else {
      filterBadgeContainer.innerHTML = '';
      countTitle.textContent = `All Available Routes (${routes.length})`;
    }

    if (!routes || routes.length === 0) {
      showEmpty(
        'No Routes Found',
        query
          ? `No routes match your search for "${escapeHtml(query)}". Try another route number or stop name.`
          : 'No routes are currently registered in the system.'
      );
      return;
    }

    renderRoutesGrid(routes);
  } catch (error) {
    showError('Unable to connect to the server. Please check your backend and try again.');
  }
}

// 3. Tab 2: Path Between Stops Search (Section 11, 12, 13, 14, 23)
async function initPathSearch() {
  const fromSelect = document.getElementById('searchFromStopSelect');
  const toSelect = document.getElementById('searchToStopSelect');
  const swapBtn = document.getElementById('searchSwapStopsBtn');
  const form = document.getElementById('searchPagePathForm');
  const alertBox = document.getElementById('searchPageAlertBox');
  const alertMsg = document.getElementById('searchPageAlertMsg');

  if (!fromSelect || !toSelect || !form) return;

  // Load stops into both selectors
  try {
    const stops = await window.BusRouteAPI.getStops();
    stops.sort((a, b) => a.stopName.localeCompare(b.stopName));

    const optionsHtml = [
      '<option value="" disabled selected>Select stop...</option>',
      ...stops.map((s) => `<option value="${s.stopId}">${escapeHtml(s.stopName)} (${s.stopId})</option>`)
    ].join('');

    fromSelect.innerHTML = optionsHtml;
    toSelect.innerHTML = optionsHtml;
  } catch (err) {
    fromSelect.innerHTML = '<option value="" disabled>Error loading stops</option>';
    toSelect.innerHTML = '<option value="" disabled>Error loading stops</option>';
  }

  // Swap Stops
  if (swapBtn) {
    swapBtn.addEventListener('click', () => {
      const temp = fromSelect.value;
      fromSelect.value = toSelect.value;
      toSelect.value = temp;
      hideAlert();
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const fromId = fromSelect.value;
    const toId = toSelect.value;

    if (!fromId || !toId) {
      showAlert('Please select both starting and destination stops.', 'warning');
      return;
    }

    // Validation: FROM != TO (Section 23)
    if (fromId === toId) {
      showAlert('Please select two different stops.', 'warning');
      return;
    }

    executePathSearch(fromId, toId);
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

async function executePathSearch(fromStopId, toStopId) {
  const countTitle = document.getElementById('resultsCountTitle');
  const filterBadgeContainer = document.getElementById('activeFilterBadgeContainer');
  const fromSelect = document.getElementById('searchFromStopSelect');
  const toSelect = document.getElementById('searchToStopSelect');

  showLoading('Finding connecting routes...');

  try {
    const result = await window.BusRouteAPI.findRoutesBetweenStops(fromStopId, toStopId);
    const routes = result.routes || [];

    const fromName = fromSelect.selectedIndex >= 0 ? fromSelect.options[fromSelect.selectedIndex].text.split(' (')[0] : fromStopId;
    const toName = toSelect.selectedIndex >= 0 ? toSelect.options[toSelect.selectedIndex].text.split(' (')[0] : toStopId;

    filterBadgeContainer.innerHTML = `
      <span class="active-filter-badge" style="background: var(--accent-green-soft); color: var(--accent-green-dark);">
        Route Path: ${escapeHtml(fromName)} → ${escapeHtml(toName)}
      </span>
    `;

    countTitle.textContent = `Found ${routes.length} Connecting Route${routes.length === 1 ? '' : 's'}`;

    if (routes.length === 0) {
      // Required exact no-route message (Section 14)
      showEmpty(
        'No route found',
        'There is currently no direct bus route between the selected stops.'
      );
      return;
    }

    renderRoutesGrid(routes);
  } catch (err) {
    showError('Failed to search routes between selected stops. Please try again.');
  }
}

// 4. URL Parameters Processing (e.g. ?q=101 or ?from=S001&to=S004)
function processUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  const q = urlParams.get('q');
  const from = urlParams.get('from') || urlParams.get('fromStopId');
  const to = urlParams.get('to') || urlParams.get('toStopId');

  if (from && to) {
    // Activate Tab 2
    const tabPath = document.getElementById('tabPathSearch');
    if (tabPath) tabPath.click();

    // Wait briefly for stops to populate
    setTimeout(() => {
      const fromSelect = document.getElementById('searchFromStopSelect');
      const toSelect = document.getElementById('searchToStopSelect');
      if (fromSelect && toSelect) {
        fromSelect.value = from;
        toSelect.value = to;
        executePathSearch(from, to);
      }
    }, 300);
  } else if (q) {
    const input = document.getElementById('querySearchInput');
    if (input) input.value = q;
    executeGeneralSearch(q);
  } else {
    // Default: load all routes
    executeGeneralSearch('');
  }
}

// UI State Rendering Helpers
function showLoading(msg = 'Searching routes...') {
  const resultsContent = document.getElementById('resultsContent');
  resultsContent.innerHTML = `
    <div class="state-box">
      <div class="spinner"></div>
      <h3 class="state-title">${escapeHtml(msg)}</h3>
      <p class="state-desc">Connecting to transit database...</p>
    </div>
  `;
}

function showEmpty(title, desc) {
  const resultsContent = document.getElementById('resultsContent');
  resultsContent.innerHTML = `
    <div class="state-box">
      <div class="state-icon">🚫</div>
      <h3 class="state-title">${escapeHtml(title)}</h3>
      <p class="state-desc">${escapeHtml(desc)}</p>
      <button type="button" class="btn-secondary" onclick="window.location.href='search.html'">
        Clear Search & View All Routes
      </button>
    </div>
  `;
}

function showError(msg) {
  const resultsContent = document.getElementById('resultsContent');
  resultsContent.innerHTML = `
    <div class="state-box">
      <div class="state-icon">⚠️</div>
      <h3 class="state-title">Search Error</h3>
      <p class="state-desc">${escapeHtml(msg)}</p>
      <button type="button" class="btn-secondary" onclick="location.reload()">
        Try Again
      </button>
    </div>
  `;
}

function renderRoutesGrid(routes) {
  const resultsContent = document.getElementById('resultsContent');
  resultsContent.innerHTML = `
    <div class="routes-grid">
      ${routes.map(renderRouteCard).join('')}
    </div>
  `;
}

function renderRouteCard(route) {
  const stopsCount = route.stops ? route.stops.length : 0;
  const start = route.startStop || 'Start Stop';
  const end = route.endStop || 'End Stop';
  const firstTrip = route.timings ? route.timings.firstTrip : (route.firstTrip || 'N/A');
  const lastTrip = route.timings ? route.timings.lastTrip : (route.lastTrip || 'N/A');
  const routeNum = route.routeNumber || route.routeId;
  const targetId = route.routeId || route.routeNumber;

  // Stop sequence preview
  const sequenceSummary = route.stopSequenceSummary || route.stopSequenceDisplay || '';

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

        ${
          sequenceSummary
            ? `<div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(sequenceSummary)}">
                <strong>Stops:</strong> ${escapeHtml(sequenceSummary)}
               </div>`
            : ''
        }
      </div>

      <a href="route-details.html?id=${encodeURIComponent(targetId)}" class="btn-view-route">
        <span>VIEW ROUTE</span>
        <span>→</span>
      </a>
    </article>
  `;
}

function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
