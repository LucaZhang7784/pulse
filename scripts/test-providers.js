'use strict';

// Exercises the provider adapters directly (no Electron), printing a compact
// summary so the data path can be verified without launching the app.

const { fetchAll } = require('../src/providers');

(async () => {
  const results = await fetchAll();
  for (const r of results) {
    console.log(`\n=== ${r.name} (${r.id}) — ${r.state}${r.reason ? ' [' + r.reason + ']' : ''} ===`);
    if (r.plan) console.log(`  plan: ${r.plan}`);
    if (r.creditBalance !== null && r.creditBalance !== undefined) console.log(`  credit balance: ${r.creditBalance}`);
    if (r.balance) console.log(`  balance: ${JSON.stringify(r.balance)}`);
    if (r.balanceInfos) console.log(`  balanceInfos: ${JSON.stringify(r.balanceInfos)}`);
    for (const w of r.windows) {
      const pct = (w.usedFraction * 100).toFixed(1) + '%';
      const reset = w.resetsAt ? new Date(w.resetsAt * 1000).toISOString() : '—';
      console.log(`  ${w.id}  ${w.kind}${w.scope ? ' (' + w.scope + ')' : ''}  used ${pct}  resets ${reset}${w.isExhausted ? '  EXHAUSTED' : ''}`);
    }
  }
})();
