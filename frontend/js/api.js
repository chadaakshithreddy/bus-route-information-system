/**
 * Central API Client for Bus Route Information System
 * Connects frontend to the Express REST API backend
 */

const getApiBaseUrl = () => {
  // If hosted on the same server/port
  if (
    typeof window !== 'undefined' &&
    window.location.protocol.startsWith('http') &&
    (window.location.port === '5000' || window.location.port === '')
  ) {
    return `${window.location.origin}/api`;
  }
  // Default backend URL when running locally or via file:// protocol
  return 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

/**
 * Generic fetch wrapper with standard error handling
 */
const fetchAPI = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }

    return data;
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error.message);
    throw error;
  }
};

/**
 * 1. Check Backend Health
 */
const checkHealth = async () => {
  return await fetchAPI('/health');
};

/**
 * 2. Get All Routes
 */
const getRoutes = async () => {
  const response = await fetchAPI('/routes');
  return response.data || [];
};

/**
 * 3. Search Routes by query keyword (routeNumber or stopName)
 */
const searchRoutes = async (query) => {
  if (!query || query.trim() === '') {
    return await getRoutes();
  }
  const cleanQuery = encodeURIComponent(query.trim());
  const response = await fetchAPI(`/routes/search?q=${cleanQuery}`);
  return response.data || [];
};

/**
 * 4. Get Route Details by Route ID or Mongo ID
 */
const getRouteById = async (id) => {
  if (!id) throw new Error('Route ID is required');
  const response = await fetchAPI(`/routes/${encodeURIComponent(id)}`);
  return response.data;
};

/**
 * 5. Get All Stops (with optional name filter)
 */
const getStops = async (nameQuery = '') => {
  const queryStr = nameQuery ? `?name=${encodeURIComponent(nameQuery.trim())}` : '';
  const response = await fetchAPI(`/stops${queryStr}`);
  return response.data || [];
};

/**
 * 6. Search Stops by Name (for autocomplete / suggestions)
 */
const searchStops = async (name) => {
  if (!name || name.trim() === '') return [];
  const response = await fetchAPI(`/stops?name=${encodeURIComponent(name.trim())}`);
  return response.data || [];
};

/**
 * 7. Find Routes Between Two Stops
 */
const findRoutesBetweenStops = async (fromStopId, toStopId) => {
  if (!fromStopId || !toStopId) {
    throw new Error('Both fromStopId and toStopId are required');
  }
  const endpoint = `/routes/path?fromStopId=${encodeURIComponent(fromStopId)}&toStopId=${encodeURIComponent(toStopId)}`;
  const response = await fetchAPI(endpoint);
  return {
    success: response.success,
    message: response.message,
    routes: response.routes || []
  };
};

/**
 * 8. User / Admin Authentication
 */
const login = async (email, password) => {
  return await fetchAPI('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
};

/**
 * 9. Get Dashboard Statistics
 */
const getDashboardStats = async () => {
  const response = await fetchAPI('/routes/stats/dashboard');
  return response.data;
};

/**
 * 10. Admin Route Management (Create, Update, Delete)
 */
const createRoute = async (routeData, token) => {
  return await fetchAPI('/routes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(routeData)
  });
};

const updateRoute = async (routeId, routeData, token) => {
  return await fetchAPI(`/routes/${encodeURIComponent(routeId)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(routeData)
  });
};

const deleteRoute = async (routeId, token) => {
  return await fetchAPI(`/routes/${encodeURIComponent(routeId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
};

/**
 * 11. Admin Stop Management (Create, Update, Delete)
 */
const createStop = async (stopData, token) => {
  return await fetchAPI('/stops', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(stopData)
  });
};

const updateStop = async (stopId, stopData, token) => {
  return await fetchAPI(`/stops/${encodeURIComponent(stopId)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(stopData)
  });
};

const deleteStop = async (stopId, token) => {
  return await fetchAPI(`/stops/${encodeURIComponent(stopId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
};

/**
 * 12. Feedback Retrieval
 */
const getFeedback = async () => {
  const response = await fetchAPI('/feedback');
  return response.data || [];
};

// Export to global scope for browser access
window.BusRouteAPI = {
  API_BASE_URL,
  checkHealth,
  getRoutes,
  searchRoutes,
  getRouteById,
  getStops,
  searchStops,
  findRoutesBetweenStops,
  login,
  getDashboardStats,
  createRoute,
  updateRoute,
  deleteRoute,
  createStop,
  updateStop,
  deleteStop,
  getFeedback
};
