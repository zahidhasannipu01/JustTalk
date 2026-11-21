// One WebSocket for the whole app (served by server.js at /ws). Presence,
// call signaling, room membership and instant pushes (incoming call,
// accept / decline) all ride this single connection — the app never polls
// the API in a loop. Auto-reconnects with backoff and rejoins channels.
let ws = null;
let connecting = false;
let reconnectMs = 1000;
const listeners = new Map(); // message type -> Set<fn>
const joined = new Set(); // channels to (re)join on connect

function emitLocal(t, msg) {
  const set = listeners.get(t);
  if (set) for (const fn of [...set]) { try { fn(msg); } catch {} }
}

function connect() {
  if (ws || connecting || typeof window === 'undefined') return;
  connecting = true;
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const sock = new WebSocket(`${proto}//${window.location.host}/ws`);
  ws = sock;
  sock.onopen = () => {
    connecting = false; reconnectMs = 1000;
    for (const room of joined) { try { sock.send(JSON.stringify({ t: 'join', room })); } catch {} }
    emitLocal('_open', {});
  };
  sock.onmessage = ev => {
    let m; try { m = JSON.parse(ev.data); } catch { return; }
    if (m && m.t) emitLocal(m.t, m);
  };
  sock.onclose = () => {
    if (ws === sock) ws = null;
    connecting = false;
    setTimeout(connect, reconnectMs);
    reconnectMs = Math.min(reconnectMs * 2, 10000);
  };
  sock.onerror = () => { try { sock.close(); } catch {} };
}

export const socket = {
  connect,
  on(t, fn) {
    if (!listeners.has(t)) listeners.set(t, new Set());
    listeners.get(t).add(fn);
    return () => { listeners.get(t)?.delete(fn); };
  },
  send(obj) {
    if (ws && ws.readyState === 1) { try { ws.send(JSON.stringify(obj)); return true; } catch {} }
    return false;
  },
  join(room) { joined.add(room); socket.send({ t: 'join', room }); },
  leave(room) { joined.delete(room); socket.send({ t: 'leave', room }); },
};
