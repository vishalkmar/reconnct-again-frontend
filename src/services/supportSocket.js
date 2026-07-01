import { io } from 'socket.io-client';

// Connects to the backend `/support` Socket.IO namespace. The origin is derived
// from VITE_API_URL (strip a trailing /api); falls back to the current origin.
const API_URL = import.meta.env.VITE_API_URL || '/api';
const ORIGIN = (() => {
  const stripped = API_URL.replace(/\/api\/?$/, '');
  return /^https?:\/\//i.test(stripped) ? stripped : window.location.origin;
})();

let socket = null;

export function connectSupport(role = 'admin') {
  const token = localStorage.getItem(role === 'admin' ? 'admin_token' : 'user_token');
  if (!token) return null;
  if (socket && socket.connected) return socket;
  if (socket) { socket.disconnect(); socket = null; }
  socket = io(`${ORIGIN}/support`, {
    auth: { token, role },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });
  return socket;
}

export function getSupportSocket() { return socket; }

export function disconnectSupport() {
  if (socket) { socket.disconnect(); socket = null; }
}
