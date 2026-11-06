const now = Date.now() / 1000;
const {ipcRenderer} = require('electron');
let previewCardListener;
const providers = [
  { id: 'codex', name: 'ChatGPT / Codex', plan: 'Plus', state: 'live', windows: [{ kind: '5h', usedFraction: .23, resetsAt: now + 8200 }, { kind: 'weekly', usedFraction: .41, resetsAt: now + 86400 }], session: { model: 'gpt-example', strength: 'high', totalTokens: 12480, observedAt: now }, observedAt: now },
  { id: 'antigravity', name: 'Antigravity', plan: 'Pro', state: 'live', windows: [{ kind: '5h', scope: 'Gemini', usedFraction: .38, resetsAt: now + 8200 }, { kind: 'weekly', scope: 'Gemini', usedFraction: .29, resetsAt: now + 86400 }, { kind: '5h', scope: 'Claude / GPT', usedFraction: 0, resetsAt: now + 8200 }], session: { model: 'gemini-example', strength: 'flash medium', inputTokens: 10432, cachedTokens: 8192, outputTokens: 2048, observedAt: now }, observedAt: now },
  { id: 'claudeCode', name: 'Claude Code', state: 'unavailable', reason: 'customProxy', windows: [], observedAt: now },
  { id: 'openRouter', name: 'OpenRouter (Claude Code)', state: 'live', balance: { currency: 'USD', amount: 18.34 }, windows: [], observedAt: now },
  { id: 'deepSeek', name: 'DeepSeek', state: 'live', balance: { currency: 'CNY', amount: 201.69 }, windows: [], observedAt: now },
  { id: 'kimi', name: 'Kimi', state: 'live', windows: [{kind: 'weekly', usedFraction: .72, resetsAt: now + 86400}], observedAt: now },
  { id: 'xiaomiMiMo', name: 'MiMo', state: 'unavailable', reason: 'cookieMissing', windows: [], observedAt: now },
];
window.pulse = {
  getRailState: async () => new URLSearchParams(location.search).get('collapsed') !== 'true',
  onRailState: () => {}, expandRail: () => {},
  getSettings: async () => ({dock: 'float'}), fetchProviders: async () => providers,
  onCardSelection: () => {}, toggleCard: async (provider) => provider.id,
  fitCardHeight: (height) => { ipcRenderer.send('preview:fit', height); return Promise.resolve(); },
  onProviders: () => {}, onDock: () => {}, onCardData: (callback) => { previewCardListener = callback; setTimeout(() => previewCardListener?.(providers[Number(new URLSearchParams(location.search).get('provider') || 0)], 1), 0); }, onCardPinned: () => {},
  getCardPinned: async () => false, getCardData: async () => providers[Number(new URLSearchParams(location.search).get('provider') || 0)],
  showCard: async (provider) => provider.id, hideCard: () => {}, cardHover: () => {}, popupMenu: () => {},
  toggleCardPin: async () => true, closeCard: () => {}, cardPrepared: () => {},
};
