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

  // Team member (BD/COPS/...) token rides on its own header too, so it never
  // collides with an admin token that might also be sitting in the same
  // browser's localStorage.
  const teamToken = localStorage.getItem('team_token');
  if (teamToken) config.headers['X-Team-Auth'] = `Bearer ${teamToken}`;

  // A supplier's own login (Phase 4) — same idea, own header.
  const supplierToken = localStorage.getItem('supplier_token');
  if (supplierToken) config.headers['X-Supplier-Auth'] = `Bearer ${supplierToken}`;

  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url = err.config?.url || '';
    const isUserRoute = url.includes('/user-auth') || url.includes('/users') || url.includes('/bookings/me') || url.includes('/wishlist') || url.includes('/host');

    if (status === 401) {
      // Suppliers/experiences/taxonomy/uploads are SHARED routes (admin
      // panel and the team portal both call them) so the API url alone
      // can't tell which session is stale — use which app shell is
      // currently open instead.
      if (window.location.pathname.startsWith('/team')) {
        if (localStorage.getItem('team_token')) {
          localStorage.removeItem('team_token');
          window.location.href = '/team/login';
        }
      } else if (window.location.pathname.startsWith('/supplier')) {
        if (localStorage.getItem('supplier_token')) {
          localStorage.removeItem('supplier_token');
          window.location.href = '/supplier/login';
        }
      } else if (isUserRoute && localStorage.getItem('user_token')) {
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
