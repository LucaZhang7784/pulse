'use strict';

// Codex adapter — mirrors Pulse's `CodexUsageService`.
//
// Reads `~/.codex/auth.json` for the OAuth access token Codex stored, then
// asks the same endpoint the CLI itself uses:
//   GET https://chatgpt.com/backend-api/wham/usage
// It answers with account-wide and per-model rate-limit windows, the plan name,
// and any prepaid credit balance.

const path = require('path');
const fs = require('fs');
const { home, readJSON, num, kindForSeconds, unavailable, clamp01 } = require('./common');

const ENDPOINT = 'https://chatgpt.com/backend-api/wham/usage';
const INITIAL_SESSION_TAIL_BYTES = 256 * 1024;
const MAX_SESSION_TAIL_BYTES = 4 * 1024 * 1024;
let currentSessionRead = null;

async function newestRollout() {
  const root = path.join(home(), '.codex', 'sessions');
  let newest = null;
  async function visit(dir, depth) {
    if (depth > 4) return;
    let entries;
    try { entries = await fs.promises.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await visit(file, depth + 1);
      else if (entry.isFile() && /^rollout-.*\.jsonl$/.test(entry.name)) {
        try {
          const stat = await fs.promises.stat(file);
          if (!newest || stat.mtimeMs > newest.mtimeMs) newest = { file, mtimeMs: stat.mtimeMs, size: stat.size };
        } catch {}
      }
    }
  }
  await visit(root, 0);
  return newest;
}

async function readSessionTail(file, maxBytes) {
  const handle = await fs.promises.open(file, 'r');
  try {
    const { size } = await handle.stat();
    const length = Math.min(size, maxBytes);
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, size - length);
    let text = buffer.toString('utf8');
    // The first line may start before the tail window; discard only that fragment.
    if (size > length) {
      const firstLineEnd = text.indexOf('\n');
      if (firstLineEnd < 0) return '';
      text = text.slice(firstLineEnd + 1);
    }
    return text;
  } finally {
    await handle.close();
  }
}

async function readCurrentSession() {
  const newest = await newestRollout();
  if (!newest) return null;

  let maxBytes = Math.min(INITIAL_SESSION_TAIL_BYTES, MAX_SESSION_TAIL_BYTES);
  while (true) {
    let text;
    try { text = await readSessionTail(newest.file, maxBytes); } catch { return null; }
    const lines = text.trimEnd().split(/\r?\n/);
    let model = null;
    let strength = null;
    let totalTokens = null;
    for (let i = lines.length - 1; i >= 0; i--) {
      let row;
      try { row = JSON.parse(lines[i]); } catch { continue; }
      const payload = row.payload || {};
      if (row.type === 'turn_context' && !model) {
        const settings = payload.collaboration_mode && payload.collaboration_mode.settings;
        if (settings) { model = settings.model || null; strength = settings.reasoning_effort || null; }
      }
      if (row.type === 'token_usage_record' && totalTokens === null) {
        const usage = payload.turn_token_usage || {};
        totalTokens = Number.isFinite(usage.total_tokens) ? usage.total_tokens : null;
      }
      if (model && strength && totalTokens !== null) break;
    }
    if ((model && strength && totalTokens !== null) || maxBytes >= MAX_SESSION_TAIL_BYTES || maxBytes >= newest.size) {
      return model ? { model, strength, totalTokens, observedAt: newest.mtimeMs / 1000 } : null;
    }
    // ponytail: cap session metadata search at 4 MiB; raise if valid records routinely sit farther back.
    maxBytes = Math.min(maxBytes * 4, MAX_SESSION_TAIL_BYTES, newest.size);
  }
}

function currentSession() {
  if (!currentSessionRead) {
    currentSessionRead = readCurrentSession().finally(() => { currentSessionRead = null; });
  }
  return currentSessionRead;
}

