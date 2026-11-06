'use strict';

// OpenCode Go adapter — mirrors Pulse's `OpenCodeGoUsageService`.
//
// The key can come from Settings (a pasted key) or from what OpenCode saved for
// itself in `~/.local/share/opencode/auth.json` under `opencode-go`.
//
//   GET https://opencode.ai/zen/go/v1/usage
// with `Authorization: Bearer <key>`. The reply carries rolling/weekly/monthly
// usage windows and nothing else.

const path = require('path');
const { home, readJSON, num, isoToEpoch, unavailable, clamp01 } = require('./common');

const ENDPOINT = 'https://opencode.ai/zen/go/v1/usage';

function storedKey() {
  const root = readJSON(path.join(home(), '.local', 'share', 'opencode', 'auth.json'));
  if (!root) return null;
  const entry = root['opencode-go'];
  if (entry && entry.key && entry.key.length) return entry.key;
  return null;
}

const KIND_MAP = [
  ['rolling', '5h', 5 * 3600],
  ['weekly', 'weekly', 7 * 86400],
  ['monthly', 'monthly', 30 * 86400],
];

function windowFrom(reported, id, kind, seconds) {
  if (!reported) return null;
  const percent = num(reported.percent);
  if (percent === null) return null;
  return {
    id,
    kind,
    scope: null,
    usedFraction: clamp01(percent / 100),
    windowSeconds: seconds,
    resetsAt: isoToEpoch(reported.resetsAt),
    isExhausted: String(reported.status || 'ok').toLowerCase() !== 'ok',
  };
}

function parse(root) {
  const usage = root.usage || {};
  const windows = KIND_MAP
    .map(([id, kind, seconds]) => windowFrom(usage[id], id, kind, seconds))
    .filter(Boolean);

  return {
    id: 'openCodeGo',
    state: windows.length ? 'live' : 'unavailable',
    reason: windows.length ? null : 'noLimitsReported',
    plan: null,
    creditBalance: null,
    windows,
    observedAt: Date.now() / 1000,
  };
}

async function fetchUsage(enteredKey) {
  const key = (enteredKey && enteredKey.length) ? enteredKey : storedKey();
  if (!key) return unavailable('openCodeGo', 'apiKeyMissing');

  let res;
  try {
    res = await fetch(ENDPOINT, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return unavailable('openCodeGo', 'unreachable');
  }

  if (res.status === 401 || res.status === 403) return unavailable('openCodeGo', 'apiKeyRefused');
  if (res.status === 429) return unavailable('openCodeGo', 'rateLimited');
  if (res.status !== 200) return unavailable('openCodeGo', 'serverError');

  let root;
  try {
    root = await res.json();
  } catch {
    return unavailable('openCodeGo', 'unreadableReply');
  }
  return parse(root);
}

module.exports = { fetchUsage, storedKey, parse };
