importScripts('settings.js');

async function readSettings() {
  const { shield } = await chrome.storage.local.get('shield');
  return streamShieldSettings(shield);
}

async function updateBadge(settings) {
  const value = settings ?? await readSettings();
  await chrome.action.setBadgeText({ text: value.curtain ? 'BRB' : value.enabled ? 'ON' : '' });
  await chrome.action.setBadgeBackgroundColor({ color: value.curtain ? '#14161b' : '#0e7a4b' });
  await chrome.action.setBadgeTextColor?.({ color: '#ffffff' });
  await chrome.action.setTitle({
    title: value.curtain ? 'Stream Shield for X: whole tab covered'
      : value.enabled ? 'Stream Shield for X: on' : 'Stream Shield for X: off',
  });
}

chrome.runtime.onInstalled.addListener(() => updateBadge().catch(() => {}));
chrome.runtime.onStartup.addListener(() => updateBadge().catch(() => {}));

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !Object.hasOwn(changes, 'shield')) return;
  updateBadge(streamShieldSettings(changes.shield.newValue)).catch(() => {});
});

chrome.commands.onCommand.addListener(async command => {
  const current = await readSettings();
  if (command === 'toggle-shield') {
    await chrome.storage.local.set({ shield: { ...current, enabled: !current.enabled } });
  } else if (command === 'toggle-curtain') {
    await chrome.storage.local.set({ shield: { ...current, curtain: !current.curtain } });
  }
});
