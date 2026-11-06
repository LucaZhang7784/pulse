'use strict';

// Vercel AI Gateway credits.
//
//   GET https://ai-gateway.vercel.sh/v1/credits   (Authorization: Bearer <key>)
//   { "balance": "95.50", "total_used": "4.50" }
//
// Both values are USD decimal strings. The gateway reports the remaining
// balance and lifetime spend but no purchased total, so the ring is drawn from
// spent / (spent + remaining) and the card carries the remaining balance.

const { num, unavailable, clamp01 } = require('./common');

const ENDPOINT = 'https://ai-gateway.vercel.sh/v1/credits';

function parse(root) {
  const balance = num(root.balance);
  const used = num(root.total_used);
  if (balance === null) return unavailable('vercelAiGateway', 'unreadableReply');

  const spent = used === null ? 0 : used;
  const lifetime = balance + spent;
  const windows = [];

  if (lifetime > 0) {
    windows.push({
      id: 'vercel.credits',
      kind: 'credits',
      scope: null,
      usedFraction: clamp01(spent / lifetime),
      windowSeconds: 0,
      resetsAt: null,
      isExhausted: balance <= 0,
    });
  }

  return {
    id: 'vercelAiGateway',
    state: 'live',
    reason: null,
    plan: null,
    creditBalance: `$${balance.toFixed(2)}`,
    balance: { amount: balance, currency: 'USD' },
    windows,
    observedAt: Date.now() / 1000,
  };
}

async function fetchUsage(enteredKey) {
  if (!enteredKey) return unavailable('vercelAiGateway', 'apiKeyMissing');

  let res;
  try {
    res = await fetch(ENDPOINT, {
      headers: { Authorization: `Bearer ${enteredKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return unavailable('vercelAiGateway', 'unreachable');
  }

  if (res.status === 401 || res.status === 403) return unavailable('vercelAiGateway', 'apiKeyRefused');
  if (res.status === 429) return unavailable('vercelAiGateway', 'rateLimited');
  if (res.status !== 200) return unavailable('vercelAiGateway', 'serverError');

  let root;
  try {
    root = await res.json();
  } catch {
    return unavailable('vercelAiGateway', 'unreadableReply');
  }
  return parse(root);
}

module.exports = { fetchUsage, parse };
