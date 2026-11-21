const fs = require('fs'); const path = require('path'); const mysql = require('mysql2/promise'); const bcrypt = require('bcryptjs');
function env() { const e = { ...process.env }; for (const f of ['.env.local', '.env.local-db']) { const p = path.join(__dirname, '..', f); if (fs.existsSync(p)) for (const line of fs.readFileSync(p, 'utf8').split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !e[m[1]]) e[m[1]] = m[2].trim(); } } return e; }
(async () => {
  const e = env(); const conn = await mysql.createConnection({ host: e.DB_HOST || '127.0.0.1', port: Number(e.DB_PORT || 3306), user: e.DB_USER || 'root', password: e.DB_PASSWORD || '', database: e.DB_NAME || 'talk_app', multipleStatements: true });
  const hash = pw => bcrypt.hashSync(pw, 10);
  // Packages — Free 15 min/day; Plus 100 taka; Pro 150 taka. AI reports (owner decision 2026-11-21): Plus = weekly, Pro = daily, Free = none.
  // `description` is the card's "Best for …" line, exactly as in the approved preview.
  await conn.query("DELETE FROM payment_requests"); await conn.query("DELETE FROM subscriptions"); await conn.query("DELETE FROM packages");
  await conn.query(`INSERT INTO packages (name, price_taka, daily_call_minutes, ai_reports, ai_report_frequency, tag, description, included, not_included, sort_order) VALUES
  ('Free',0,15,0,'none','','Best for trying Talk','15 minutes of random calls per day\nJoin public rooms\nAudio & video calls\nPartner ratings after calls of 5+ minutes\nEnd-to-end encrypted calls and chats','Unlimited calls\nPrivate rooms with a password\nAI daily reports',0),
  ('Plus',100,NULL,1,'weekly','Most popular','Best for daily practice','Unlimited random calls — no 15-minute-per-day limit\nPriority matching by gender\nCreate private rooms with a password\nFull stats, charts and history\nAI weekly reports\nEverything in Free','AI daily reports (Pro)\nNative-speaker priority in matching',1),
  ('Pro',150,NULL,1,'daily','Most features','Best for serious learners','Everything in Plus\nNative-speaker priority in matching\nPriority support\nAI daily reports','',2)`);
  const [pk] = await conn.query('SELECT id, name FROM packages'); const pkg = Object.fromEntries(pk.map(r => [r.name, r.id]));
  // Users — the preview's dummy people. Demo password for every seeded user: password123 (seed only).
  // [name, email, avatar, phone, vis, gender, pref, city, country, online, username, note, goal, device, ip, joined]
  const people = [
    ['Md Zahid Hasan', 'zahid@example.com', 'zahid.jpg', '+880 1712-000000', 'friends', 'male', 'both', 'Dhaka', 'Bangladesh', 1, 'zahid', null, 'Fluency', 'Windows PC', '103.25.118.21', '2026-10-03 10:00:00'],
    ['Tania Islam', 'tania@example.com', 'tania.jpg', '+880 1712-345678', 'public', 'female', 'both', 'Dhaka', 'Bangladesh', 1, 'tania', 'IELTS · Speaking partner', 'IELTS', 'Android phone', '103.25.118.21', '2026-10-05 10:00:00'],
    ['Rahim Ahmed', 'rahim@example.com', 'rahim.jpg', '+880 1812-345678', 'friends', 'male', 'both', 'Dhaka', 'Bangladesh', 1, 'rahim', 'Daily English', 'Fluency', 'iPhone', '103.25.119.44', '2026-10-06 10:00:00'],
    ['Sadia Rahman', 'sadia@example.com', 'sadia.jpg', null, 'onlyme', 'female', 'both', 'Sylhet', 'Bangladesh', 0, 'sadia', 'Small talk', 'Fluency', 'Android phone', '103.25.120.9', '2026-10-08 10:00:00'],
    ['Farhana Haque', 'farhana@example.com', 'farhana.jpg', '+880 1712-333333', 'friends', 'female', 'male', 'Khulna', 'Bangladesh', 1, 'farhana', 'Debate prep', 'Debate', 'iPhone', '103.25.121.30', '2026-10-09 10:00:00'],
    ['Nusrat Jahan', 'nusrat@example.com', 'nusrat.jpg', null, 'onlyme', 'female', 'both', 'Dhaka', 'Bangladesh', 0, 'nusrat', null, 'IELTS', 'Android phone', '103.25.122.71', '2026-10-11 10:00:00'],
    ['Arif Rahman', 'arif@example.com', 'arif.jpg', '+880 1612-444444', 'public', 'male', 'both', 'Rajshahi', 'Bangladesh', 0, 'arif', null, 'Fluency', 'Android phone', '103.25.123.18', '2026-10-12 10:00:00'],
    ['Imran Hossain', 'imran@example.com', 'imran.jpg', null, 'friends', 'male', 'female', 'Chattogram', 'Bangladesh', 1, 'imran', 'Debate · Advanced', 'Debate', 'Windows PC', '103.25.124.55', '2026-10-14 10:00:00'],
    ['Tanvir Hasan', 'tanvir@example.com', 'tanvir.jpg', null, 'onlyme', 'male', 'both', 'Dhaka', 'Bangladesh', 0, 'tanvir', null, 'Fluency', 'Android phone', '103.25.125.60', '2026-10-15 10:00:00'],
    ['Emma Wilson', 'emma@example.com', 'emma.jpg', null, 'public', 'female', 'both', 'London', 'United Kingdom', 1, 'emma', null, 'Travel', 'iPhone', '82.14.96.10', '2026-10-16 10:00:00'],
    ['Kenji Tanaka', 'kenji@example.com', 'kenji.jpg', null, 'friends', 'male', 'both', 'Osaka', 'Japan', 0, 'kenji', null, 'Fluency', 'Android phone', '126.78.10.4', '2026-10-18 10:00:00'],
    ['Maria Garcia', 'maria@example.com', 'maria.jpg', null, 'public', 'female', 'both', 'Madrid', 'Spain', 1, 'maria', null, 'Fluency', 'iPhone', '83.45.200.17', '2026-10-19 10:00:00'],
    ['Priya Sharma', 'priya@example.com', 'priya.jpg', null, 'friends', 'female', 'both', 'Kolkata', 'India', 0, 'priya', null, 'IELTS', 'Android phone', '103.90.44.81', '2026-10-20 10:00:00'],
  ];
  const ids = {};
  for (const [name, email, avatar, phone, vis, gender, pref, city, country, online, username, note, goal, device, ip, joined] of people) {
    const [r] = await conn.query('INSERT INTO users (name,username,note,goal,device,last_ip,email,password_hash,avatar,phone,phone_visibility,gender,talk_preference,city,country,is_online,last_seen_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)', [name, username, note, goal, device, ip, email, hash('password123'), '/assets/faces/' + avatar, phone, vis, gender, pref, city, country, online, joined, joined]);
    ids[email] = r.insertId;
    // Keep the demo profile fields aligned on re-seed.
    await conn.query('UPDATE users SET username=?, note=?, goal=?, device=?, last_ip=?, phone=?, phone_visibility=?, city=?, country=?, is_online=?, created_at=? WHERE id=?', [username, note, goal, device, ip, phone, vis, city, country, online, joined, r.insertId]);
  }
  const zahid = ids['zahid@example.com'];
  await conn.query('UPDATE users SET bio = ? WHERE id = ?', ['Practising English for fluency — happy to talk about economics, debating and everyday life in Dhaka.', zahid]);
  await conn.query('UPDATE users SET ai_reports_optin = 1 WHERE id IN (?, ?)', [ids['tania@example.com'], ids['maria@example.com']]);
  // Subscriptions: everyone on Free; Tania Pro, Rahim + Farhana Plus (as in the preview's admin).
  for (const email of Object.keys(ids)) await conn.query("INSERT INTO subscriptions (user_id, package_id, status, expires_at) SELECT ?, ?, 'active', NULL FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM subscriptions WHERE user_id=?)", [ids[email], pkg['Free'], ids[email]]);
  for (const [em, plan, ago] of [['tania@example.com', 'Pro', 6], ['rahim@example.com', 'Plus', 9], ['farhana@example.com', 'Plus', 4]]) {
    await conn.query("UPDATE subscriptions SET status = 'expired' WHERE user_id = ? AND status = 'active'", [ids[em]]);
    await conn.query("INSERT INTO subscriptions (user_id, package_id, status, started_at, expires_at) VALUES (?, ?, 'active', NOW() - INTERVAL ? DAY, NOW() + INTERVAL 24 DAY)", [ids[em], pkg[plan], ago]);
  }
  // Zahid's accepted people (privacy rule: only after a call + accepted request — seeded as that history).
  for (const em of ['tania@example.com', 'rahim@example.com', 'sadia@example.com', 'farhana@example.com', 'nusrat@example.com', 'arif@example.com', 'imran@example.com', 'emma@example.com']) {
    await conn.query("INSERT IGNORE INTO friendships (requester_id, addressee_id, status) VALUES (?,?,'accepted')", [zahid, ids[em]]);
  }
  // Rooms from the preview.
  const roomHash = hash('ielts123');
  const rooms = [
    ['Daily English — Talk About Your Day', 'Friendly speaking practice.', 'public', null],
    ['IELTS Speaking — Part 2', 'Timed pairs, gentle feedback.', 'private', roomHash],
    ['Debate Prep — Evening', 'Build an argument, defend it.', 'public', null],
    ['Job Interview Practice', 'Common questions, out loud.', 'public', null],
  ];
  const roomIds = {};
  for (const [t, topic, vis, pw] of rooms) { await conn.query('INSERT INTO rooms (title, topic, visibility, password_hash, creator_id) SELECT ?,?,?,?,? FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE title=?)', [t, topic, vis, pw, zahid, t]); const [rr] = await conn.query('SELECT id FROM rooms WHERE title = ?', [t]); roomIds[t] = rr[0].id; }
  // ---- Daily stats -------------------------------------------------------
  // Owner: today 24 · week 168 · all-time 342 · 26 calls · 9-day streak (matches the preview's dashboard).
  await conn.query('DELETE FROM user_daily_stats WHERE user_id IN (SELECT id FROM (SELECT id FROM users WHERE email LIKE ?) AS t)', ['%@example.com']);
  const ownerDays = [
    [0, 24, 2], [1, 36, 2], [2, 22, 1], [3, 30, 1], [4, 12, 1], [5, 26, 2], [6, 18, 2], // this week = 168
    [7, 8, 1], [8, 10, 1], /* day 9 intentionally empty — streak break */ [10, 9, 1], [11, 12, 2], [12, 7, 0], [13, 10, 1], [14, 8, 1], [15, 5, 0], [16, 11, 2], [17, 7, 1], [18, 9, 1], [19, 6, 1], // rest of November = 102
    [22, 12, 1], [29, 15, 0], [36, 18, 1], [43, 13, 0], [50, 14, 1], // October = 72
  ];
  for (const [ago, mins, calls] of ownerDays) await conn.query('INSERT INTO user_daily_stats (user_id, day, minutes, calls) VALUES (?, CURDATE() - INTERVAL ? DAY, ?, ?)', [zahid, ago, mins, calls]);
  // Other people: a lively "today" for admin lists + top talkers.
  const todayStats = { 'tania@example.com': [42, 6], 'rahim@example.com': [35, 5], 'imran@example.com': [31, 4], 'sadia@example.com': [28, 4], 'farhana@example.com': [22, 3], 'emma@example.com': [18, 3], 'maria@example.com': [14, 2], 'arif@example.com': [12, 2], 'priya@example.com': [11, 2], 'nusrat@example.com': [9, 1], 'tanvir@example.com': [8, 1], 'kenji@example.com': [6, 1] };
  for (const [em, [mins, calls]] of Object.entries(todayStats)) {
    await conn.query('INSERT INTO user_daily_stats (user_id, day, minutes, calls) VALUES (?, CURDATE(), ?, ?)', [ids[em], mins, calls]);
    await conn.query('INSERT INTO user_daily_stats (user_id, day, minutes, calls) VALUES (?, CURDATE() - INTERVAL 1 DAY, ?, ?)', [ids[em], Math.round(mins * 0.7), Math.max(1, calls - 1)]);
    await conn.query('INSERT INTO user_daily_stats (user_id, day, minutes, calls) VALUES (?, CURDATE() - INTERVAL 3 DAY, ?, ?)', [ids[em], Math.round(mins * 0.8), calls]);
  }
  // ---- Calls + ratings ---------------------------------------------------
  // One ended call per rating; value sets are built to reproduce the preview's averages.
  async function seedRatings(rateeEmail, n, sumF, sumS, sumB, raters) {
    const ratee = ids[rateeEmail];
    const [have] = await conn.query('SELECT COUNT(*) AS n FROM ratings WHERE ratee_id = ?', [ratee]);
    if (have[0].n > 0) return;
    const spread = sum => { const out = []; let left = sum; for (let i = 0; i < n; i++) { const slots = n - i; const lo = Math.max(1, left - (slots - 1) * 5); const hi = Math.min(5, left - (slots - 1)); const v = Math.max(lo, Math.min(hi, 5)); out.push(v); left -= v; } return out; };
    const F = spread(sumF), S = spread(sumS), B = spread(sumB);
    for (let i = 0; i < n; i++) {
      const rater = ids[raters[i % raters.length]];
      const agoH = 3 + i * 11; // hours ago
      const dur = 330 + ((i * 137) % 900);
      const [c] = await conn.query("INSERT INTO calls (caller_id, callee_id, channel, kind, status, started_at, ended_at, duration_seconds) VALUES (?, ?, ?, ?, 'ended', NOW() - INTERVAL ? HOUR, NOW() - INTERVAL ? HOUR + INTERVAL ? SECOND, ?)", [rater, ratee, `seed-${ratee}-${i}`, i % 3 === 0 ? 'video' : 'audio', agoH, agoH, dur, dur]);
      await conn.query('INSERT INTO ratings (call_id, rater_id, ratee_id, fluency, speaking, behaviour) VALUES (?,?,?,?,?,?)', [c.insertId, rater, ratee, F[i], S[i], B[i]]);
    }
  }
  const allEmails = Object.keys(ids);
  const others = em => allEmails.filter(x => x !== em).slice(0, 6);
  await seedRatings('zahid@example.com', 19, 85, 84, 91, others('zahid@example.com'));       // 4.6 · F4.5 S4.4 B4.8
  await seedRatings('tania@example.com', 42, 202, 197, 206, others('tania@example.com'));    // 4.8 · F4.8 S4.7 B4.9
  await seedRatings('rahim@example.com', 31, 143, 142, 143, others('rahim@example.com'));    // 4.6
  await seedRatings('sadia@example.com', 18, 81, 80, 82, others('sadia@example.com'));       // 4.5
  await seedRatings('imran@example.com', 35, 168, 167, 169, others('imran@example.com'));    // 4.8
  // Room practice history (face stacks + rooms joined).
  const [roomCalls] = await conn.query('SELECT COUNT(*) AS n FROM calls WHERE room_id IS NOT NULL');
  if (roomCalls[0].n === 0) {
    const roomPractice = [
      ['Daily English — Talk About Your Day', 'rahim@example.com', 1500, 26], ['Daily English — Talk About Your Day', 'tania@example.com', 1320, 30],
      ['IELTS Speaking — Part 2', 'arif@example.com', 900, 50], ['IELTS Speaking — Part 2', 'farhana@example.com', 840, 55],
      ['Debate Prep — Evening', 'imran@example.com', 1200, 70],
      ['Job Interview Practice', 'nusrat@example.com', 780, 90], ['Job Interview Practice', 'tania@example.com', 960, 95],
    ];
    for (const [title, em, dur, agoH] of roomPractice) await conn.query("INSERT INTO calls (caller_id, callee_id, room_id, channel, kind, status, started_at, ended_at, duration_seconds) VALUES (?, NULL, ?, ?, 'room', 'ended', NOW() - INTERVAL ? HOUR, NOW() - INTERVAL ? HOUR + INTERVAL ? SECOND, ?)", [ids[em], roomIds[title], `room-${roomIds[title]}`, agoH, agoH, dur, dur]);
    // The owner practised in two rooms himself.
    for (const [title, dur, agoH] of [['Daily English — Talk About Your Day', 1500, 26], ['Debate Prep — Evening', 1080, 74]]) await conn.query("INSERT INTO calls (caller_id, callee_id, room_id, channel, kind, status, started_at, ended_at, duration_seconds) VALUES (?, NULL, ?, ?, 'room', 'ended', NOW() - INTERVAL ? HOUR, NOW() - INTERVAL ? HOUR + INTERVAL ? SECOND, ?)", [zahid, roomIds[title], `room-${roomIds[title]}`, agoH, agoH, dur, dur]);
  }
  // ---- Chats -------------------------------------------------------------
  {
    async function convo(otherEmail, msgs) {
      const other = ids[otherEmail]; const a = Math.min(zahid, other), b = Math.max(zahid, other);
      await conn.query('INSERT IGNORE INTO conversations (user_a, user_b) VALUES (?, ?)', [a, b]);
      const [crow] = await conn.query('SELECT id FROM conversations WHERE user_a = ? AND user_b = ?', [a, b]);
      const cid = crow[0].id;
      const [mc] = await conn.query('SELECT COUNT(*) AS n FROM messages WHERE conversation_id = ?', [cid]);
      if (mc[0].n > 0) return;
      for (const [fromMe, kind, text, agoMin, read] of msgs) await conn.query('INSERT INTO messages (conversation_id, sender_id, kind, ciphertext, read_at, created_at) VALUES (?, ?, ?, ?, ?, NOW() - INTERVAL ? MINUTE)', [cid, fromMe ? zahid : other, kind, text, read ? new Date() : null, agoMin]);
    }
    await convo('tania@example.com', [
      [false, 'text', 'Hi! 👋 Ready for speaking practice today? 😊', 200, true],
      [true, 'text', 'Yes — 10 minutes?', 195, true],
      [true, 'photo_ref', 'asset:study-notes.webp|Sharing my study notes from this morning 📚', 190, true],
      [false, 'text', 'Perfect 👍 Join my room or call me here.', 139, true],
    ]);
    await convo('rahim@example.com', [
      [false, 'text', 'For the debate practice tomorrow, I prepared my side.', 175, false],
      [false, 'text', 'I have two new arguments ready.', 168, false],
    ]);
    await convo('sadia@example.com', [[false, 'text', 'Hi Zahid! ☕ Small talk practice tomorrow morning?', 1500, true]]);
    await convo('arif@example.com', [[false, 'text', 'Anytime. Your answers are getting sharper 💪', 1560, false]]);
    await convo('farhana@example.com', [[false, 'text', 'Can we rehearse my debate opening once more?', 2900, true]]);
    await convo('imran@example.com', [[false, 'text', 'Advanced debate room is live — join when free.', 4400, true]]);
    await convo('nusrat@example.com', [[false, 'text', 'Job interview questions list is ready when you are 📚', 5800, true]]);
    await convo('emma@example.com', [[false, 'text', 'Hi! Want to practise English together?', 7300, true]]);
  }
  // ---- Notifications for the owner (badge = 5 unread, as in the preview) --
  const [notifCount] = await conn.query('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ?', [zahid]);
  if (notifCount[0].n === 0) {
    const notifs = [
      ['missed_call', 'farhana@example.com', 'Farhana Haque', 'Missed call', 0, 133],
      ['message', 'rahim@example.com', 'Rahim Ahmed', 'I have two new arguments ready.', 0, 168],
      ['missed_call', 'imran@example.com', 'Imran Hossain', 'Missed call', 0, 1500],
      ['message', 'arif@example.com', 'Arif Rahman', 'Anytime. Your answers are getting sharper 💪', 0, 1560],
      ['message', 'sadia@example.com', 'Sadia Rahman', 'Hi Zahid! ☕ Small talk practice tomorrow morning?', 0, 1500],
      ['message', 'tania@example.com', 'Tania Islam', 'Perfect 👍 Join my room or call me here.', 1, 139],
    ];
    for (const [kind, actorEm, title, body, read, agoMin] of notifs) await conn.query('INSERT INTO notifications (user_id, kind, actor_id, title, body, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW() - INTERVAL ? MINUTE)', [zahid, kind, actorEm ? ids[actorEm] : null, title, body, read, agoMin]);
  }
  // ---- Support tickets for the owner (the preview's three) ---------------
  const [tktCount] = await conn.query('SELECT COUNT(*) AS n FROM support_tickets WHERE user_id = ?', [zahid]);
  if (tktCount[0].n === 0) {
    await conn.query("INSERT INTO support_tickets (user_id, kind, subject, body, status, admin_note, created_at, updated_at) VALUES (?, 'Calls & audio', 'Partner could not hear me on one call', 'On Tuesday evening my partner said my voice kept breaking up for the first two minutes, then it became clear. My internet was fine and other calls that day were okay.', 'open', 'Thanks for the detail — we are checking that call slot on our side. Could you tell us your phone model? It helps us reproduce it.', NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 2 HOUR)", [zahid]);
    await conn.query("INSERT INTO support_tickets (user_id, kind, subject, body, status, admin_note, created_at, updated_at) VALUES (?, 'Subscription & payment', 'Paid with bKash but plan still shows Free', 'I paid ৳100 for Plus yesterday afternoon. The payment went through and I got the confirmation message, but my Subscription page still shows Free.', 'answered', 'We found your payment — your Plus plan is now active. Sorry for the delay, and thank you for the transaction reference.', NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 1 DAY)", [zahid]);
    await conn.query("INSERT INTO support_tickets (user_id, kind, subject, body, status, admin_note, created_at, updated_at) VALUES (?, 'AI daily report', 'How do I turn daily reports off?', 'I turned AI daily reports on last week and liked them, but I want a break from them this month. Where is the switch to turn them off?', 'resolved', 'You can turn them off anytime in Profile → Preferences — look for “Daily AI reports”. Turning it back on later keeps your old reports.', NOW() - INTERVAL 7 DAY, NOW() - INTERVAL 4 DAY)", [zahid]);
  }
  // Admin + AI settings + payment numbers (prototype values, editable in Super Admin).
  await conn.query("INSERT INTO admin_users (email, password_hash) VALUES ('admin@talk.app', ?) ON DUPLICATE KEY UPDATE email=email", [hash('admin123')]);
  await conn.query("INSERT INTO ai_settings (provider, base_url, api_key_masked, stt_model, analysis_model, credit_balance_usd, soft_daily_ai_minutes) SELECT 'DeepSeek','https://api.deepseek.com','sk-••••••••••••','deepseek-chat','deepseek-chat',25.00,30 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM ai_settings)");
  await conn.query("INSERT INTO app_settings (k, v) VALUES ('pay_bkash_number','01712-345678'),('pay_nagad_number','01812-345678') ON DUPLICATE KEY UPDATE k=k");
  console.log('seed OK. users:', Object.keys(ids).length, 'zahid id:', zahid);
  await conn.end();
})().catch(err => { console.error('seed FAILED:', err); process.exit(1); });
