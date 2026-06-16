import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  // Admin token rides on the standard `Authorization` header (unchanged).
  // User token rides on a dedicated `X-User-Auth` header so the two auth
  // systems never overwrite each other when a single browser is signed in
  // to both at the same time (rare but possible during dev/QA).
  const adminToken = localStorage.getItem('admin_token');
  if (adminToken) config.headers.Authorization = `Bearer ${adminToken}`;

  const userToken = localStorage.getItem('user_token');
  if (userToken) config.headers['X-User-Auth'] = `Bearer ${userToken}`;

  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url = err.config?.url || '';
    const isUserRoute = url.includes('/user-auth') || url.includes('/users') || url.includes('/bookings/me') || url.includes('/wishlist');

    if (status === 401) {
      if (isUserRoute && localStorage.getItem('user_token')) {
        localStorage.removeItem('user_token');
        // Soft signal — UserAuthContext listens for this and clears state.
        window.dispatchEvent(new CustomEvent('user-auth:expired'));
      } else if (!isUserRoute && localStorage.getItem('admin_token')) {
        localStorage.removeItem('admin_token');
        if (window.location.pathname.startsWith('/admin')) {
          window.location.href = '/admin/login';
        }
      }
    }
    return Promise.reject(err);
  }
);

export const fileUrl = (p) => {
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p;
  const base = import.meta.env.VITE_UPLOADS_URL || '';
  return `${base}${p.startsWith('/') ? '' : '/'}${p}`;
};

export default api;
