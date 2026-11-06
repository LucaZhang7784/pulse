'use strict';

// OpenRouter prepaid credits — mirrors CC Switch's `query_openrouter`.
//
//   GET https://openrouter.ai/api/v1/credits   (Authorization: Bearer <key>)
//   { "data": { "total_credits": 100.0, "total_usage": 40.0 } }
//
// Both lifetime totals are reported, so the ring shows used / total and the
// remaining balance rides along on the card.

const { num, unavailable, clamp01 } = require('./common');

const ENDPOINT = 'https://openrouter.ai/api/v1/credits';

async function fetchUsage(enteredKey) {
  if (!enteredKey) return unavailable('openRouter', 'apiKeyMissing');

  let res;
  try {
    res = await fetch(ENDPOINT, {
      headers: { Authorization: `Bearer ${enteredKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return unavailable('openRouter', 'unreachable');
  }

  if (res.status === 401 || res.status === 403) return unavailable('openRouter', 'apiKeyRefused');
  if (res.status === 429) return unavailable('openRouter', 'rateLimited');
  if (res.status !== 200) return unavailable('openRouter', 'serverError');

  let root;
  try {
    root = await res.json();
  } catch {
    return unavailable('openRouter', 'unreadableReply');
  }

  const data = root.data || {};
  const total = num(data.total_credits);
  const used = num(data.total_usage);
  if (total === null || used === null) return unavailable('openRouter', 'unreadableReply');

  const remaining = Math.max(total - used, 0);

  return {
    id: 'openRouter',
    state: 'live',
    reason: null,
    plan: null,
    creditBalance: `$${remaining.toFixed(2)}`,
    balance: { amount: remaining, currency: 'USD' },
    windows: [{
      id: 'openrouter.credits',
      kind: 'credits',
      scope: null,
      usedFraction: clamp01(total > 0 ? used / total : 0),
      windowSeconds: 0,
      resetsAt: null,
      isExhausted: remaining <= 0,
    }],
    observedAt: Date.now() / 1000,
  };
}

module.exports = { fetchUsage };
