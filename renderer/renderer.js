'use strict';
const $ = (selector) => document.querySelector(selector);
const UI = window.PULSE_UI;
let currentProviders = [];
let selectedId = null;
const names = { codex: 'Codex', antigravity: 'AG', claudeCode: 'Claude', openRouter: 'OR / CC', deepSeek: 'DeepSeek', kimi: 'Kimi', xiaomiMiMo: 'MiMo', vercelAiGateway: 'Vercel', minimax: 'MiniMax', zhipu: 'GLM', ofox: 'OfoxAI' };
function ringSVG(fraction, exhausted) {
  if (!UI.validNumber(fraction)) return '';
  const progress = Math.min(fraction, 1) * 100;
  return `<svg width="38" height="38" viewBox="0 0 38 38" aria-hidden="true"><circle cx="19" cy="19" r="16" fill="none" stroke="#ffffff18" stroke-width="2"/><circle cx="19" cy="19" r="16" fill="none" stroke="${UI.color(fraction, exhausted)}" stroke-width="2" pathLength="100" stroke-dasharray="${progress} 100" transform="rotate(-90 19 19)"/></svg>`;
}
function renderProviders() {
  const focusedId = document.activeElement?.dataset.id;
  const container = $('#providers');
  container.replaceChildren();
  for (const provider of currentProviders) {
    const button = document.createElement('button');
    const windows = (provider.windows || []).filter((w) => UI.validNumber(w.usedFraction));
    const primary = windows.reduce((a, b) => !a || b.usedFraction > a.usedFraction ? b : a, null);
    const exhausted = windows.some((w) => w.isExhausted) || provider.isExhausted === true;
    const live = provider.state === 'live';
    const planless = provider.reason === 'noCodingPlan' || provider.reason === 'noTokenPlan';
    let value = provider.reason === 'cookieMissing' || provider.reason === 'signInRequired' ? 'Sign in' : planless ? 'No plan' : provider.state === 'stale' ? 'Stale' : 'Offline';
    let ring = '';
    let description = provider.reason || 'Unavailable';
    if (live && primary) {
      value = `${Math.round(primary.usedFraction * 100)}%`;
      description = `${value} used / ${primary.kind}${primary.scope ? ` / ${primary.scope}` : ''}`;
      ring = ringSVG(primary.usedFraction, exhausted);
      button.style.color = UI.color(primary.usedFraction, exhausted);
    } else if (live && provider.balance && provider.balance.amount != null && Number.isFinite(Number(provider.balance.amount))) {
      value = UI.money(provider.balance.amount, provider.balance.currency);
      description = `${value} available`;
    } else if (live) { value = '—'; description = 'No usage reported'; }
    button.type = 'button';
    button.className = `provider${live ? '' : ' unavailable'}${selectedId === provider.id ? ' active' : ''}`;
    button.dataset.id = provider.id;
    button.title = `${provider.name} / ${description}`;
    button.setAttribute('aria-label', button.title);
    button.setAttribute('aria-expanded', String(selectedId === provider.id));
    const icon = window.PULSE_ICONS?.[provider.id] || '';
    button.innerHTML = `<span class="ring-wrap">${ring}<span class="icon">${icon}</span></span><span class="pct">${UI.escape(value)}</span><span class="provider-name">${names[provider.id] || UI.escape(provider.name)}</span>`;
    button.addEventListener('click', (event) => window.pulse.toggleCard(provider, { focus: event.detail === 0 }));
    button.addEventListener('contextmenu', (event) => { event.preventDefault(); window.pulse.popupMenu(); });
    container.append(button);
  }
  if (focusedId) [...container.children].find((item) => item.dataset.id === focusedId)?.focus();
}
async function refreshAll() {
  const button = $('#refresh');
  button.disabled = true;
  button.classList.add('spinning');
  try { currentProviders = await window.pulse.fetchProviders(); renderProviders(); }
  finally { button.disabled = false; button.classList.remove('spinning'); }
}
async function init() {
  const edge = $('#edge-trigger');
  let hoverTimer;
  function setRailState(expanded) {
    $('#app').dataset.expanded = String(expanded);
    $('#rail').inert = !expanded;
    edge.setAttribute('aria-expanded', String(expanded));
    clearTimeout(hoverTimer);
  }
  window.pulse.onRailState(setRailState);
  edge.addEventListener('pointerenter', () => { hoverTimer = setTimeout(() => window.pulse.expandRail(), 1000); });
  edge.addEventListener('pointerleave', () => clearTimeout(hoverTimer));
  edge.addEventListener('click', () => { clearTimeout(hoverTimer); window.pulse.expandRail(); });
  window.addEventListener('blur', () => clearTimeout(hoverTimer));
  setRailState(await window.pulse.getRailState());
  const settings = await window.pulse.getSettings();
  $('#app').className = `dock-${['left', 'right', 'float'].includes(settings.dock) ? settings.dock : 'right'}`;
  window.pulse.onDock((dock) => { $('#app').className = `dock-${dock}`; });
  window.pulse.onCardSelection((id) => {
    selectedId = id;
    document.querySelectorAll('.provider').forEach((item) => {
      item.classList.toggle('active', item.dataset.id === id);
      item.setAttribute('aria-expanded', String(item.dataset.id === id));
    });
  });
  window.pulse.onProviders((data) => { currentProviders = data; renderProviders(); });
  await refreshAll();
  $('#refresh').addEventListener('click', refreshAll);
  $('#rail').addEventListener('contextmenu', (event) => { event.preventDefault(); window.pulse.popupMenu(); });
}
init();