function planName(raw) {
  switch (String(raw || '').toLowerCase()) {
    case 'free': return 'Free';
    case 'go': return 'Go';
    case 'plus': return 'Plus';
    case 'pro': return 'Pro';
    case 'prolite': return 'Pro 5x';
    case 'team': return 'Team';
    case 'business': return 'Business';
    case 'enterprise': return 'Enterprise';
    case 'edu': return 'Edu';
    default: return raw || null;
  }
}

function loadCredentials() {
  const authPaths = [
    path.join(home(), '.codex', 'auth.json'),
    process.env.CODEX_HOME && path.join(process.env.CODEX_HOME, 'auth.json'),
  ].filter(Boolean);
  for (const authPath of authPaths) {
    const root = readJSON(authPath);
    if (!root) continue;
    const tokens = root.tokens || {};
    const accessToken = tokens.access_token;
    const accountID = tokens.account_id;
    if (accessToken && accountID) return { accessToken, accountID };
  }
  return null;
}

function windowsFromLimit(limit, idPrefix, scope) {
  return ['primary_window', 'secondary_window'].map((slot) => {
    const node = limit[slot];
    if (!node) return null;
    const percent = num(node.used_percent);
    if (percent === null) return null;
    const seconds = num(node.limit_window_seconds);
    const resetsAt = num(node.reset_at);
    return {
      id: `${idPrefix}.${slot}`,
      kind: kindForSeconds(seconds || 0),
      scope: scope || null,
      usedFraction: clamp01(percent / 100),
      windowSeconds: seconds || 0,
      resetsAt: resetsAt || null,
      isExhausted: false,
    };
  }).filter(Boolean);
}

function isGroupSpent(limit) {
  if (limit.limit_reached === true) return true;
  if (limit.allowed === false) return true;
  return false;
}

function markSpent(windows, spent) {
  if (!spent) return windows;
  const fullest = windows.reduce((a, b) => (a.usedFraction >= b.usedFraction ? a : b), windows[0]);
  return windows.map((w) => (w.id === fullest.id ? { ...w, isExhausted: true } : w));
}

async function parse(root) {
  const windows = [];
  const spendReached = (root.spend_control || {}).reached === true;

  const accountLimit = root.rate_limit;
  if (accountLimit) {
    windows.push(...markSpent(
      windowsFromLimit(accountLimit, 'codex', null),
      isGroupSpent(accountLimit)
        || (root.rate_limit_reached_type !== undefined && root.rate_limit_reached_type !== null)
        || spendReached,
    ));
  }

  for (const extra of root.additional_rate_limits || []) {
    const limit = extra.rate_limit;
    if (!limit) continue;
    const label = extra.limit_name || null;
    const key = extra.metered_feature || label || 'extra';
    windows.push(...markSpent(windowsFromLimit(limit, key, label), isGroupSpent(limit)));
  }

  const credits = root.credits || {};
  const creditBalance = credits.unlimited === true ? null : (credits.balance !== undefined ? String(credits.balance) : null);

  return {
    id: 'codex',
    state: windows.length ? 'live' : 'unavailable',
    reason: windows.length ? null : 'noLimitsReported',
    plan: planName(root.plan_type),
    creditBalance,
    windows,
    session: await currentSession(),
    observedAt: Date.now() / 1000,
  };
}

async function fetchUsage() {
  const creds = loadCredentials();
  if (!creds) return unavailable('codex', 'signInRequired');

  const headers = {
    Authorization: `Bearer ${creds.accessToken}`,
    Accept: 'application/json',
  };
  if (creds.accountID) headers['ChatGPT-Account-Id'] = creds.accountID;

  let res;
  try {
    res = await fetch(ENDPOINT, { headers, signal: AbortSignal.timeout(20000) });
  } catch {
    return unavailable('codex', 'unreachable');
  }

  if (res.status === 401 || res.status === 403) return unavailable('codex', 'signInRequired');
  if (res.status === 429) return unavailable('codex', 'rateLimited');
  if (res.status !== 200) return unavailable('codex', 'serverError');

  let root;
  try {
    root = await res.json();
  } catch {
    return unavailable('codex', 'unreadableReply');
  }
  return parse(root);
}

module.exports = { fetchUsage, planName, loadCredentials, parse, currentSession };
