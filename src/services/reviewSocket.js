import { io } from 'socket.io-client';

// Connects to the backend `/review` Socket.IO namespace for real-time review
// pings (objections, follow-ups, approvals, QCOPS escalations, queue changes).
const API_URL = import.meta.env.VITE_API_URL || '/api';
const ORIGIN = (() => {
  const stripped = API_URL.replace(/\/api\/?$/, '');
  return /^https?:\/\//i.test(stripped) ? stripped : window.location.origin;
})();

let socket = null;

export function connectReview(token) {
  if (!token) return null;
  if (socket && socket.connected) return socket;
  if (socket) { socket.disconnect(); socket = null; }
  socket = io(`${ORIGIN}/review`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });
  return socket;
}

export function getReviewSocket() { return socket; }

export function disconnectReview() {
  if (socket) { socket.disconnect(); socket = null; }
}
