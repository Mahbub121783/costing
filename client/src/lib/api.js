import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Single-flight refresh ────────────────────────────────────────────────────
// When the access token expires, many requests can fail with 401 at the same
// time (e.g. several auto-saving sections). If each one calls /auth/refresh
// independently they race: the refresh endpoint rotates the token (deletes the
// old one), so only the FIRST refresh succeeds and all others fail — bouncing
// the user to login mid-edit. To prevent this we share ONE refresh promise
// across all concurrent 401s and queue their retries until it resolves.
let isRefreshing = false;
let refreshPromise = null;
let pendingQueue = [];

const flushQueue = (error, token = null) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  pendingQueue = [];
};

const forceLogout = () => {
  localStorage.clear();
  // Avoid redirect loop if already on login page
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    // Only handle auth failures we can recover from
    if (error.response?.status !== 401 || original?._retry) {
      return Promise.reject(error);
    }

    // Never try to refresh the refresh call itself
    if (original?.url?.includes('/auth/refresh') || original?.url?.includes('/auth/login')) {
      forceLogout();
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      forceLogout();
      return Promise.reject(error);
    }

    original._retry = true;

    // A refresh is already in progress — wait for it, then retry with new token
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      })
        .then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        })
        .catch((err) => Promise.reject(err));
    }

    // Start a new refresh
    isRefreshing = true;
    refreshPromise = axios
      .post('/api/auth/refresh', { refreshToken })
      .then(({ data }) => {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        flushQueue(null, data.accessToken);
        return data.accessToken;
      })
      .catch((err) => {
        flushQueue(err, null);
        forceLogout();
        throw err;
      })
      .finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });

    try {
      const newToken = await refreshPromise;
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (err) {
      return Promise.reject(err);
    }
  }
);

export default api;
