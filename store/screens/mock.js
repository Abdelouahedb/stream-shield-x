// Stand-in for the extension APIs so the real popup can be rendered for store screenshots.
const params = new URLSearchParams(location.search);
let store = { shield: {
  enabled: params.get('on') === '1',
  mode: params.get('mode') || 'redact',
  curtain: params.get('curtain') === '1',
  badge: true,
} };
const listeners = [];
window.chrome = {
  storage: {
    local: {
      get: async () => store,
      set: async value => { store = { ...store, ...value }; listeners.forEach(f => f({ shield: { newValue: value.shield } }, 'local')); },
    },
    onChanged: { addListener: f => listeners.push(f) },
  },
  tabs: {
    create: () => {},
    query: async () => [{ id: 1 }],
    sendMessage: async () => ({ ready: true, enabled: store.shield.enabled, recognized: true,
      handle: 'streamer', count: 11, counts: { name: 3, handle: 4, avatar: 2, counts: 2 } }),
  },
  commands: { getAll: async () => [
    { name: 'toggle-shield', shortcut: 'Alt+Shift+S' }, { name: 'toggle-curtain', shortcut: 'Alt+Shift+C' },
  ] },
};
