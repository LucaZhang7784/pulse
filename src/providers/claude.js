'use strict';

// Claude Code adapter — mirrors Pulse's `ClaudeCodeUsageService`.
//
// The main route reads the OAuth token Claude Code stored in
// `~/.claude/.credentials.json` under `claudeAiOauth` and asks the same
// endpoint the CLI uses:
//   GET https://api.anthropic.com/api/oauth/usage
// It answers with every limit at once (5-hour session, weekly, per-model).
//
// When the account is routed through a custom `ANTHROPIC_BASE_URL` (a local
// proxy / relay), the standard quota endpoint no longer reports the real
// numbers, so this reports `customProxy` instead of inventing figures.

const path = require('path');
const { home, readJSON, num, isoToEpoch, kindForSeconds, unavailable, clamp01 } = require('./common');

const USAGE_ENDPOINT = 'https://api.anthropic.com/api/oauth/usage';
const HEADERS = {
  'anthropic-beta': 'oauth-2025-04-20',
  'User-Agent': 'claude-cli (external, cli)',
  Accept: 'application/json',
};

// Whether the account is routed through a non-Anthropic base URL (a proxy).
function detectCustomProxy() {
  const settings = readJSON(path.join(home(), '.claude', 'settings.json'));
  if (!settings) return false;
  const env = settings.env || {};
  const base = env.ANTHROPIC_BASE_URL;
  if (base && !/^https?:\/\/api\.anthropic\.com/i.test(base)) return true;
  if (env.ANTHROPIC_AUTH_TOKEN && env.ANTHROPIC_AUTH_TOKEN !== '') return false;
  return false;
}

function loadAccessToken() {
  const root = readJSON(path.join(home(), '.claude', '.credentials.json'));
  if (!root) return null;
  const oauth = root.claudeAiOauth;
  if (!oauth || !oauth.accessToken) return null;
  // Expiry is in milliseconds. An expired token counts as absent.
  if (num(oauth.expiresAt) !== null && num(oauth.expiresAt) / 1000 <= Date.now() / 1000) {
    return null;
  }
  return oauth.accessToken;
}

function isSpent(limit) {
  if (limit.locked_reason !== undefined && limit.locked_reason !== null) return true;
  const severity = String(limit.severity || '').toLowerCase();
  if (!severity) return false;
  return !['normal', 'ok', 'none', 'healthy', 'warning', 'warn'].includes(severity);
}

function windowFromLimit(limit) {
  const kindName = limit.kind;
  const percent = num(limit.percent);
  if (!kindName || percent === null) return null;

  let kind; let seconds;
  if (kindName === 'session') { kind = '5h'; seconds = 5 * 3600; }
  else if (kindName === 'weekly_all' || kindName === 'weekly_scoped') { kind = 'weekly'; seconds = 7 * 86400; }
  else return null;

  const scope = ((limit.scope || {}).model || {}).display_name || null;
  return {
    id: `claudeCode.${kindName}.${scope || 'all'}`,
    kind,
    scope,
    usedFraction: clamp01(percent / 100),
    windowSeconds: seconds,
    resetsAt: isoToEpoch(limit.resets_at),
    isExhausted: isSpent(limit),
  };
}

function parse(root) {
  let windows = (root.limits || []).map(windowFromLimit).filter(Boolean);

  if (!windows.length) {
    windows = [
      ['five_hour', '5h', 5 * 3600],
      ['seven_day', 'weekly', 7 * 86400],
    ].map(([key, kind, seconds]) => {
      const node = root[key];
      if (!node) return null;
      const percent = num(node.utilization);
      if (percent === null) return null;
      return {
        id: `claudeCode.${key}`,
        kind,
        scope: null,
        usedFraction: clamp01(percent / 100),
        windowSeconds: seconds,
        resetsAt: isoToEpoch(node.resets_at),
        isExhausted: false,
      };
    }).filter(Boolean);
  }

  return {
    id: 'claudeCode',
    state: windows.length ? 'live' : 'unavailable',
    reason: windows.length ? null : 'noLimitsReported',
    plan: null,
    creditBalance: null,
    windows,
    observedAt: Date.now() / 1000,
  };
}

async function fetchUsage() {
  if (detectCustomProxy()) {
    return unavailable('claudeCode', 'customProxy');
  }
  const token = loadAccessToken();
  if (!token) return unavailable('claudeCode', 'signInRequired');

  let res;
  try {
    res = await fetch(USAGE_ENDPOINT, {
      headers: { ...HEADERS, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    return unavailable('claudeCode', 'unreachable');
  }

  if (res.status === 401 || res.status === 403) return unavailable('claudeCode', 'loginExpired');
  if (res.status === 429) return unavailable('claudeCode', 'rateLimited');
  if (res.status !== 200) return unavailable('claudeCode', 'serverError');

  let root;
  try {
    root = await res.json();
  } catch {
    return unavailable('claudeCode', 'unreadableReply');
  }
  return parse(root);
}

module.exports = { fetchUsage, loadAccessToken, detectCustomProxy, parse };
