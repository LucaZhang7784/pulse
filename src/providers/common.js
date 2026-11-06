'use strict';

// Shared helpers for provider adapters. Pure Node — no Electron dependency —
// so adapters can be exercised directly with `node`.

const os = require('os');
const path = require('path');
const fs = require('fs');

function home() {
  return process.env.USERPROFILE || process.env.HOME || os.homedir();
}

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

// Coerce a JSON value (number-as-string, number, etc.) into a number.
function num(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// Parse an ISO-8601 string (with optional fractional seconds) to epoch seconds.
function isoToEpoch(text) {
  if (!text) return null;
  const ms = Date.parse(text);
  return Number.isFinite(ms) ? ms / 1000 : null;
}

// Classify a window duration (seconds) into a human-readable kind.
function kindForSeconds(seconds) {
  if (seconds === 5 * 3600) return '5h';
  if (seconds === 7 * 86400) return 'weekly';
  if (seconds === 30 * 86400) return 'monthly';
  if (seconds > 0) return `${Math.round(seconds / 3600)}h`;
  return 'window';
}

// Build the canonical "unavailable" result.
function unavailable(id, reason) {
  return {
    id,
    state: 'unavailable',
    reason,
    plan: null,
    creditBalance: null,
    windows: [],
    observedAt: Date.now() / 1000,
  };
}

function clamp01(x) {
  if (x === null || x === undefined || Number.isNaN(x)) return null;
  return Math.min(Math.max(x, 0), 1);
}

module.exports = { home, readJSON, num, isoToEpoch, kindForSeconds, unavailable, clamp01 };
