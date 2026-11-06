'use strict';

// Reads provider credentials that CC Switch (farion1231/cc-switch) already
// stored on this machine, so the user doesn't have to re-enter keys.
//
// CC Switch keeps its providers in a SQLite database at `~/.cc-switch/cc-switch.db`,
// in a `providers` table whose `settings_config` column holds JSON with the
// API key under `env.ANTHROPIC_AUTH_TOKEN` (Claude app), `auth.OPENAI_API_KEY`
// (Codex app) or `options.apiKey` (OpenCode app).

const fs = require('fs');
const os = require('os');
const path = require('path');
const initSqlJs = require('sql.js');

let dbCache = null;
let dbCacheAt = 0;
let sqlJSReady = null;
const DB_TTL_MS = 5 * 60 * 1000;

// sql.js exposes no subpath for its wasm (an `exports` field blocks it), so it
// is read next to the module's own entry point and passed as a binary. Reading
// it via `fs` also works from inside an Electron asar archive.
async function sqlJS() {
  if (!sqlJSReady) {
    sqlJSReady = (async () => {
      const mainPath = require.resolve('sql.js');
      const wasmPath = path.join(path.dirname(mainPath), 'sql-wasm.wasm');
      const wasmBinary = fs.readFileSync(wasmPath);
      return initSqlJs({ wasmBinary });
    })();
  }
  return sqlJSReady;
}

async function loadDB() {
  if (dbCache && Date.now() - dbCacheAt < DB_TTL_MS) return dbCache;
  const candidates = [
    path.join(os.homedir(), '.cc-switch', 'cc-switch.db'),
  ];
  // Windows legacy location when HOME is set elsewhere.
  if (process.env.HOME) {
    candidates.push(path.join(process.env.HOME, '.cc-switch', 'cc-switch.db'));
  }
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    try {
      const SQL = await sqlJS();
      const db = new SQL.Database(fs.readFileSync(p));
      dbCache = db;
      dbCacheAt = Date.now();
      return db;
    } catch {
      // try next candidate
    }
  }
  return null;
}

function extractKey(settingsConfig) {
  if (!settingsConfig) return null;
  let cfg;
  try {
    cfg = JSON.parse(settingsConfig);
  } catch {
    return null;
  }
  const env = cfg.env || {};
  const auth = cfg.auth || {};
  const options = cfg.options || {};
  return (
    env.ANTHROPIC_AUTH_TOKEN
    || env.OPENAI_API_KEY
    || auth.OPENAI_API_KEY
    || options.apiKey
    || null
  );
}

// Returns { deepSeekKey, kimiKey, openRouterKey, vercelKey, minimaxKey, zhipuKey,
// ofoxKey } — whatever CC Switch has for these. Xiaomi MiMo's CC Switch entry
// holds only an inference key, which the console account routes refuse, so it
// is deliberately not returned here.
async function readCCSwitchCredentials() {
  const db = await loadDB();
  const empty = {
    deepSeekKey: null,
    kimiKey: null,
    openRouterKey: null,
    vercelKey: null,
    minimaxKey: null,
    zhipuKey: null,
    ofoxKey: null,
  };
  if (!db) return empty;

  const result = { ...empty };
  // Claude-app entries first (they carry the canonical provider keys), then any
  // other app type so a provider configured only for Codex/OpenCode still lands.
  const queries = [
    "SELECT name, settings_config FROM providers WHERE app_type='claude'",
    'SELECT name, settings_config FROM providers',
  ];
  try {
    for (const query of queries) {
      const rows = db.exec(query);
      for (const table of rows) {
        const { columns, values } = table;
        const nameIdx = columns.indexOf('name');
        const cfgIdx = columns.indexOf('settings_config');
        for (const row of values) {
          const name = row[nameIdx] || '';
          const key = extractKey(row[cfgIdx]);
          if (!key) continue;
          if (/deepseek/i.test(name) && !result.deepSeekKey) result.deepSeekKey = key;
          if (/kimi/i.test(name) && !result.kimiKey) result.kimiKey = key;
          if (/openrouter/i.test(name) && !result.openRouterKey) result.openRouterKey = key;
          if (/vercel/i.test(name) && !result.vercelKey) result.vercelKey = key;
          if (/minimax/i.test(name) && !result.minimaxKey) result.minimaxKey = key;
          if (/zhipu|bigmodel|glm/i.test(name) && !result.zhipuKey) result.zhipuKey = key;
          if (/ofox/i.test(name) && !result.ofoxKey) result.ofoxKey = key;
        }
      }
    }
  } catch {
    // ignore — the caller falls back to pasted keys
  }
  return result;
}

module.exports = { readCCSwitchCredentials };
