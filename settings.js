const streamShieldModes = Object.freeze(['hide', 'blur', 'redact']);

const streamShieldDefaults = Object.freeze({
  enabled: false,
  mode: 'hide',
  name: true,
  handle: true,
  avatar: true,
  blur: 14,
  counts: true,
  messages: true,
  badge: false,
  curtain: false,
  fallbackHandle: '',
});

function streamShieldHandle(value) {
  if (typeof value !== 'string') return '';
  const handle = value.trim().replace(/^@/, '');
  return /^[a-z\d_]{1,15}$/i.test(handle) ? handle.toLowerCase() : '';
}

function streamShieldBlur(value) {
  const number = Math.round(Number(value));
  return Number.isFinite(number) ? Math.min(30, Math.max(4, number)) : streamShieldDefaults.blur;
}

function streamShieldSettings(value) {
  return {
    enabled: value?.enabled === true,
    mode: streamShieldModes.includes(value?.mode) ? value.mode : 'hide',
    name: value?.name !== false,
    handle: value?.handle !== false,
    avatar: value?.avatar !== false,
    blur: value?.blur === undefined ? streamShieldDefaults.blur : streamShieldBlur(value.blur),
    counts: value?.counts !== false,
    messages: value?.messages !== false,
    badge: value?.badge === true,
    curtain: value?.curtain === true,
    fallbackHandle: streamShieldHandle(value?.fallbackHandle),
  };
}
