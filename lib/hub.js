// Push a message to a user's open sockets via the hub that server.js
// registers on globalThis. Safe no-op when the socket server is not running.
export function hubPush(userId, msg) {
  try { globalThis.__wsHub?.sendToUser(Number(userId), msg); } catch {}
}
