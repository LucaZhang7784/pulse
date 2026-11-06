'use strict';

// Antigravity — mirrors Pulse's `AntigravityUsageService`.
//
// Antigravity has no account endpoint and no stored login: its language server
// (Codeium's `language_server`) talks over HTTPS on the loopback interface and
// is the only thing that knows the quota. So this works only while something of
// Antigravity's is running. Its language-server process requests port 0 and
// does not own the HTTPS listener; the GUI serves the RPCs and logs its current
// local HTTPS port. Read the current port from that log and the CSRF token from
// the local HTML page.

const https = require('https');
const fs = require('fs');
const path = require('path');
const { home, unavailable } = require('./common');

const QUOTA_METHOD = 'exa.language_server_pb.LanguageServerService/RetrieveUserQuotaSummary';
const STATUS_METHOD = 'exa.language_server_pb.LanguageServerService/GetUserStatus';
const CSRF_HEADER = 'x-codeium-csrf-token';

const LOG_PATH = path.join(home(), 'AppData', 'Roaming', 'Antigravity', 'logs', 'main.log');
const CONVERSATIONS_PATH = path.join(home(), '.gemini', 'antigravity', 'conversations');

async function currentSession() {
  let files;
  try {
    files = fs.readdirSync(CONVERSATIONS_PATH, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /^[0-9a-f-]+\.db$/i.test(entry.name))
      .map((entry) => {
        const file = path.join(CONVERSATIONS_PATH, entry.name);
        return { file, mtimeMs: fs.statSync(file).mtimeMs };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs);
  } catch {
    return null;
  }
  const newest = files[0];
  if (!newest) return null;

  // Antigravity stores its local conversation database as SQLite. Query only
  // the latest generated response; JSON metadata is embedded in its protobuf.
  const candidates = [
    path.join(path.dirname(process.execPath), 'resources', 'app.asar.unpacked', 'node_modules', 'sql.js', 'dist', 'sql-wasm.js'),
    path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.js'),
  ];
  const wasmPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!wasmPath) return null;
  try {
    const initSqlJs = require(wasmPath);
    const SQL = await initSqlJs({ locateFile: (file) => path.join(path.dirname(wasmPath), file) });
    const bytes = fs.readFileSync(newest.file);
    const db = new SQL.Database(bytes);
    try {
      const rows = db.exec('SELECT data FROM gen_metadata ORDER BY idx DESC LIMIT 1');
      if (!rows.length || !rows[0].values.length) return null;
      const raw = Buffer.from(rows[0].values[0][0]).toString('latin1');
      const modelMatches = [...raw.matchAll(/gemini-[a-z0-9.-]+/gi)];
      const model = modelMatches
        .map((match) => match[0])
        .filter((name) => /-(?:flash|pro|ultra)(?:-(?:lite|medium|high|preview|latest))?$/i.test(name))
        .sort((a, b) => b.length - a.length)[0] || null;
      const effort = [...raw.matchAll(/(?:"model"\s*:\s*"([^"]+)")|(?:"thinking_level"\s*:\s*"([^"]+)")/g)];
      const response = [...raw.matchAll(/"input_tokens":(\d+),"cache_read_tokens":(\d+),"output_tokens":(\d+)/g)];
      const usage = response.length ? response[response.length - 1] : null;
      return model ? {
        model,
        strength: model && /-(flash|pro|ultra)(?:-([a-z]+))?$/i.test(model)
          ? `${RegExp.$1}${RegExp.$2 ? ` ${RegExp.$2}` : ''}`
          : (effort.length ? effort[effort.length - 1][1] || effort[effort.length - 1][2] : null),
        inputTokens: usage ? Number(usage[1]) : null,
        cachedTokens: usage ? Number(usage[2]) : null,
        outputTokens: usage ? Number(usage[3]) : null,
        observedAt: newest.mtimeMs / 1000,
      } : null;
    } finally { db.close(); }
  } catch {
    return null;
  }
}

function latestGuiPort() {
  try {
    const text = fs.readFileSync(LOG_PATH, 'utf8');
    const matches = [...text.matchAll(/Local:\s+https:\/\/127\.0\.0\.1:(\d+)/g)];
    return matches.length ? Number(matches[matches.length - 1][1]) : null;
  } catch {
    return null;
  }
}

function readGuiToken(port) {
  return new Promise((resolve) => {
    const req = https.get({
      hostname: '127.0.0.1',
      port,
      path: '/',
      rejectUnauthorized: false,
      timeout: 3000,
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const html = Buffer.concat(chunks).toString('utf8');
        const match = html.match(/"csrfToken"\s*:\s*"([^"]+)"/);
        resolve(match ? match[1] : null);
      });
    });
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
  });
}

