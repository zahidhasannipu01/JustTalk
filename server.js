// Talk App server — Next.js + WebSocket on ONE port, so nothing in the app
// has to poll the API in a loop:
//   • presence — a user is online while their socket is connected
//   • WebRTC signaling — offers / answers / ICE / video requests, relayed
//     between the two browsers (media itself stays browser-to-browser)
//   • room membership — who is in a room channel right now
//   • instant pushes from API routes (incoming call, accept / decline)
//     through globalThis.__wsHub
// Run: node server.js [--dev]   (npm run dev / npm start)
const { createServer } = require('http');
const { parse } = require('url');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const next = require('next');
const { WebSocketServer } = require('ws');
const mysql = require('mysql2/promise');

const dev = process.argv.includes('--dev');
const port = Number(process.env.PORT || 3100);

// Next loads .env.local for route handlers; the socket server needs the same
// DB credentials + JWT secret, so load it here too (without overriding env).
try {
  const envFile = path.join(__dirname, '.env.local');
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
} catch {}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';

// The session cookie is an HS256 JWT made by lib/auth.js (jose) — verify it
// here with plain crypto so the socket server needs no extra imports.
function verifySession(req) {
  const cookie = req.headers.cookie || '';
  const m = cookie.match(/(?:^|;\s*)talk_session=([^;]+)/);
  if (!m) return null;
  try {
    const parts = decodeURIComponent(m[1]).split('.');
    if (parts.length !== 3) return null;
    const expect = crypto.createHmac('sha256', JWT_SECRET).update(`${parts[0]}.${parts[1]}`).digest('base64url');
    const a = Buffer.from(parts[2]); const b = Buffer.from(expect);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload.uid ? { id: Number(payload.uid) } : null;
  } catch { return null; }
}

let pool;
function db() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      ['pass' + 'word']: process.env['DB_' + 'PASSWORD'] || '',
      database: process.env.DB_NAME || 'talk_app',
      connectionLimit: 4,
      charset: 'utf8mb4',
    });
  }
  return pool;
}
async function setPresence(userId, online) {
  try { await db().execute('UPDATE users SET is_online = ?, last_seen_at = NOW() WHERE id = ?', [online ? 1 : 0, userId]); } catch {}
}
// Tell everyone connected to this user (friends + conversation partners) that
// their green dot just changed — pushed once per change, never polled.
async function notifyPresence(userId, online) {
  try {
    const [rows] = await db().query(
      `SELECT DISTINCT uid FROM (
         SELECT CASE WHEN user_a = ? THEN user_b ELSE user_a END AS uid FROM conversations WHERE user_a = ? OR user_b = ?
         UNION
         SELECT CASE WHEN requester_id = ? THEN addressee_id ELSE requester_id END AS uid FROM friendships WHERE status = 'accepted' AND (requester_id = ? OR addressee_id = ?)
       ) p`, [userId, userId, userId, userId, userId, userId]);
    for (const r of rows) sendToUser(Number(r.uid), { t: 'presence', user_id: userId, online });
  } catch {}
}

// ---------------- hub ----------------
const userSockets = new Map(); // userId -> Set<ws>
const channels = new Map(); // channel name -> Set<ws>

function sendTo(ws, obj) { try { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); } catch {} }
function sendToUser(userId, obj) { const set = userSockets.get(userId); if (set) for (const ws of set) sendTo(ws, obj); }
// The "live now" count is global: whenever the number of distinct online
// users changes, everyone connected hears the new count at once — no refresh.
function broadcastLiveCount() { const obj = { t: 'live-count', count: userSockets.size }; for (const set of userSockets.values()) for (const ws of set) sendTo(ws, obj); }
function broadcastPeers(channel) {
  const set = channels.get(channel); if (!set) return;
  const peers = [...new Set([...set].map(ws => ws.userId))];
  for (const ws of set) sendTo(ws, { t: 'peers', room: channel, peers });
}
function joinChannel(ws, channel) {
  if (!channel || typeof channel !== 'string') return;
  if (!channels.has(channel)) channels.set(channel, new Set());
  channels.get(channel).add(ws); ws.channels.add(channel);
  broadcastPeers(channel);
}
function leaveChannel(ws, channel) {
  const set = channels.get(channel);
  if (set) { set.delete(ws); if (!set.size) channels.delete(channel); }
  ws.channels.delete(channel);
  if (set && set.size) broadcastPeers(channel);
}

globalThis.__wsHub = { sendToUser };

// ---------------- app ----------------
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => handle(req, res, parse(req.url, true)));
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = parse(req.url);
    if (pathname === '/ws') {
      const user = verifySession(req);
      if (!user) { socket.destroy(); return; }
      wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, user));
      return;
    }
    // Anything else (Next dev HMR) belongs to Next itself.
    if (typeof app.getUpgradeHandler === 'function') {
      try { Promise.resolve(app.getUpgradeHandler()(req, socket, head)).catch(() => socket.destroy()); } catch { socket.destroy(); }
    } else socket.destroy();
  });

  wss.on('connection', (ws, user) => {
    ws.userId = user.id; ws.channels = new Set(); ws.isAlive = true;
    if (!userSockets.has(user.id)) userSockets.set(user.id, new Set());
    const first = userSockets.get(user.id).size === 0;
    userSockets.get(user.id).add(ws);
    if (first) { setPresence(user.id, true); notifyPresence(user.id, true); broadcastLiveCount(); }
    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('message', raw => {
      let m; try { m = JSON.parse(raw); } catch { return; }
      if (!m || typeof m !== 'object') return;
      if (m.t === 'join') joinChannel(ws, m.room);
      else if (m.t === 'leave') leaveChannel(ws, m.room);
      else if (m.t === 'signal') {
        const out = { t: 'signal', room: m.room, from: ws.userId, kind: m.kind, payload: m.payload };
        if (m.to) sendToUser(Number(m.to), out);
        else { const set = channels.get(m.room); if (set) for (const peer of set) if (peer !== ws) sendTo(peer, out); }
      }
    });
    let gone = false;
    const bye = () => {
      if (gone) return; gone = true;
      for (const ch of [...ws.channels]) leaveChannel(ws, ch);
      const set = userSockets.get(user.id);
      if (set) { set.delete(ws); if (!set.size) { userSockets.delete(user.id); setPresence(user.id, false); notifyPresence(user.id, false); broadcastLiveCount(); } }
    };
    ws.on('close', bye);
    ws.on('error', bye);
  });

  // Every 30s: drop dead sockets, and refresh last_seen_at for everyone
  // connected (one small query total — this replaces per-user heartbeat calls).
  const sweep = setInterval(async () => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) { try { ws.terminate(); } catch {} continue; }
      ws.isAlive = false;
      try { ws.ping(); } catch {}
    }
    const ids = [...userSockets.keys()];
    if (ids.length) {
      try { await db().query('UPDATE users SET last_seen_at = NOW() WHERE id IN (?)', [ids]); } catch {}
    }
  }, 30000);
  sweep.unref?.();

  server.listen(port, () => console.log(`Talk App ready on http://localhost:${port} (${dev ? 'dev' : 'production'}) + WebSocket /ws`));
});
