'use strict';

// OfoxAI prepaid balance.
//
//   GET https://api.ofox.io/v1/user/balance   (Authorization: Bearer <key>)
//   { "is_active": true, "balance": 42.1357, "total": 100.0,
//     "used": 57.8643, "currency": "USD" }
//
// `balance` is available credit, `total` lifetime credits and `used` lifetime
// spend. Balances are tracked to the nano-dollar, so the raw numbers are kept
// and the card renders them to cents. A negative balance means the account is
// overdrawn; it is reported as-is rather than clamped to zero.

const { num, unavailable, clamp01 } = require('./common');

const ENDPOINT = 'https://api.ofox.io/v1/user/balance';

function parse(root) {
  if (root.is_active === false) return unavailable('ofox', 'apiKeyRefused');

  const balance = num(root.balance);
  const total = num(root.total);
  const used = num(root.used);
  if (balance === null) return unavailable('ofox', 'unreadableReply');

  const currency = root.currency || 'USD';
  const lifetime = total !== null ? total : used !== null ? used + balance : null;
  const windows = [];

  if (lifetime !== null && lifetime > 0 && used !== null) {
    windows.push({
      id: 'ofox.credits',
      kind: 'credits',
      scope: null,
      usedFraction: clamp01(used / lifetime),
      windowSeconds: 0,
      resetsAt: null,
      isExhausted: balance <= 0,
    });
  }

  return {
    id: 'ofox',
    state: 'live',
    reason: null,
    plan: null,
    creditBalance: `${balance < 0 ? '-' : ''}$${Math.abs(balance).toFixed(2)}`,
    balance: { amount: balance, currency },
    windows,
    observedAt: Date.now() / 1000,
  };
}

async function fetchUsage(enteredKey) {
  if (!enteredKey) return unavailable('ofox', 'apiKeyMissing');

  let res;
  try {
    res = await fetch(ENDPOINT, {
      headers: { Authorization: `Bearer ${enteredKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return unavailable('ofox', 'unreachable');
  }

  if (res.status === 401 || res.status === 403) return unavailable('ofox', 'apiKeyRefused');
  if (res.status === 429) return unavailable('ofox', 'rateLimited');
  if (res.status !== 200) return unavailable('ofox', 'serverError');

  let root;
  try {
    root = await res.json();
  } catch {
    return unavailable('ofox', 'unreadableReply');
  }
  return parse(root);
}

module.exports = { fetchUsage, parse };
