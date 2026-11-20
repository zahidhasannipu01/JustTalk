const fs = require('fs'); const path = require('path'); const mysql = require('mysql2/promise');
function env() { const e = { ...process.env }; for (const f of ['.env.local', '.env.local-db']) { const p = path.join(__dirname, '..', f); if (fs.existsSync(p)) for (const line of fs.readFileSync(p, 'utf8').split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !e[m[1]]) e[m[1]] = m[2].trim(); } } return e; }
(async () => { const e = env(); const conn = await mysql.createConnection({ host: e.DB_HOST || '127.0.0.1', port: Number(e.DB_PORT || 3306), user: e.DB_USER || 'talkapp', password: e.DB_PASSWORD || '', database: e.DB_NAME || 'talk_app', multipleStatements: true });
  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8'); await conn.query(sql);
  await conn.query("ALTER TABLE packages ADD COLUMN IF NOT EXISTS ai_report_frequency VARCHAR(10) NOT NULL DEFAULT 'none'");
  await conn.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(40) NULL");
  await conn.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS note VARCHAR(160) NULL");
  await conn.query("CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username ON users (username)");
  await conn.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at DATETIME NULL");
  await conn.query("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS actor_id INT UNSIGNED NULL");
  const [t] = await conn.query('SHOW TABLES'); console.log('migrate OK, tables:', t.length); await conn.end(); })().catch(err => { console.error('migrate FAILED:', err.message); process.exit(1); });
