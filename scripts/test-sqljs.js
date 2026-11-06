'use strict';
const initSqlJs = require('sql.js');
const fs = require('fs');
const os = require('os');
const path = require('path');

(async () => {
  const SQL = await initSqlJs();
  const dbPath = path.join(os.homedir(), '.cc-switch', 'cc-switch.db');
  const db = new SQL.Database(fs.readFileSync(dbPath));
  const r = db.exec("SELECT name, settings_config FROM providers WHERE name LIKE 'DeepSeek' AND app_type='claude' LIMIT 1");
  console.log('sql.js works. rows:', r.length, 'columns:', r[0] ? r[0].columns.join(',') : null);
  db.close();
})().catch((e) => console.error('ERR', e.message));
