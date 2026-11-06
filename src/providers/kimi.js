'use strict';

// Kimi For Coding — mirrors Pulse's `KimiCodeUsageService` and CC Switch's
// `query_kimi`.
//
//   GET https://api.kimi.com/coding/v1/usages   (Authorization: Bearer <key>)
//   {
//     "usage":  { "limit": "100", "used": "59", "remaining": "41", "resetTime": ... },
//     "limits": [ { "window": { "duration": 300, "timeUnit": "TIME_UNIT_MINUTE" },
//                   "detail": { "limit": "100", "remaining": "100", "resetTime": ... } } ],
//     "user":   { "membership": { "level": "LEVEL_INTERMEDIATE" } }
//   }
//
// `limits[]` are the timed windows (5-hour), `usage` is the weekly allowance.
// All counts arrive as strings, and `detail` reports what is left.

const { num, isoToEpoch, unavailable, clamp01 } = require('./common');

const ENDPOINT = 'https://api.kimi.com/coding/v1/usages';

function toNumber(text) {
  if (text === undefined || text === null) return null;
  const n = Number(String(text));
  return Number.isFinite(n) ? n : null;
}

function durationSeconds(window) {
  if (!window) return null;
  const duration = toNumber(window.duration);
  if (!duration || duration <= 0) return null;
  switch (window.timeUnit) {
    case 'TIME_UNIT_SECOND': return duration;
    case 'TIME_UNIT_MINUTE': return duration * 60;
    case 'TIME_UNIT_HOUR': return duration * 3600;
    case 'TIME_UNIT_DAY': return duration * 86400;
    default: return null;
  }
}

function kindForSeconds(seconds) {
  if (seconds === 5 * 3600) return '5h';
  if (seconds === 7 * 86400) return 'weekly';
  if (seconds === 30 * 86400) return 'monthly';
  return `${Math.round(seconds / 3600)}h`;
}

function windowFrom(detail, id, kind, seconds) {
  const limit = toNumber(detail && detail.limit);
  if (limit === null || limit <= 0) return null;
  let used = toNumber(detail.used);
  if (used === null) {
    const remaining = toNumber(detail.remaining);
    if (remaining === null) return null;
    used = limit - remaining;
  }
  return {
    id,
    kind,
    scope: null,
    usedFraction: clamp01(used / limit),
    windowSeconds: seconds,
    resetsAt: isoToEpoch(detail.resetTime),
    isExhausted: used >= limit,
  };
}

function planName(level) {
  if (!level) return null;
  const bare = level.startsWith('LEVEL_') ? level.slice('LEVEL_'.length) : level;
  return bare.split('_').map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join(' ');
}

function parse(root) {
  const windows = [];

  for (let i = 0; i < (root.limits || []).length; i++) {
    const limit = root.limits[i];
    const seconds = durationSeconds(limit.window);
    if (seconds === null) continue;
    const w = windowFrom(limit.detail, `limit.${i}.${seconds}`, kindForSeconds(seconds), seconds);
    if (w) windows.push(w);
  }

  // The weekly allowance (the `usage` object) — no length stated, only a reset.
  const weekly = windowFrom(root.usage, 'weekly', 'weekly', 7 * 86400);
  if (weekly) windows.push(weekly);

  windows.sort((a, b) => a.windowSeconds - b.windowSeconds);

  const plan = planName(root.user && root.user.membership && root.user.membership.level);

  return {
    id: 'kimi',
    state: windows.length ? 'live' : 'unavailable',
    reason: windows.length ? null : 'noLimitsReported',
    plan,
    creditBalance: null,
    windows,
    observedAt: Date.now() / 1000,
  };
}

async function fetchUsage(enteredKey) {
  if (!enteredKey) return unavailable('kimi', 'apiKeyMissing');

  let res;
  try {
    res = await fetch(ENDPOINT, {
      headers: { Authorization: `Bearer ${enteredKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return unavailable('kimi', 'unreachable');
  }

  if (res.status === 401 || res.status === 403) return unavailable('kimi', 'apiKeyRefused');
  if (res.status === 429) return unavailable('kimi', 'rateLimited');
  if (res.status !== 200) return unavailable('kimi', 'serverError');

  let root;
  try {
    root = await res.json();
  } catch {
    return unavailable('kimi', 'unreadableReply');
  }
  return parse(root);
}

module.exports = { fetchUsage, parse };
