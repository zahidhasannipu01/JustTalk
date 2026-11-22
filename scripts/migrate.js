const fs = require('fs'); const path = require('path'); const mysql = require('mysql2/promise');
function env() { const e = { ...process.env }; for (const f of ['.env.local', '.env.local-db']) { const p = path.join(__dirname, '..', f); if (fs.existsSync(p)) for (const line of fs.readFileSync(p, 'utf8').split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !e[m[1]]) e[m[1]] = m[2].trim(); } } return e; }
(async () => { const e = env(); const conn = await mysql.createConnection({ host: e.DB_HOST || '127.0.0.1', port: Number(e.DB_PORT || 3306), user: e.DB_USER || 'root', password: e.DB_PASSWORD || '', database: e.DB_NAME || 'talk_app', multipleStatements: true });
  // Direct-WebRTC conversion: calls.livekit_room was renamed to calls.channel (guarded, safe on fresh DBs).
  const [cols] = await conn.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calls' AND COLUMN_NAME IN ('livekit_room','channel')");
  const colNames = cols.map(c => c.COLUMN_NAME);
  if (colNames.includes('livekit_room') && !colNames.includes('channel')) await conn.query('ALTER TABLE calls CHANGE COLUMN livekit_room channel VARCHAR(120) NOT NULL');
  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8'); await conn.query(sql);
  await conn.query("ALTER TABLE packages ADD COLUMN IF NOT EXISTS ai_report_frequency VARCHAR(10) NOT NULL DEFAULT 'none'");
  await conn.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(40) NULL");
  await conn.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS note VARCHAR(160) NULL");
  await conn.query("CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username ON users (username)");
  await conn.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at DATETIME NULL");
  await conn.query("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS actor_id INT UNSIGNED NULL");
  await conn.query("ALTER TABLE calls ADD COLUMN IF NOT EXISTS source VARCHAR(10) NOT NULL DEFAULT 'direct'");
  await conn.query("ALTER TABLE calls MODIFY status ENUM('ringing','active','ended','missed','declined','cancelled') NOT NULL DEFAULT 'ringing'");
  await conn.query("ALTER TABLE notifications MODIFY kind ENUM('message','missed_call','subscription_reminder','payment','system','friend_request','friend_accepted') NOT NULL");
  await conn.query("ALTER TABLE messages MODIFY kind ENUM('text','photo_ref','call_log') NOT NULL DEFAULT 'text'");
  // AI speaking reports: raw own-voice transcript chunks + scored report fields.
  await conn.query(`CREATE TABLE IF NOT EXISTS speech_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    call_id INT UNSIGNED NULL,
    day DATE NOT NULL,
    text MEDIUMTEXT NOT NULL,
    words INT NOT NULL DEFAULT 0,
    seconds INT NOT NULL DEFAULT 0,
    confidence DECIMAL(4,3) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX ix_speech_user_day (user_id, day),
    CONSTRAINT fk_speech_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await conn.query("ALTER TABLE ai_reports ADD COLUMN IF NOT EXISTS overall INT NULL");
  await conn.query("ALTER TABLE ai_reports ADD COLUMN IF NOT EXISTS summary TEXT NULL");
  await conn.query("ALTER TABLE ai_reports ADD COLUMN IF NOT EXISTS scores TEXT NULL");
  await conn.query("ALTER TABLE ai_reports ADD COLUMN IF NOT EXISTS period VARCHAR(10) NOT NULL DEFAULT 'daily'");
  await conn.query("ALTER TABLE ai_reports ADD COLUMN IF NOT EXISTS covered_until BIGINT NOT NULL DEFAULT 0");
  const [t] = await conn.query('SHOW TABLES'); console.log('migrate OK, tables:', t.length); await conn.end(); })().catch(err => { console.error('migrate FAILED:', err.message); process.exit(1); });
