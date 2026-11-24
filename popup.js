const form = document.querySelector('#settings');
const controls = document.querySelector('#controls');
const status = document.querySelector('#status');
const state = document.querySelector('#state');
const fallback = document.querySelector('#fallback');
const fallbackStatus = document.querySelector('#fallback-status');
const blur = document.querySelector('#blur');
const blurRow = document.querySelector('#blur-row');
const blurValue = document.querySelector('#blur-value');
const detected = document.querySelector('#detected');
const curtainButton = document.querySelector('#curtain');
const curtainLabel = document.querySelector('#curtain-label');
const openX = document.querySelector('#open-x');
const fields = ['enabled', 'name', 'handle', 'avatar', 'counts', 'messages', 'badge'];
const identity = ['name', 'handle', 'avatar'];
const nouns = {
  name: ['name', 'names'],
  handle: ['handle', 'handles'],
  avatar: ['photo', 'photos'],
  counts: ['count', 'counts'],
  messages: ['message preview', 'message previews'],
};
let current = streamShieldDefaults;
let statusRequest = 0;
let pollTimer;

function paintBlur(value) {
  blurValue.textContent = value;
  // The preview text is about a third of X's size, so scale the blur to match.
  document.body.style.setProperty('--blur-preview', `${(value / 3).toFixed(1)}px`);
}

function render() {
  for (const field of fields) form.elements.namedItem(field).checked = current[field];
  form.elements.namedItem('mode').value = current.mode;
  document.body.dataset.mode = current.mode;
  blur.value = current.blur;
  paintBlur(current.blur);
  blurRow.hidden = current.mode !== 'blur';
  fallback.value = current.fallbackHandle ? `@${current.fallbackHandle}` : '';
  document.body.classList.toggle('on', current.enabled);
  document.body.classList.toggle('curtained', current.curtain);
  state.textContent = current.curtain ? 'Whole tab covered'
    : current.enabled ? 'On, covering you on X' : 'Off';
  curtainButton.setAttribute('aria-pressed', String(current.curtain));
  curtainLabel.textContent = current.curtain ? 'Uncover the tab' : 'Cover the whole tab';
}

function obscure(handle) {
  return handle ? `@${handle[0]}${'•'.repeat(Math.min(6, Math.max(2, handle.length - 1)))}` : '';
}

function list(items) {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

function coveredSentence(counts) {
  const items = Object.entries(nouns)
    .filter(([field]) => counts[field])
    .map(([field, [one, many]]) => `${counts[field]} ${counts[field] === 1 ? one : many}`);
  return `Covering ${list(items)} on this tab.`;
}

function say(message, warn = false) {
  if (status.textContent !== message) status.textContent = message;
  status.classList.toggle('warn', warn);
}

async function refreshStatus() {
  const request = ++statusRequest;
  if (current.curtain) {
    say('Every X tab is covered. Uncover it when you’re ready.');
    openX.hidden = true;
    return;
  }
  if (!current.enabled) {
    openX.hidden = true;
    const selected = identity.filter(field => current[field]).map(field => nouns[field][0]);
    say(selected.length
      ? `Your ${list(selected)} ${selected.length === 1 ? 'is' : 'are'} visible on X. Turn the shield on before you share.`
      : 'Turn the shield on before you share.');
    return;
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }).catch(() => []);
  let report;
  if (tab?.id !== undefined) {
    report = await chrome.tabs.sendMessage(tab.id, { type: 'stream-shield-status' }).catch(() => undefined);
  }
  if (request !== statusRequest) return;
  openX.hidden = Boolean(report?.ready);

  if (report?.ready) {
    detected.textContent = report.recognized ? obscure(report.handle) : 'Not found yet';
    detected.classList.toggle('ok', report.recognized);
  }

  if (!report?.ready) {
    say('This tab isn’t X. The shield works on x.com.');
  } else if (!report.enabled) {
    say('Refresh the X tab to apply your changes.', true);
  } else if (!identity.some(field => current[field])) {
    say('Your name, handle and photo are all visible. Click them above to cover them.', true);
  } else if (!report.recognized) {
    say('Your account wasn’t found on this page. Enter your handle under Your account.', true);
  } else if (!report.count) {
    say('Nothing of yours is on this page yet.');
  } else {
    say(coveredSentence(report.counts ?? {}));
  }
}

function startPolling() {
  clearInterval(pollTimer);
  if (current.enabled) pollTimer = setInterval(refreshStatus, 1200);
}

async function save(next) {
  try {
    await chrome.storage.local.set({ shield: next });
    current = next;
    render();
    startPolling();
    return true;
  } catch {
    render();
    say('That change wasn’t saved. Try again.', true);
    return false;
  }
}

form.addEventListener('change', async event => {
  if (event.target === fallback) return;
  const next = {
    ...current,
    mode: form.elements.namedItem('mode').value,
    blur: streamShieldBlur(blur.value),
  };
  for (const field of fields) next[field] = form.elements.namedItem(field).checked;
  if (await save(next)) await refreshStatus();
});

blur.addEventListener('input', () => paintBlur(blur.value));
form.addEventListener('input', event => {
  if (event.target.name === 'mode') document.body.dataset.mode = event.target.value;
});

curtainButton.addEventListener('click', () => save({ ...current, curtain: !current.curtain })
  .then(saved => saved && refreshStatus()));

openX.addEventListener('click', () => chrome.tabs.create({ url: 'https://x.com/home' }));

document.querySelector('#shortcuts').addEventListener('click', () =>
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }));

async function saveFallback() {
  const input = fallback.value.trim();
  const handle = streamShieldHandle(input);
  if (input && !handle) {
    fallbackStatus.textContent = 'Handles use up to 15 letters, numbers or underscores.';
    return;
  }
  if (await save({ ...current, fallbackHandle: handle })) {
    fallbackStatus.textContent = handle ? 'Handle saved.' : 'Handle removed.';
    await refreshStatus();
  }
}

document.querySelector('#save-handle').addEventListener('click', saveFallback);
form.addEventListener('submit', event => {
  event.preventDefault();
  saveFallback();
});

// Keep the popup in sync when the keyboard shortcut toggles the shield.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !Object.hasOwn(changes, 'shield')) return;
  current = streamShieldSettings(changes.shield.newValue);
  render();
  startPolling();
  refreshStatus();
});

chrome.commands?.getAll().then(commands => {
  for (const [name, id] of [['toggle-shield', '#shield-key'], ['toggle-curtain', '#curtain-key']]) {
    const key = document.querySelector(id);
    const shortcut = commands.find(command => command.name === name)?.shortcut;
    if (shortcut) key.textContent = shortcut;
    else key.hidden = true;
  }
}).catch(() => {});

chrome.storage.local.get('shield').then(({ shield }) => {
  current = streamShieldSettings(shield);
  render();
  controls.disabled = false;
  startPolling();
  return refreshStatus();
}).catch(() => {
  say('Your settings couldn’t be read. Close and reopen this popup.', true);
});
