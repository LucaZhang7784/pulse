'use strict';

// Zhipu GLM Coding Plan quota.
//
//   GET https://open.bigmodel.cn/api/monitor/usage/quota/limit   (CN)
//   GET https://api.z.ai/api/monitor/usage/quota/limit          (global)
//   Authorization: <api key>
//
// The monitor endpoint takes the key raw (no `Bearer` prefix) and answers with
// `data.limits[]`. The Coding Plan entries are `TOKENS_LIMIT`, distinguished by
// `unit`: 3 is the rolling five-hour window, 6 the weekly window. Every entry
// reports the used `percentage` plus `nextResetTime` in epoch milliseconds.
// `TIME_LIMIT` describes monthly MCP tool calls and is not part of the coding
// allowance, so it is ignored here.

const { num, unavailable, clamp01 } = require('./common');

const ENDPOINTS = [
  'https://open.bigmodel.cn/api/monitor/usage/quota/limit',
  'https://api.z.ai/api/monitor/usage/quota/limit',
];

const FIVE_HOURS = 5 * 3600;
const WEEK = 7 * 86400;

function capitalise(text) {
  if (!text) return null;
  const bare = String(text).trim();
  if (!bare) return null;
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}

function percentageOf(limit) {
  const percentage = num(limit.percentage);
  if (percentage !== null) return clamp01(percentage / 100);

  const total = num(limit.usage);
  const used = num(limit.currentValue);
  if (total !== null && total > 0 && used !== null) return clamp01(used / total);

  const remaining = num(limit.remaining);
  if (total !== null && total > 0 && remaining !== null) return clamp01((total - remaining) / total);

  return null;
}

function parse(root) {
  const ok = root.code === undefined || num(root.code) === 200;
  if (!ok || root.success === false) {
    const message = String(root.msg || root.message || '');
    if (/coding\s*plan|plan|套餐|订阅|不存在/i.test(message)) return unavailable('zhipu', 'noCodingPlan');
    if (num(root.code) === 401 || num(root.code) === 403) return unavailable('zhipu', 'apiKeyRefused');
    return unavailable('zhipu', 'serverError');
  }

  const data = root.data || {};
  const limits = Array.isArray(data.limits) ? data.limits : [];
  const windows = [];

  for (const limit of limits) {
    if (!limit || limit.type !== 'TOKENS_LIMIT') continue;
    const unit = num(limit.unit);
    const kind = unit === 3 ? '5h' : unit === 6 ? 'weekly' : null;
    if (!kind) continue;

    const fraction = percentageOf(limit);
    if (fraction === null) continue;

    const reset = num(limit.nextResetTime);
    windows.push({
      id: `zhipu.${kind}`,
      kind,
      scope: null,
      usedFraction: fraction,
      windowSeconds: kind === '5h' ? FIVE_HOURS : WEEK,
      resetsAt: reset && reset > 0 ? reset / 1000 : null,
      isExhausted: fraction >= 1,
    });
  }

  windows.sort((a, b) => a.windowSeconds - b.windowSeconds);

  return {
    id: 'zhipu',
    state: windows.length ? 'live' : 'unavailable',
    reason: windows.length ? null : 'noCodingPlan',
    plan: capitalise(data.level),
    creditBalance: null,
    windows,
    observedAt: Date.now() / 1000,
  };
}

async function probe(endpoint, key) {
  try {
    const res = await fetch(endpoint, {
      headers: {
        Authorization: key,
        Accept: 'application/json',
        'Accept-Language': 'en-US,en',
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (res.status === 401 || res.status === 403) return { retry: 'refused' };
    if (res.status === 429) return { result: unavailable('zhipu', 'rateLimited') };
    if (res.status !== 200) return { result: unavailable('zhipu', 'serverError') };

    let root;
    try {
      root = await res.json();
    } catch {
      return { result: unavailable('zhipu', 'unreadableReply') };
    }
    return { result: parse(root) };
  } catch {
    return { retry: 'unreachable' };
  }
}

async function fetchUsage(enteredKey) {
  if (!enteredKey) return unavailable('zhipu', 'apiKeyMissing');

  let unreachable = false;
  for (const endpoint of ENDPOINTS) {
    const { result, retry } = await probe(endpoint, enteredKey);
    if (result) return result;
    if (retry === 'unreachable') unreachable = true;
  }
  return unavailable('zhipu', unreachable ? 'unreachable' : 'apiKeyRefused');
}

module.exports = { fetchUsage, parse };
