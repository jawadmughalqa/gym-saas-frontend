import { io, Socket } from 'socket.io-client';

// ─── Singleton socket ─────────────────────────────────────────────────────────
// One connection for the whole app lifetime.
// Re-connected automatically by socket.io-client when the tab regains focus.

// In development VITE_API_URL is '/api/v1' (relative, goes through Vite proxy),
// so the socket must connect to window.location.origin (same host/port as Vite).
// In staging/production it's an absolute URL like https://api.gymanger.com/api/v1,
// so we strip /api/v1 to get the socket server root.
const rawApiUrl = import.meta.env.VITE_API_URL as string | undefined;
const SOCKET_URL = rawApiUrl?.startsWith('http')
  ? rawApiUrl.replace('/api/v1', '')
  : window.location.origin;

let _socket: Socket | null = null;

export function getSocket(): Socket {
  if (!_socket) {
    _socket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: false,   // caller decides when to connect
      transports: ['websocket', 'polling'],
    });
  }
  return _socket;
}

/** Connect and emit a join event for per-user room (in-app notifications). */
export function connectSocket(userId: string, role: string): void {
  const socket = getSocket();
  if (!socket.connected) {
    socket.connect();
  }
  socket.emit('join', userId);

  // Super admins also join the shared room so they receive lead:new events
  if (role === 'super_admin') {
    socket.emit('join:super_admin');
  }
}

/** Disconnect — call on logout. */
export function disconnectSocket(): void {
  _socket?.disconnect();
}
