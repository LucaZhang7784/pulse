'use strict';
const UI = window.PULSE_UI;
const escape = UI.escape;

function formatReset(resetsAt) {
  if (!Number.isFinite(resetsAt)) return 'Reset time not reported';
  const diff = resetsAt - Date.now() / 1000;
  if (diff <= 0) return 'Reset pending';
  if (diff < 3600) return `Resets in ${Math.ceil(diff / 60)}m`;
  if (diff < 86400) return `Resets in ${Math.ceil(diff / 3600)}h`;
  return `Resets in ${Math.ceil(diff / 86400)}d`;
}
function reasonText(reason) {
  return ({ signInRequired: 'Sign in to this provider to see limits.', loginExpired: 'Your saved login has expired. Sign in again to refresh.', apiKeyMissing: 'No API key found. Add one in Settings (right-click the rail).', apiKeyRefused: 'The API key was refused. Check it in Settings.', cookieMissing: 'No MiMo session cookie. Add it in Settings.', sessionExpired: 'The MiMo session has expired. Sign in again and update the cookie.', noCodingPlan: 'No active Coding Plan on this account.', noTokenPlan: 'No active Token Plan on this account.', notRunning: 'Antigravity is not running. Open the editor to read its quota.', notAnswering: 'Antigravity did not answer the quota request.', customProxy: 'This account uses a custom proxy. Account limits are not reported here.', noLimitsReported: 'The provider returned no limits.', rateLimited: 'Too many requests. Try again shortly.', unreachable: 'Could not reach the provider. Check your connection.', serverError: 'The provider returned an error.', unreadableReply: 'The provider sent an unreadable reply.', error: 'An unexpected error occurred.' })[reason] || 'Usage is unavailable. Try refreshing or check Settings.';
}
function windowLabel(w) {
  return ({ '5h': '5-hour allowance', weekly: 'Weekly allowance', monthly: 'Monthly allowance', '24h': 'Daily allowance' })[w.kind] || `${w.kind || 'Usage'} allowance`;
}
function stat(label, value) {
  return `<div><small>${label}</small><strong>${UI.validNumber(value) ? value.toLocaleString('en-US') : '—'}</strong><span class="token-unit"> tokens</span></div>`;
}
function sessionHTML(provider) {
  if (!['codex', 'antigravity'].includes(provider.id)) return '';
  const session = provider.session;
  if (!session) return '<section class="session"><div class="session-title">Latest active session</div><div class="scope">No local session metadata available.</div></section>';
  const usageLabel = provider.id === 'codex' ? 'Latest turn' : 'Latest generation';
  const usage = UI.validNumber(session.totalTokens) ? stat(usageLabel, session.totalTokens) : '';
  const inputs = session.inputTokens != null ? stat('Input', session.inputTokens) : '';
  const cached = session.cachedTokens != null ? stat('Cached input', session.cachedTokens) : '';
  const output = session.outputTokens != null ? stat('Output', session.outputTokens) : '';
  return `<section class="session"><div class="session-title"><span>Latest active session</span><small>${escape(UI.time(session.observedAt))}</small></div><div class="model">${escape(session.model || 'Model not reported')}</div><div class="strength">${provider.id === 'codex' ? 'Reasoning effort' : 'Model tier'} / ${escape(session.strength || 'Not reported')}</div><div class="stats">${usage}${inputs}${cached}${output}</div>${!usage && !inputs && !output ? '<div class="scope">Token usage not reported.</div>' : ''}<div class="scope">${usageLabel} data from local records.</div></section>`;
}
function render(provider, revision) {
  if (!provider) return;
  const focusId = document.activeElement?.id;
  const windows = (provider.windows || []).filter((w) => UI.validNumber(w.usedFraction));
  const live = provider.state === 'live';
  const primary = windows[0];
  let quota = '';
  let otherWindows = '';
  if (live && primary) {
    const percent = Math.round(primary.usedFraction * 100);
    const color = UI.color(primary.usedFraction, primary.isExhausted);
    quota = `<section><div class="quota-label">${escape(windowLabel(primary))} / used</div>${primary.scope ? `<div class="scope">${escape(primary.scope)}</div>` : ''}<div class="numberline"><div class="number" style="color:${color}">${percent}<span>%</span></div><div class="remaining">Remaining <b>${Math.max(0, 100 - percent)}%</b></div></div><div class="meter" role="meter" aria-label="${escape(windowLabel(primary))} used" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(percent, 100)}"><div class="meter-fill" style="width:${Math.min(percent, 100)}%;--usage-color:${color}"></div></div><div class="reset">${formatReset(primary.resetsAt)}${primary.isExhausted ? ' / Limit reached' : ''}</div></section>`;
    otherWindows = `<div class="windows">${windows.slice(1).map((w) => `<div class="window"><div>${escape(windowLabel(w))}${w.scope ? `<div class="scope">${escape(w.scope)}</div>` : ''}<div class="reset">${formatReset(w.resetsAt)}</div></div><div class="value" style="color:${UI.color(w.usedFraction, w.isExhausted)}">${Math.round(w.usedFraction * 100)}% used${w.isExhausted ? '<div class="scope">Limit reached</div>' : ''}</div></div>`).join('')}</div>`;
  }
  const balances = provider.balanceInfos?.length ? provider.balanceInfos.map((b) => ({ amount: b.total, currency: b.currency })) : provider.balance ? [provider.balance] : [];
  const balanceHTML = live ? balances.filter((b) => b.amount != null && Number.isFinite(Number(b.amount))).map((b) => `<div class="window"><div>Available balance<div class="scope">${escape(b.currency)}</div></div><div class="value">${escape(UI.money(b.amount, b.currency))}</div></div>`).join('') : '';
  const icon = window.PULSE_ICONS?.[provider.id] || '';
  document.querySelector('#panel').innerHTML = `<header class="head"><div class="app-icon">${icon}</div><div class="heading"><h1>${escape(provider.name)}</h1><div class="plan">${escape(provider.plan || 'AI usage monitor')}</div></div><div class="actions"><button id="close" type="button" aria-label="Close details" title="Close details (Esc)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div></header><div class="status"><span><i style="background:${live ? '#8ce9d0' : '#b1c2ba'}"></i>${live ? 'Connected' : provider.state === 'stale' ? 'Stale data' : 'Unavailable'}</span><span class="top-label">ALWAYS ON TOP</span></div>${live ? quota + balanceHTML + (!quota && !balanceHTML ? '<div class="unavailable">No usage reported.</div>' : '') : `<div class="unavailable">${reasonText(provider.reason)}</div>`}${live && provider.creditBalance != null ? `<div class="credit">Credits / ${escape(provider.creditBalance)}</div>` : ''}${sessionHTML(provider)}${otherWindows}<footer class="meta">${live ? 'Updated' : 'Last checked'} ${escape(UI.time(provider.observedAt))}<br>Account allowances and session records update separately.</footer>`;

  document.querySelector('#close').addEventListener('click', () => window.pulse.closeCard());
  document.fonts.ready.then(() => requestAnimationFrame(() => {
    const panel = document.querySelector('#panel');
    const footer = panel.querySelector('.meta');
    const height = footer.getBoundingClientRect().bottom - panel.getBoundingClientRect().top + panel.scrollTop + parseFloat(getComputedStyle(panel).paddingBottom) + 2;
    window.pulse.fitCardHeight(height).then(() => window.pulse.cardPrepared(revision));
  }));

  if (focusId === 'close') document.getElementById(focusId).focus();
}
async function init() {
  window.pulse.onCardData((provider, revision) => render(provider, revision));
}
init();
