/**
 * API Service Client with Authorization Interceptors and Resilient Error Handling
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('mcwms_token');
  let url;
  let config = { ...options };

  // Support for Google Apps Script Web App backend
  if (API_BASE_URL.includes('script.google.com')) {
    const [pathPart, queryPart] = endpoint.split('?');
    const cleanEndpoint = pathPart.replace(/^\/api\/?/, '').replace(/^\//, '');
    const urlObj = new URL(API_BASE_URL);
    urlObj.searchParams.set('endpoint', cleanEndpoint);
    
    if (queryPart) {
      const qParams = new URLSearchParams(queryPart);
      for (const [k, v] of qParams.entries()) {
        urlObj.searchParams.set(k, v);
      }
    }
    
    if (token) {
      urlObj.searchParams.set('token', token);
    }

    const method = (options.method || 'GET').toUpperCase();
    if (method !== 'GET') {
      urlObj.searchParams.set('http_method', method);
      config.method = 'POST';
      // Use text/plain to avoid CORS preflight limitations on Google Apps Script redirects
      config.headers = {
        'Content-Type': 'text/plain;charset=utf-8'
      };
    } else {
      config.headers = {};
    }
    url = urlObj.toString();
  } else {
    // Standard Python Flask / Render / Localhost REST API
    url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    config.headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };
  }

  try {
    const response = await fetch(url, config);

    // If unauthorized, clear token and notify
    if (response.status === 401 && !endpoint.includes('/login')) {
      localStorage.removeItem('mcwms_token');
      localStorage.removeItem('mcwms_user');
      window.dispatchEvent(new Event('auth_expired'));
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    return data;
  } catch (err) {
    // Check if network failed or server is asleep (e.g. Render spin-up)
    if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
      throw new Error(
        'Unable to connect to the backend server. The service might be starting up, or the network is unavailable.'
      );
    }
    throw err;
  }
}

export const api = {
  get: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'DELETE' }),
};
