'use strict';
window.PULSE_UI = {
  escape: (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]),
  color: (fraction, exhausted) => exhausted || fraction >= 0.9 ? '#f38a91' : fraction >= 0.75 ? '#f2c27e' : '#8ce9d0',
  validNumber: (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0,
  currency: (code) => ({ CNY: '¥', USD: '$', EUR: '€', JPY: '¥', GBP: '£' })[code] || code || '',
  money: (amount, currency) => {
    const value = Number(amount);
    if (!Number.isFinite(value)) return '—';
    return `${value < 0 ? '-' : ''}${window.PULSE_UI.currency(currency)}${Math.abs(value).toFixed(2)}`;
  },
  time: (seconds) => Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : 'Not reported',
};
