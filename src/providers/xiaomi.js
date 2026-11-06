'use strict';

// Xiaomi MiMo Coding Plan — mirrors Pulse's `XiaomiMiMoUsageService`.
//
// A browser session, not a key: the platform's API keys buy inference and answer
// none of the console's account routes. The credential is the
// `api-platform_serviceToken` cookie the web console uses, pasted into Settings
// (as a full `Cookie:` header or just the two required cookies).
//
// The ring is the monthly Coding Plan (used / limit). The prepaid balance rides
// along on the card. An account with no plan is reported, not drawn as 0%.

const { num, unavailable, clamp01 } = require('./common');

const HOST = 'platform.xiaomimimo.com';
const BASE = `https://${HOST}/api/v1`;
const CONSOLE = `https://${HOST}/#/console/balance`;

const REQUIRED = ['api-platform_serviceToken', 'userId'];
const OPTIONAL = ['api-platform_ph', 'api-platform_slh'];

function normalizeCookie(input) {
  if (!input) return null;
  let header = String(input).trim();
  if (header.toLowerCase().startsWith('cookie:')) header = header.slice(7).trim();
  if (!header) return null;

  const wanted = new Set([...REQUIRED, ...OPTIONAL]);
  const kept = [];
  const seen = new Set();
  for (const pair of header.split(';')) {
    const idx = pair.indexOf('=');
    if (idx <= 0) continue;
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (!wanted.has(name) || seen.has(name)) continue;
    if (!value || /[\s"\\]/.test(value)) continue;
    seen.add(name);
    kept.push(`${name}=${value}`);
  }
  if (!REQUIRED.every((r) => seen.has(r))) return null;
  return kept.join('; ');
}

async function getPath(pathname, cookie) {
  const res = await fetch(`${BASE}/${pathname}`, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      Cookie: cookie,
      Origin: `https://${HOST}`,
      Referer: CONSOLE,
    },
    signal: AbortSignal.timeout(15000),
  });
  if (res.status >= 300 && res.status < 400) return { code: 401 };
  if (res.status === 401 || res.status === 403) return { code: 401 };
  if (res.status === 429) return { code: 429 };
  if (res.status >= 500) return { code: 500 };
  if (res.status !== 200) return { code: 500 };
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function parsePlan(detailData, usageData) {
  // Envelope code 0 means success; a non-zero code (401/403/500) is a failure.
  const usage = usageData && usageData.code === 0 ? usageData : null;
  const item = usage && usage.data && usage.data.monthUsage
    ? (usage.data.monthUsage.items || [])[0]
    : null;
  if (!item || !(item.limit > 0)) return null;

  const detail = detailData && detailData.code === 0 ? detailData : null;
  const body = detail && detail.data;
  if (body && body.expired === true) return null;

  return {
    used: item.used,
    limit: item.limit,
    periodEnd: body ? body.currentPeriodEnd || null : null,
    code: body ? body.planCode || null : null,
  };
}

function parseBalance(balanceData) {
  if (!balanceData || balanceData.code !== 0 || !balanceData.data) return null;
  const body = balanceData.data;
  const amount = Number(body.balance);
  const currency = String(body.currency || '').trim();
  if (!Number.isFinite(amount) || !currency) return null;
  return { amount, currency };
}

function dateFrom(text) {
  if (!text) return null;
  // The console's own format: "yyyy-MM-dd HH:mm:ss" in UTC.
  const m = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const epoch = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) / 1000;
  return Number.isFinite(epoch) ? epoch : null;
}

async function fetchUsage(enteredCookie) {
  const cookie = normalizeCookie(enteredCookie);
  if (!cookie) return unavailable('xiaomiMiMo', 'cookieMissing');

  let detailData, usageData, balanceData;
  try {
    [detailData, usageData, balanceData] = await Promise.all([
      getPath('tokenPlan/detail', cookie),
      getPath('tokenPlan/usage', cookie),
      getPath('balance', cookie),
    ]);
  } catch {
    return unavailable('xiaomiMiMo', 'unreachable');
  }

  // An expired session shows up as code 401/403 on all three routes.
  if ([detailData, usageData, balanceData].some((d) => d && (d.code === 401 || d.code === 403))) {
    return unavailable('xiaomiMiMo', 'sessionExpired');
  }
  if (detailData === null || usageData === null || balanceData === null) {
    return unavailable('xiaomiMiMo', 'unreadableReply');
  }

  const plan = parsePlan(detailData, usageData);
  if (!plan) {
    return unavailable('xiaomiMiMo', 'noCodingPlan');
  }

  const money = parseBalance(balanceData);
  const usedFraction = plan.limit > 0 ? clamp01(plan.used / plan.limit) : 0;

  return {
    id: 'xiaomiMiMo',
    state: 'live',
    reason: null,
    plan: plan.code,
    creditBalance: money ? `${money.amount.toFixed(2)} ${money.currency}` : null,
    balance: money,
    windows: [{
      id: 'xiaomi.plan',
      kind: 'monthly',
      scope: null,
      usedFraction,
      windowSeconds: 30 * 86400,
      resetsAt: dateFrom(plan.periodEnd),
      isExhausted: plan.used >= plan.limit,
    }],
    observedAt: Date.now() / 1000,
  };
}

module.exports = { fetchUsage, normalizeCookie, parsePlan, parseBalance };
