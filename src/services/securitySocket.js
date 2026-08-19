import { io } from 'socket.io-client';

// Real-time admin security alerts (payment fraud) over the /security namespace.
// Mirrors reviewSocket.js — admin token authenticates the handshake.
const API_URL = import.meta.env.VITE_API_URL || '/api';
const ORIGIN = (() => {
  const stripped = API_URL.replace(/\/api\/?$/, '');
  return /^https?:\/\//i.test(stripped) ? stripped : window.location.origin;
})();

let socket = null;

export function connectSecurity(token) {
  if (!token) return null;
  if (socket && socket.connected) return socket;
  if (socket) { socket.disconnect(); socket = null; }
  socket = io(`${ORIGIN}/security`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });
  return socket;
}

export function getSecuritySocket() { return socket; }

export function disconnectSecurity() {
  if (socket) { socket.disconnect(); socket = null; }
}
