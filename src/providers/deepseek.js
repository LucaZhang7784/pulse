'use strict';

// DeepSeek prepaid balance — mirrors Pulse's `DeepSeekUsageService` and CC
// Switch's `query_deepseek`.
//
//   GET https://api.deepseek.com/user/balance   (Authorization: Bearer <key>)
//   { "is_available": true,
//     "balance_infos": [ { "currency": "CNY", "total_balance": "338.08", ... } ] }
//
// DeepSeek reports money and nothing else — no allowance, no window, no reset.
// So the rail shows the balance rather than a percentage (balance-only mode).

const path = require('path');
const { home, readJSON, num, unavailable } = require('./common');

const ENDPOINT = 'https://api.deepseek.com/user/balance';

function money(text) {
  if (text === undefined || text === null) return null;
  const n = Number(String(text).trim());
  return Number.isFinite(n) ? n : null;
}

function parse(root) {
  const infos = root.balance_infos || [];
  const purses = infos.map((i) => ({
    currency: i.currency || '',
    total: money(i.total_balance),
    granted: money(i.granted_balance),
    toppedUp: money(i.topped_up_balance),
  })).filter((p) => p.currency && p.total !== null);

  if (!purses.length) {
    return unavailable('deepSeek', 'noLimitsReported');
  }

  const primary = purses.find((p) => p.total > 0) || purses[0];
  const isAvailable = root.is_available !== false;

  return {
    id: 'deepSeek',
    state: 'live',
    reason: null,
    plan: null,
    creditBalance: `${primary.total.toFixed(2)} ${primary.currency}`,
    balance: { amount: primary.total, currency: primary.currency },
    balanceInfos: purses,
    isExhausted: !isAvailable,
    windows: [],
    observedAt: Date.now() / 1000,
  };
}

async function fetchUsage(enteredKey) {
  if (!enteredKey) return unavailable('deepSeek', 'apiKeyMissing');

  let res;
  try {
    res = await fetch(ENDPOINT, {
      headers: { Authorization: `Bearer ${enteredKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return unavailable('deepSeek', 'unreachable');
  }

  if (res.status === 401 || res.status === 403) return unavailable('deepSeek', 'apiKeyRefused');
  if (res.status === 429) return unavailable('deepSeek', 'rateLimited');
  if (res.status !== 200) return unavailable('deepSeek', 'serverError');

  let root;
  try {
    root = await res.json();
  } catch {
    return unavailable('deepSeek', 'unreadableReply');
  }
  return parse(root);
}

module.exports = { fetchUsage, parse };
