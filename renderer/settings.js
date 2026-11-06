'use strict';

const $ = (id) => document.getElementById(id);

async function init() {
  const settings = await window.pulse.getSettings();
  $('openRouterKey').value = settings.openRouterKey || '';
  $('deepSeekKey').value = settings.deepSeekKey || '';
  $('kimiKey').value = settings.kimiKey || '';
  $('xiaomiCookie').value = settings.xiaomiCookie || '';
  $('vercelKey').value = settings.vercelKey || '';
  $('minimaxKey').value = settings.minimaxKey || '';
  $('zhipuKey').value = settings.zhipuKey || '';
  $('ofoxKey').value = settings.ofoxKey || '';

  $('save').addEventListener('click', async () => {
    await window.pulse.setSettings({
      openRouterKey: $('openRouterKey').value.trim(),
      deepSeekKey: $('deepSeekKey').value.trim(),
      kimiKey: $('kimiKey').value.trim(),
      xiaomiCookie: $('xiaomiCookie').value.trim(),
      vercelKey: $('vercelKey').value.trim(),
      minimaxKey: $('minimaxKey').value.trim(),
      zhipuKey: $('zhipuKey').value.trim(),
      ofoxKey: $('ofoxKey').value.trim(),
    });
    $('status').textContent = 'Saved.';
    setTimeout(() => { $('status').textContent = ''; }, 2000);
  });

  $('close').addEventListener('click', () => window.close());
}

init();
