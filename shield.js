(() => {
  const avatarSelector = [
    'img[alt^="@"]', 'img[src*="/profile_images/"]', 'img[srcset*="/profile_images/"]',
    'img[src*="/default_profile_images/"]', '[style*="/profile_images/"]',
    '[style*="/default_profile_images/"]', '[data-slot="avatar-fallback"]',
  ].join(',');
  const textSelector = 'span,div[dir="auto"],[data-testid="UserName"] div';
  const identityHeader = '.x-middot-group,[data-testid="User-Name"],[data-testid="UserName"]';
  const profileSections = new Set([
    'with_replies', 'media', 'highlights', 'likes', 'articles', 'photo', 'header',
    'followers', 'verified_followers', 'following', 'subscriptions',
  ]);
  const maskAttribute = 'data-xss-mask';
  const masked = new Map();
  let preferences;
  let account = { handle: '', name: '', avatars: new Set() };
  let originalTitle;
  const coveredTitle = 'Profile / X';

  function cleanText(value) {
    return value.replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, '')
      .replace(/\s+/g, ' ').trim();
  }

  function text(element) {
    return cleanText(element?.textContent ?? '');
  }

  function handleFromText(value) {
    return value.startsWith('@') ? streamShieldHandle(value) : '';
  }

  function profileHref(value) {
    if (!value) return '';
    const match = value.match(/^(?:https:\/\/(?:x|twitter)\.com)?\/([a-z\d_]{1,15})\/?(?:[?#].*)?$/i);
    return streamShieldHandle(match?.[1]);
  }

  function avatarKey(element) {
    for (const attribute of ['src', 'srcset', 'style']) {
      const value = element.getAttribute(attribute) ?? '';
      const match = value.match(/pbs\.twimg\.com\/profile_images\/([\d]+)\//i);
      if (match) return match[1];
    }
    return '';
  }

  function accountTriggers() {
    const labeled = [...document.querySelectorAll([
      '[data-testid="SideNav_AccountSwitcher_Button"]',
      '[aria-label="Account menu" i]',
    ].join(','))];
    if (labeled.length) return labeled;
    return [...document.querySelectorAll('button[data-slot="xds-menu-trigger"][aria-haspopup="menu"]:has(img[alt^="@"])')]
      .filter(element => !element.closest('main,article'));
  }

  function smallest(container, selector, predicate) {
    return [...container.querySelectorAll(selector)].filter(element =>
      predicate(element) && ![...element.children].some(child => child.matches(selector) && predicate(child)));
  }

  function identityParts(container) {
    const avatars = [...container.querySelectorAll(avatarSelector)];
    // A split @ and handle can be normalized by reading their common text container.
    const handles = smallest(container, textSelector, element =>
      Boolean(handleFromText(text(element))));
    const handle = avatars.map(element => handleFromText(element.getAttribute('alt') ?? ''))
      .find(Boolean) || handleFromText(text(handles[0]));
    const names = new Set();
    for (const handleNode of handles) {
      for (let group = handleNode; group.parentElement && group !== container; group = group.parentElement) {
        const siblings = [...group.parentElement.children].filter(element => element !== group &&
          !element.matches('svg, [aria-hidden="true"]') && !element.querySelector(avatarSelector) &&
          text(element) && !text(element).startsWith('@'));
        if (!siblings.length) continue;
        for (const sibling of siblings) names.add(sibling);
        break;
      }
    }
    return { handle, handles, names, avatars };
  }

  function readAccount(triggers) {
    const parts = triggers.map(identityParts);
    const profile = document.querySelector('a[data-testid="AppTabBar_Profile_Link"],a[aria-label="Profile" i]');
    const fallback = preferences.fallbackHandle;
    const handle = parts.map(item => item.handle).find(Boolean) ||
      profileHref(profile?.getAttribute('href')) || fallback || account.handle;
    const prior = handle === account.handle ? account : { name: '', avatars: new Set() };
    const matching = parts.filter(item => !item.handle || item.handle === handle);
    const name = matching.flatMap(item => [...item.names]).map(text).find(Boolean) || prior.name;
    const avatars = new Set(prior.avatars);
    for (const image of matching.flatMap(item => item.avatars)) {
      const key = avatarKey(image);
      if (key) avatars.add(key);
    }
    account = { handle, name, avatars };
    return parts;
  }

  function accountMenus(triggers) {
    const triggerIds = new Set(triggers.map(element => element.id).filter(Boolean));
    return [...document.querySelectorAll('[role="menu"],[data-testid="Dropdown"],[role="dialog"]')]
      .filter(menu =>
        (menu.getAttribute('aria-labelledby') ?? '').split(/\s+/).some(id => triggerIds.has(id)) ||
        Boolean(menu.querySelector('[data-testid="AccountSwitcher_Logout_Button"],a[href="/logout"],a[href^="/logout?"]')));
  }

  function protectParts(parts, mark) {
    for (const element of parts.handles) mark(element, 'handle');
    for (const element of parts.names) mark(element, 'name');
    for (const element of parts.avatars) mark(element, 'avatar');
  }

  function protectMenus(triggers, mark) {
    for (const menu of accountMenus(triggers)) {
      const rows = [...menu.querySelectorAll([
        '[role="menuitemradio"]', '[data-testid*="AccountSwitcher_Account"]',
        '[data-testid^="UserAvatar-Container-"]',
      ].join(','))];
      for (const row of rows) {
        const item = row.closest('[role="menuitemradio"],[role="menuitem"],[role="button"],button') || row;
        protectParts(identityParts(item), mark);
      }
      // Keep the menu action clickable if the label includes the account handle.
      for (const item of menu.querySelectorAll('[role="menuitem"],[data-testid="AccountSwitcher_Logout_Button"]')) {
        const handleNodes = smallest(item, 'span,div', element => /@[a-z\d_]{1,15}\b/i.test(text(element)));
        if (!handleNodes.length && /@[a-z\d_]{1,15}\b/i.test(text(item))) mark(item, 'handle');
        for (const node of handleNodes) mark(node, 'handle');
      }
    }
  }

  function onOwnProfile() {
    const [, handle, section] = location.pathname.toLowerCase().replace(/\/$/, '').split('/');
    return handle === account.handle && (!section || profileSections.has(section));
  }

  function protectProfile(mark) {
    if (!onOwnProfile()) return;
    const main = document.querySelector('main,[role="main"]');
    if (!main) return;
    for (const heading of main.querySelectorAll('h1,[data-testid="UserName"]')) {
      if (heading.closest('article,[data-testid="UserCell"]')) continue;
      if (heading.matches('h1') && (heading.matches('.sr-only') || !text(heading))) continue;
      // The redesigned profile puts the handle next to the h1 two levels up.
      const header = heading.matches('h1') ? heading.parentElement.parentElement : heading;
      const handles = smallest(header, 'span,div', element => handleFromText(text(element)) === account.handle);
      if (heading.matches('h1') && (handles.length || text(heading) === account.name)) mark(heading, 'name');
      for (const node of handles) mark(node, 'handle');
      if (heading.matches('[data-testid="UserName"]')) {
        for (const node of identityParts(header).names) mark(node, 'name');
      }
    }
    const photo = main.querySelector(`a[href="/${account.handle}/photo" i]`);
    for (const element of photo?.querySelectorAll(avatarSelector) ?? []) mark(element, 'avatar');
    if (location.pathname.toLowerCase() === `/${account.handle}/photo`) {
      for (const dialog of document.querySelectorAll('[role="dialog"]')) {
        for (const image of dialog.querySelectorAll(avatarSelector)) mark(image, 'avatar');
      }
    }
  }

  function protectPageIdentity(mark) {
    const { handle, name, avatars } = account;
    if (!handle) return;
    const ownLink = [
      `a[href="/${handle}" i]`, `a[href^="/${handle}?" i]`, `a[href="/${handle}/" i]`,
      `a[href="https://x.com/${handle}" i]`, `a[href="https://twitter.com/${handle}" i]`,
    ].join(',');
    for (const anchor of document.querySelectorAll(ownLink)) {
      const label = text(anchor);
      if (handleFromText(label) === handle) {
        mark(anchor, 'handle');
      } else if (label && (label === name || anchor.closest(identityHeader))) {
        const nestedHandles = smallest(anchor, 'span,div', element => handleFromText(text(element)) === handle);
        for (const node of nestedHandles) mark(node, 'handle');
        if (!nestedHandles.length) mark(anchor, 'name');
        for (const node of identityParts(anchor).names) mark(node, 'name');
        for (const node of smallest(anchor, textSelector, element => text(element) && text(element) === name)) {
          mark(node, 'name');
        }
      }
    }
    for (const element of document.querySelectorAll(avatarSelector)) {
      if (handleFromText(element.getAttribute('alt') ?? '') === handle ||
          avatars.has(avatarKey(element)) ||
          element.closest(ownLink) ||
          element.closest(`[data-testid="UserAvatar-Container-${handle}" i]`)) {
        mark(element, 'avatar');
      }
    }
    protectProfile(mark);
  }

  function protectCounts(mark) {
    const links = document.querySelectorAll([
      '[data-testid="AppTabBar_Notifications_Link"]', '[data-testid="AppTabBar_DirectMessage_Link"]',
      'nav a[href="/notifications"]', 'nav a[href^="/messages"]', 'header a[href="/notifications"]',
      'header a[href^="/messages"]', '[data-testid="DMDrawerHeader"]',
    ].join(','));
    for (const link of links) {
      for (const node of smallest(link, 'span,div', element => /^\d+\+?$/.test(text(element)))) {
        mark(node, 'counts');
      }
    }
  }

  function protectMessages(mark) {
    for (const drawer of document.querySelectorAll('[data-testid="DMDrawer"]')) {
      const header = drawer.querySelector('[data-testid="DMDrawerHeader"]');
      if (!header) {
        mark(drawer, 'messages');
        continue;
      }
      // Cover everything beside the header's branch so the drawer can still be opened and closed.
      for (let node = header; node !== drawer && node.parentElement; node = node.parentElement) {
        for (const sibling of node.parentElement.children) {
          if (sibling !== node && sibling.offsetHeight > 0) mark(sibling, 'messages');
        }
      }
    }
  }

  function protectTitleCount() {
    if (!preferences.enabled || !preferences.counts) return;
    const stripped = document.title.replace(/^\(\d+\+?\)\s*/, '');
    if (stripped !== document.title) document.title = stripped;
  }

  function protectTitle() {
    if (originalTitle !== undefined && document.title !== coveredTitle) originalTitle = undefined;
    const shouldCover = preferences.enabled && (preferences.handle || preferences.name) && account.handle;
    const titleHandles = [...document.title.matchAll(/\(@([a-z\d_]{1,15})\)/gi)];
    if (shouldCover && titleHandles.some(match => streamShieldHandle(match[1]) === account.handle)) {
      originalTitle = document.title;
      document.title = coveredTitle;
    } else if (!shouldCover && originalTitle !== undefined) {
      document.title = originalTitle;
      originalTitle = undefined;
    }
  }

  function applyShield() {
    if (!preferences || !document.documentElement) return;
    const next = new Map();
    function mark(element, field) {
      if (preferences[field] && element?.isConnected) next.set(element, field);
    }

    if (preferences.enabled) {
      const triggers = accountTriggers();
      const parts = readAccount(triggers);
      for (const part of parts) protectParts(part, mark);
      protectMenus(triggers, mark);
      protectPageIdentity(mark);
      protectCounts(mark);
      protectMessages(mark);
      document.documentElement.setAttribute('data-xss-mode', preferences.mode);
      const blur = `${preferences.blur}px`;
      if (document.documentElement.style.getPropertyValue('--xss-blur') !== blur) {
        document.documentElement.style.setProperty('--xss-blur', blur);
      }
    } else {
      document.documentElement.removeAttribute('data-xss-mode');
    }

    for (const element of masked.keys()) {
      if (next.has(element)) continue;
      element.removeAttribute(maskAttribute);
      masked.delete(element);
    }
    for (const [element, field] of next) {
      if (element.getAttribute(maskAttribute) !== field) element.setAttribute(maskAttribute, field);
      masked.set(element, field);
    }
    protectTitle();
    protectTitleCount();
    updateIndicator();
    updateCurtain();
    document.documentElement.setAttribute('data-xss-ready', '');
  }

  let indicator;
  let indicatorLabel;
  function updateIndicator() {
    const show = preferences.enabled && preferences.badge;
    if (!show) {
      if (indicator) indicator.hidden = true;
      return;
    }
    if (!indicator) {
      indicator = document.createElement('stream-shield-indicator');
      const root = indicator.attachShadow({ mode: 'closed' });
      root.innerHTML = `<style>
        :host { all: initial; position: fixed; z-index: 2147483647; left: 14px; bottom: 14px;
          pointer-events: none; font: 600 12px/1 "Segoe UI", system-ui, -apple-system, sans-serif; }
        :host([hidden]) { display: none; }
        .tag { display: flex; align-items: center; gap: 6px; padding: 6px 10px 6px 8px;
          border-radius: 6px; color: #14161b; background: #fff;
          box-shadow: 0 0 0 1px rgb(0 0 0 / .12), 0 2px 8px rgb(0 0 0 / .18); }
        svg { width: 14px; height: 14px; fill: #0e7a4b; }
        .count { color: #5d6470; font-weight: 400; }
      </style><div class="tag"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z"/></svg><span>Shielded</span><span class="count"></span></div>`;
      indicatorLabel = root.querySelector('.count');
    }
    if (!indicator.isConnected) document.documentElement.append(indicator);
    indicator.hidden = false;
    const label = masked.size ? `${masked.size} covered` : '';
    if (indicatorLabel.textContent !== label) indicatorLabel.textContent = label;
  }

  let curtain;
  function updateCurtain() {
    if (!preferences.curtain) {
      curtain?.remove();
      return;
    }
    if (!curtain) {
      curtain = document.createElement('stream-shield-curtain');
      const root = curtain.attachShadow({ mode: 'closed' });
      root.innerHTML = `<style>
        :host { all: initial; position: fixed; inset: 0; z-index: 2147483647;
          display: grid; place-items: center; background: #14161b; color: #eceef1;
          font: 400 15px/1.5 "Segoe UI", system-ui, -apple-system, sans-serif;
          animation: in .16s ease-out; cursor: default; user-select: none; }
        h1 { margin: 0; font: 600 clamp(32px, 6vw, 64px)/1.05 Bahnschrift, "DIN Alternate",
          "Avenir Next Condensed", system-ui, sans-serif; font-stretch: 88%; letter-spacing: -.01em; }
        p { margin: 10px 0 0; color: #9aa1ad; text-align: center; }
        @keyframes in { from { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { :host { animation: none; } }
      </style><div><h1>Be right back</h1><p>This tab is hidden for a moment.</p></div>`;
    }
    if (!curtain.isConnected) document.documentElement.append(curtain);
  }

  const observer = new MutationObserver(applyShield);
  function setPreferences(value) {
    preferences = streamShieldSettings(value);
    observer.disconnect();
    if (preferences.enabled) {
      observer.observe(document, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['href', 'alt', 'src', 'srcset', 'aria-label', 'aria-labelledby', 'data-testid'],
      });
    }
    applyShield();
  }

  let changedDuringRead = false;
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !Object.hasOwn(changes, 'shield')) return;
    changedDuringRead = true;
    setPreferences(changes.shield.newValue);
  });
  chrome.storage.local.get('shield').then(({ shield }) => {
    if (!changedDuringRead) setPreferences(shield);
  }).catch(() => {
    // Leave the startup cover in place if the browser cannot read the saved mode.
  });
  window.navigation?.addEventListener('currententrychange', applyShield);
  window.addEventListener('pageshow', applyShield);
  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    if (message.type !== 'stream-shield-status') return;
    respond({ ready: Boolean(preferences), enabled: preferences?.enabled === true,
      curtain: preferences?.curtain === true,
      recognized: Boolean(account.handle), handle: account.handle, count: masked.size,
      counts: [...masked.values()].reduce((total, field) => {
        total[field] = (total[field] ?? 0) + 1;
        return total;
      }, {}) });
  });
})();
