// lib/socket-io-server.js
/**
 * Utility to get the Socket.IO server instance
 * This is used in API routes to broadcast real-time events
 */
export function getSocketIOServer() {
  if (typeof window !== "undefined") {
    // Client-side, return null
    return null;
  }

  // Server-side: Try to get the io instance from global
  // Next.js dev server reloads, so we store it globally
  if (global.io) {
    return global.io;
  }

  return null;
}

export function setSocketIOServer(io) {
  if (typeof window === "undefined") {
    global.io = io;
  }
}
