'use strict';

// MiniMax Token Plan quota.
//
//   GET https://api.minimaxi.com/v1/token_plan/remains   (CN)
//   GET https://www.minimax.io/v1/token_plan/remains     (global)
//   Authorization: Bearer <key>
//
// `model_remains[]` holds one bucket per quota class (`general` for text and
// coding, `video` separately). Each bucket reports a rolling interval window
// and a weekly window. Live payloads carry explicit remaining percentages, so
// those are authoritative; the raw counts are only used when a percentage is
// missing. The interval counts have been reported inconsistently by different
// clients, which is exactly why the percentage field wins.

const { num, unavailable, clamp01 } = require('./common');

const ENDPOINTS = [
  'https://api.minimaxi.com/v1/token_plan/remains',
  'https://www.minimax.io/v1/token_plan/remains',
];

const FIVE_HOURS = 5 * 3600;
const WEEK = 7 * 86400;

function secondsBetween(startMs, endMs) {
  const start = num(startMs);
  const end = num(endMs);
  if (start === null || end === null || end <= start) return null;
  return (end - start) / 1000;
}

// `remainingPercent` is what is left; the rail draws what is used.
function usedFraction(remainingPercent, total, usedCount, remainingCount) {
  const percent = num(remainingPercent);
  if (percent !== null && percent >= 0) return clamp01((100 - Math.min(percent, 100)) / 100);

  const totalCount = num(total);
  if (totalCount === null || totalCount <= 0) return null;

  const remaining = num(remainingCount);
  if (remaining !== null) return clamp01((totalCount - remaining) / totalCount);

  const used = num(usedCount);
  if (used === null) return null;
  return clamp01(used / totalCount);
}

function resetEpoch(ms) {
  const value = num(ms);
  return value && value > 0 ? value / 1000 : null;
}

function windowFrom(bucket, id, kind, seconds) {
  const fraction = usedFraction(
    bucket[id === 'minimax.interval' ? 'current_interval_remaining_percent' : 'current_weekly_remaining_percent'],
    bucket[id === 'minimax.interval' ? 'current_interval_total_count' : 'current_weekly_total_count'],
    bucket[id === 'minimax.interval' ? 'current_interval_usage_count' : 'current_weekly_usage_count'],
    bucket[id === 'minimax.interval' ? 'current_interval_remaining_count' : 'current_weekly_remaining_count'],
  );
  if (fraction === null) return null;

  return {
    id,
    kind,
    scope: null,
    usedFraction: fraction,
    windowSeconds: seconds,
    resetsAt: resetEpoch(bucket[id === 'minimax.interval' ? 'end_time' : 'weekly_end_time']),
    isExhausted: fraction >= 1,
  };
}

function kindFor(seconds, fallback) {
  if (seconds === FIVE_HOURS) return '5h';
  if (seconds === WEEK) return 'weekly';
  if (seconds > 0) return `${Math.round(seconds / 3600)}h`;
  return fallback;
}

function planName(bucket) {
  const raw = bucket.current_subscribe_title || bucket.plan_name || bucket.plan;
  if (!raw) return null;
  return String(raw).trim() || null;
}

function parse(root) {
  const response = root.base_resp || {};
  const status = num(response.status_code);
  if (status !== null && status !== 0) {
    const message = String(response.status_msg || '');
    return unavailable('minimax', /auth|key|token/i.test(message) ? 'apiKeyRefused' : 'serverError');
  }

  const buckets = Array.isArray(root.model_remains) ? root.model_remains : [];
  const bucket = buckets.find((b) => b && b.model_name === 'general') || buckets[0] || null;
  if (!bucket) return unavailable('minimax', 'noTokenPlan');

  const intervalSeconds = secondsBetween(bucket.start_time, bucket.end_time);
  const weeklySeconds = secondsBetween(bucket.weekly_start_time, bucket.weekly_end_time);

  const windows = [];
  const interval = windowFrom(bucket, 'minimax.interval', kindFor(intervalSeconds, '5h'), intervalSeconds || FIVE_HOURS);
  if (interval) windows.push(interval);
  const weekly = windowFrom(bucket, 'minimax.weekly', 'weekly', weeklySeconds || WEEK);
  if (weekly) windows.push(weekly);

  windows.sort((a, b) => a.windowSeconds - b.windowSeconds);

  return {
    id: 'minimax',
    state: windows.length ? 'live' : 'unavailable',
    reason: windows.length ? null : 'noTokenPlan',
    plan: planName(bucket),
    creditBalance: null,
    windows,
    observedAt: Date.now() / 1000,
  };
}

async function probe(endpoint, key) {
  try {
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (res.status === 401 || res.status === 403) return { retry: 'refused' };
    if (res.status === 429) return { result: unavailable('minimax', 'rateLimited') };
    if (res.status !== 200) return { result: unavailable('minimax', 'serverError') };

    let root;
    try {
      root = await res.json();
    } catch {
      return { result: unavailable('minimax', 'unreadableReply') };
    }
    return { result: parse(root) };
  } catch {
    return { retry: 'unreachable' };
  }
}

async function fetchUsage(enteredKey) {
  if (!enteredKey) return unavailable('minimax', 'apiKeyMissing');

  let unreachable = false;
  for (const endpoint of ENDPOINTS) {
    const { result, retry } = await probe(endpoint, enteredKey);
    if (result) return result;
    if (retry === 'unreachable') unreachable = true;
  }
  return unavailable('minimax', unreachable ? 'unreachable' : 'apiKeyRefused');
}

module.exports = { fetchUsage, parse };
