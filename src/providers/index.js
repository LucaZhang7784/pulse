'use strict';

// Provider registry. Each adapter exposes `fetchUsage(credential?)` returning a
// canonical result object:
//   { id, state: 'live'|'unavailable'|'stale', reason, plan, creditBalance,
//     balance, balanceInfos, windows: [...], observedAt }
//
// Credential resolution, in priority order:
//   1. a value the user pasted into Settings,
//   2. what CC Switch already stored (DeepSeek / Kimi / OpenRouter / Vercel AI
//      Gateway / MiniMax / Zhipu GLM / OfoxAI),
//   3. what OpenCode stored for itself in `~/.local/share/opencode/auth.json`,
//   4. a provider environment variable (AI_GATEWAY_API_KEY, MINIMAX_API_KEY,
//      ZHIPU_API_KEY, OFOX_API_KEY, …).

const path = require('path');
const { home, readJSON } = require('./common');
const { readCCSwitchCredentials } = require('../ccswitch');

const claude = require('./claude');
const codex = require('./codex');
const openrouter = require('./openrouter');
const deepseek = require('./deepseek');
const kimi = require('./kimi');
const xiaomi = require('./xiaomi');
const antigravity = require('./antigravity');
const vercel = require('./vercel');
const minimax = require('./minimax');
const zhipu = require('./zhipu');
const ofox = require('./ofox');

const PROVIDERS = [
  { id: 'codex', name: 'ChatGPT / Codex', adapter: codex, credential: 'none' },
  { id: 'antigravity', name: 'Antigravity', adapter: antigravity, credential: 'none' },
  { id: 'claudeCode', name: 'Claude Code', adapter: claude, credential: 'none' },
  { id: 'openRouter', name: 'OpenRouter (Claude Code)', adapter: openrouter, credential: 'key' },
  { id: 'deepSeek', name: 'DeepSeek', adapter: deepseek, credential: 'key' },
  { id: 'kimi', name: 'Kimi', adapter: kimi, credential: 'key' },
  { id: 'xiaomiMiMo', name: 'MiMo', adapter: xiaomi, credential: 'cookie' },
  { id: 'vercelAiGateway', name: 'Vercel AI Gateway', adapter: vercel, credential: 'key' },
  { id: 'minimax', name: 'MiniMax Token Plan', adapter: minimax, credential: 'key' },
  { id: 'zhipu', name: 'Zhipu GLM', adapter: zhipu, credential: 'key' },
  { id: 'ofox', name: 'OfoxAI', adapter: ofox, credential: 'key' },
];

function opencodeStoredKey(provider) {
  const root = readJSON(path.join(home(), '.local', 'share', 'opencode', 'auth.json'));
  if (!root) return null;
  const entry = root[provider];
  return entry && entry.key && entry.key.length ? entry.key : null;
}

async function fetchAll(enteredKeys = {}) {
  const cc = await readCCSwitchCredentials();
  const env = process.env;

  const resolve = {
    openRouter: enteredKeys.openRouter || cc.openRouterKey,
    deepSeek: enteredKeys.deepSeek || cc.deepSeekKey || opencodeStoredKey('deepseek'),
    kimi: enteredKeys.kimi || cc.kimiKey,
    xiaomiMiMo: enteredKeys.xiaomiMiMo || null,
    vercelAiGateway: enteredKeys.vercelAiGateway || cc.vercelKey || env.AI_GATEWAY_API_KEY,
    minimax: enteredKeys.minimax || cc.minimaxKey || env.MINIMAX_API_KEY || env.MINIMAX_CN_API_KEY,
    zhipu: enteredKeys.zhipu || cc.zhipuKey || env.ZHIPU_API_KEY || env.ZHIPUAI_API_KEY
      || env.BIGMODEL_API_KEY || env.GLM_API_KEY,
    ofox: enteredKeys.ofox || cc.ofoxKey || env.OFOX_API_KEY,
  };

  return Promise.all(PROVIDERS.map(async (p) => {
    try {
      let result;
      if (p.credential === 'none') {
        result = await p.adapter.fetchUsage();
      } else {
        result = await p.adapter.fetchUsage(resolve[p.id]);
      }
      return { ...result, name: p.name };
    } catch (err) {
      return {
        id: p.id, name: p.name, state: 'unavailable', reason: 'error',
        plan: null, creditBalance: null, balance: null, windows: [],
        observedAt: Date.now() / 1000,
        error: String(err && err.message || err),
      };
    }
  }));
}

module.exports = { PROVIDERS, fetchAll };