async function locateServers() {
  const port = latestGuiPort();
  if (!port) return [];
  const token = await readGuiToken(port);
  return token ? [{ ports: [port], token }] : [];
}

function httpsPostLoopback(port, method, token) {
  return new Promise((resolve) => {
    const body = Buffer.from('{}');
    const req = https.request({
      host: '127.0.0.1',
      port,
      path: `/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [CSRF_HEADER]: token,
        'Content-Length': body.length,
      },
      rejectUnauthorized: false,
      timeout: 6000,
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode === 200) {
          try {
            resolve({ ok: true, body: JSON.parse(text) });
          } catch {
            resolve({ ok: false, reason: 'unreadable' });
          }
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          resolve({ ok: false, reason: 'refused' });
        } else {
          resolve({ ok: false, reason: 'wrongPort' });
        }
      });
    });
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, reason: 'wrongPort' }); });
    req.on('error', () => resolve({ ok: false, reason: 'wrongPort' }));
    req.write(body);
    req.end();
  });
}

function lengthOf(window) {
  if (!window) return null;
  const w = window.toLowerCase();
  if (w === '5h') return { kind: '5h', seconds: 5 * 3600 };
  if (w === 'weekly') return { kind: 'weekly', seconds: 7 * 86400 };
  if (w === 'daily') return { kind: '24h', seconds: 86400 };
  if (w === 'monthly') return { kind: 'monthly', seconds: 30 * 86400 };
  const unit = w.slice(-1);
  const count = parseInt(w.slice(0, -1), 10);
  if (!count) return null;
  if (unit === 'h') return { kind: count === 5 ? '5h' : `${count}h`, seconds: count * 3600 };
  if (unit === 'd') return { kind: count === 7 ? 'weekly' : `${count}d`, seconds: count * 86400 };
  return null;
}

function modelGroup(name) {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  const words = trimmed.split(' ');
  if (words.length > 1 && words[words.length - 1].toLowerCase() === 'models') {
    return words.slice(0, -1).join(' ');
  }
  return trimmed;
}

function windowsFrom(reply) {
  const groups = (reply && reply.response && reply.response.groups) || [];
  const windows = [];
  for (const group of groups) {
    const scope = modelGroup(group.displayName);
    for (const bucket of group.buckets || []) {
      const len = lengthOf(bucket.window);
      if (!bucket.bucketId || bucket.remainingFraction === undefined || bucket.remainingFraction === null || !len) continue;
      const used = Math.min(Math.max(1 - bucket.remainingFraction, 0), 1);
      windows.push({
        id: bucket.bucketId,
        kind: len.kind,
        scope,
        usedFraction: used,
        windowSeconds: len.seconds,
        resetsAt: bucket.resetTime ? Date.parse(bucket.resetTime) / 1000 : null,
        isExhausted: bucket.remainingFraction <= 0,
      });
    }
  }
  windows.sort((a, b) => a.windowSeconds - b.windowSeconds);
  return windows;
}

async function askQuota(port, token) {
  const r = await httpsPostLoopback(port, QUOTA_METHOD, token);
  if (!r.ok) return { status: r.reason, windows: [] };
  return { status: 'ok', windows: windowsFrom(r.body) };
}

async function askPlan(port, token) {
  const r = await httpsPostLoopback(port, STATUS_METHOD, token);
  if (!r.ok) return null;
  try {
    return (r.body.userStatus && r.body.userStatus.planStatus
      && r.body.userStatus.planStatus.planInfo && r.body.userStatus.planStatus.planInfo.planName) || null;
  } catch {
    return null;
  }
}

async function fetchUsage() {
  const session = await currentSession();
  const servers = await locateServers();
  if (!servers.length) return unavailable('antigravity', 'notRunning');

  let answeredEmpty = false;
  let somethingAnswered = false;

  for (const server of servers) {
    for (const port of server.ports) {
      const result = await askQuota(port, server.token);
      if (result.status === 'ok' && result.windows.length) {
        const plan = await askPlan(port, server.token);
        return {
          id: 'antigravity',
          state: 'live',
          reason: null,
          plan,
          creditBalance: null,
          session,
          windows: result.windows,
          observedAt: Date.now() / 1000,
        };
      }
      if (result.status === 'ok') answeredEmpty = true;
      if (result.status !== 'wrongPort') somethingAnswered = true;
    }
  }

  if (answeredEmpty) return unavailable('antigravity', 'noLimitsReported');
  return unavailable('antigravity', somethingAnswered ? 'notAnswering' : 'notRunning');
}

module.exports = { fetchUsage, locateServers, windowsFrom, currentSession };
