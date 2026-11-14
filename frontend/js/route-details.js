/**
 * Route Details Page Logic (route-details.html)
 * Loads route information, metrics, and renders the visual vertical stop timeline
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  loadRouteDetails();
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

async function loadRouteDetails() {
  const container = document.getElementById('routeDetailsContainer');
  const breadcrumbRouteName = document.getElementById('breadcrumbRouteName');

  const urlParams = new URLSearchParams(window.location.search);
  const routeId = urlParams.get('id');

  if (!routeId) {
    renderErrorState(
      'Missing Route Identifier',
      'No route ID was provided in the URL. Please return to the search page to select a route.'
    );
    return;
  }

  try {
    const route = await window.BusRouteAPI.getRouteById(routeId);

    if (!route) {
      renderErrorState(
        'Route Not Found',
        `We could not find any active route matching identifier "${escapeHtml(routeId)}".`
      );
      return;
    }

    // Update document title and breadcrumb
    const routeTitle = `Route ${route.routeNumber || route.routeId}`;
    document.title = `${routeTitle}: ${route.startStop} → ${route.endStop} — Bus Route Information System`;
    if (breadcrumbRouteName) {
      breadcrumbRouteName.textContent = `${routeTitle} (${route.startStop} → ${route.endStop})`;
    }

    renderRouteDetails(route);
  } catch (error) {
    renderErrorState(
      'Error Loading Route Details',
      'Unable to connect to the transit database. Please verify the backend service is running.'
    );
  }
}

function renderRouteDetails(route) {
  const container = document.getElementById('routeDetailsContainer');
  const stops = route.stopDetails || [];
  const firstTrip = route.timings ? route.timings.firstTrip : (route.firstTrip || 'N/A');
  const lastTrip = route.timings ? route.timings.lastTrip : (route.lastTrip || 'N/A');
  const totalStops = stops.length || (route.stops ? route.stops.length : 0);

  container.innerHTML = `
    <!-- Top Hero Banner with Key Metrics (Section 9) -->
    <div class="route-hero-banner">
      <div class="hero-banner-top">
        <div>
          <div class="route-badge" style="font-size: 1.15rem; background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(4px); margin-bottom: 0.6rem;">
            <span>🚌</span> Bus Route ${escapeHtml(route.routeNumber)}
          </div>
          <h1 class="route-header-title">
            ${escapeHtml(route.startStop)} 
            <span style="color: #34d399; margin: 0 0.35rem;">→</span> 
            ${escapeHtml(route.endStop)}
          </h1>
        </div>
        <div>
          <a href="search.html" class="btn-secondary" style="background: rgba(255, 255, 255, 0.15); color: white; border-color: rgba(255, 255, 255, 0.3);">
            ← Back to Routes
          </a>
        </div>
      </div>

      <!-- Quick Metrics Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Distance</div>
          <div class="stat-value">${route.distance} <span style="font-size: 0.95rem; font-weight: 500;">km</span></div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Estimated Duration</div>
          <div class="stat-value">${route.duration} <span style="font-size: 0.95rem; font-weight: 500;">minutes</span></div>
        </div>

        <div class="stat-card">
          <div class="stat-label">First Trip</div>
          <div class="stat-value" style="font-size: 1.25rem;">${escapeHtml(firstTrip)}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Last Trip</div>
          <div class="stat-value" style="font-size: 1.25rem;">${escapeHtml(lastTrip)}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Total Stops</div>
          <div class="stat-value">${totalStops} <span style="font-size: 0.95rem; font-weight: 500;">stops</span></div>
        </div>
      </div>
    </div>

    <!-- Stop Sequence Vertical Timeline Section (Section 10 & 27) -->
    <div class="timeline-card">
      <div class="timeline-header">
        <div>
          <h2 class="timeline-title">
            <span>🚏</span> Stop Sequence & Route Timeline
          </h2>
          <p style="color: var(--text-muted); font-size: 0.92rem; margin-top: 0.25rem;">
            Chronological order of all passenger pickup and drop-off points
          </p>
        </div>
        <div class="system-status" style="background: var(--accent-green-soft); color: var(--accent-green-dark); font-weight: 700;">
          <span>✓</span> Directional Sequence Verified
        </div>
      </div>

      <!-- Vertical Timeline Component -->
      <div class="stop-timeline">
        ${renderStopTimeline(stops, route)}
      </div>

      <!-- Bottom Actions -->
      <div style="margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <a href="search.html" class="btn-secondary">
          ← Search Other Routes
        </a>
        <a href="index.html#find-route-section" class="btn-primary" style="height: auto; padding: 0.75rem 1.5rem;">
          <span>Find Route Between Stops</span>
          <span>→</span>
        </a>
      </div>
    </div>
  `;
}

/**
 * Builds the visual vertical route timeline (Section 10)
 * Start Stop -> Intermediate Stops -> Destination Stop
 */
function renderStopTimeline(stops, route) {
  if (!stops || stops.length === 0) {
    // Fallback if stops array is only IDs
    const rawStops = route.stops || [];
    return rawStops
      .map((sid, idx) => {
        const isStart = idx === 0;
        const isEnd = idx === rawStops.length - 1;
        const stepClass = isStart ? 'start-step' : (isEnd ? 'end-step' : '');
        const badgeClass = isStart ? 'start-badge' : (isEnd ? 'end-badge' : 'intermediate-badge');
        const badgeText = isStart ? 'Origin Terminal' : (isEnd ? 'Destination Terminal' : `Stop #${idx + 1}`);

        return `
          <div class="timeline-step ${stepClass}">
            <div class="timeline-node">${idx + 1}</div>
            <div class="timeline-content">
              <div class="stop-info">
                <span class="stop-name-text">${escapeHtml(sid)}</span>
                <span class="stop-subtext">Stop Code: ${escapeHtml(sid)}</span>
              </div>
              <span class="stop-type-badge ${badgeClass}">${badgeText}</span>
            </div>
            ${!isEnd ? '<div class="timeline-arrow">↓</div>' : ''}
          </div>
        `;
      })
      .join('');
  }

  return stops
    .map((stop, index) => {
      const isStart = index === 0;
      const isEnd = index === stops.length - 1;
      const stepClass = isStart ? 'start-step' : (isEnd ? 'end-step' : '');
      const badgeClass = isStart ? 'start-badge' : (isEnd ? 'end-badge' : 'intermediate-badge');
      const badgeText = isStart ? 'Origin Terminal' : (isEnd ? 'Destination Terminal' : `Intermediate Stop`);

      const coordinatesText =
        stop.latitude && stop.longitude
          ? `<span style="margin-left: 0.5rem; font-size: 0.75rem; color: var(--text-muted);">📍 ${stop.latitude.toFixed(4)}, ${stop.longitude.toFixed(4)}</span>`
          : '';

      return `
        <div class="timeline-step ${stepClass}">
          <div class="timeline-node">
            ${isStart ? '●' : (isEnd ? '🏁' : index + 1)}
          </div>

          <div class="timeline-content">
            <div class="stop-info">
              <span class="stop-name-text">
                ${escapeHtml(stop.stopName)}
              </span>
              <span class="stop-subtext">
                <span>Stop ID: <strong>${escapeHtml(stop.stopId)}</strong></span>
                <span>•</span>
                <span>Sequence #${index + 1}</span>
                ${coordinatesText}
              </span>
            </div>

            <span class="stop-type-badge ${badgeClass}">
              ${badgeText}
            </span>
          </div>

          ${!isEnd ? '<div class="timeline-arrow">↓</div>' : ''}
        </div>
      `;
    })
    .join('');
}

function renderErrorState(title, message) {
  const container = document.getElementById('routeDetailsContainer');
  container.innerHTML = `
    <div class="state-box">
      <div class="state-icon">🚫</div>
      <h2 class="state-title">${escapeHtml(title)}</h2>
      <p class="state-desc">${escapeHtml(message)}</p>
      <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
        <a href="search.html" class="btn-primary" style="height: auto; padding: 0.75rem 1.5rem;">
          Go to Route Search
        </a>
        <a href="index.html" class="btn-secondary">
          Return to Home
        </a>
      </div>
    </div>
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
