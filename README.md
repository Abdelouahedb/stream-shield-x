# Stream Shield for X

A browser extension for Edge and Chrome that covers your identity on X while you stream or share your screen. It hides, blurs or redacts your display name, @handle, profile photo, notification counts and message previews, and can drop a "Be right back" screen over the whole tab in one keystroke.

It runs only on `x.com` and `twitter.com`, stores its settings in your browser, and sends nothing anywhere.

## Features

- **Preview of what viewers see.** The popup shows a mock X post. Click your photo, name, handle or the notification count to choose what gets covered, and see the result in the style you picked.
- **Three cover styles:** Hide, Blur (strength from 4 to 30px) and Redact.
- **Counts and messages:** covers notification and message counts, including the count in the tab title, and the previews in the messages drawer.
- **Cover the whole tab:** one click or `Alt+Shift+C` puts a "Be right back" screen over every X tab. Press it again to uncover.
- **Keyboard shortcut:** `Alt+Shift+S` turns the shield on or off from anywhere in the browser.
- **Toolbar badge:** the icon shows **ON** while the shield is on and **BRB** while the tab is covered.
- **Optional "Shielded" tag** in the corner of X, so you and your viewers can see protection is on.

## Install on Edge or Chrome

1. Download or clone this repository and keep the folder somewhere permanent.
2. Open `edge://extensions` in Edge or `chrome://extensions` in Chrome.
3. Turn on **Developer mode**, select **Load unpacked**, and choose the folder containing `manifest.json`.
4. Refresh any open X tabs.
5. Open **Stream Shield for X** from the extensions toolbar and turn the shield on.

To change the shortcuts, open `edge://extensions/shortcuts` or `chrome://extensions/shortcuts`, or use **Change shortcuts** at the bottom of the popup.

## How it works

The extension has three parts that share one settings object stored in `chrome.storage.local`.

```
popup (popup.html / popup.js)        background (background.js)
  edits settings                        keyboard shortcuts, toolbar badge
          \                                   /
           └──── chrome.storage.local ───────┘
                          │  change events
                          ▼
            content script on x.com (shield.js + shield.css)
              finds your identity on the page and marks it
```

Any change, from the popup or a shortcut, is written to storage. Every open X tab listens for storage changes and re-applies itself immediately, so there's no reload and no message passing to get wrong.

### 1. Nothing shows before the shield is ready

The content script runs at `document_start`, before X draws anything. Until the saved settings have been read, `shield.css` keeps the page body invisible. This closes the gap where your name could flash on screen for a frame while the page loads.

### 2. Finding which account is yours

X doesn't label "this is you", so the shield works it out from the page in order of reliability:

1. **The account switcher** in the sidebar (and its newer menu-button version). Its avatar `alt` text and the `@handle` text inside it identify the signed-in account.
2. **The Profile link** in the navigation, whose `href` is `/yourhandle`.
3. **A fallback handle** you can enter in the popup, for layouts where both of the above fail.

From the account switcher it also learns your **display name** (the text that sits beside the handle) and the ID of your **profile photo** from its `pbs.twimg.com/profile_images/<id>/` URL. The photo ID lets it recognise your avatar anywhere on the page, even where it isn't linked to your profile.

### 3. Marking only your things

Once it knows your handle, name and photo ID, the shield scans the page for:

- links to your profile (`/yourhandle`) in post headers, the composer and replies, covering the name and handle inside them
- any avatar whose `alt`, image ID, surrounding link or container test ID belongs to you
- your profile page header (name, handle, photo and the full-size photo viewer) when you're on your own profile
- the account menu, including the other accounts listed in it
- notification and message counts in the navigation, and the body of the messages drawer
- your handle in the tab title, which is swapped for `Profile / X`, plus the leading `(3)` unread count

Other people's names and posts are left alone. The shield always marks the **smallest** element that contains the text, so it covers `@yourhandle` and not the whole post around it.

Each match gets one attribute, for example `data-xss-mask="handle"`. The shield never removes or edits X's elements; it only adds and removes that attribute, so turning it off leaves the page exactly as it was.

### 4. Covering with CSS

The chosen style lives on the root element (`data-xss-mode="hide" | "blur" | "redact"`) and `shield.css` does the covering:

| Style  | Text (name, handle, counts)        | Photo                     |
|--------|------------------------------------|---------------------------|
| Hide   | invisible, space kept so layout doesn't jump | invisible          |
| Blur   | `filter: blur()` at your chosen strength | same blur            |
| Redact | solid striped bar, text made transparent | dark silhouette      |

All covered elements also get `user-select: none`, so a stray drag or copy can't reveal them. Because covering is pure CSS, switching styles is instant and costs nothing.

### 5. Keeping up with X

X is a single-page app that constantly adds, removes and recycles elements as you scroll and navigate. The shield watches the document with a `MutationObserver` (only while it's on) and re-runs on every change, plus on in-app navigation and back/forward cache restores. Each pass builds the new set of marked elements, then only touches elements whose state actually changed, so nothing flickers and X's own rendering isn't disturbed.

### 6. Overlays that X can't touch

The "Be right back" screen and the "Shielded" tag are custom elements attached to the root of the page with a **closed shadow DOM**. X's styles and scripts can't restyle or remove what's inside them, and they don't affect X's layout.

## What it can't cover

Be honest with yourself before you go live:

- text inside images or videos, and identifying details written in your bio or post text
- browser UI such as the address bar, bookmarks or other tabs: share **just the tab** rather than the whole window or screen
- X layouts that change after this version. If something isn't covered, set a fallback handle in the popup and open an issue with a screenshot

Check your X tab and the account menu before every stream.

## Files

| File | Role |
|------|------|
| `manifest.json` | Extension manifest (Manifest V3), shortcuts and permissions |
| `settings.js` | Default settings and validation, shared by every part |
| `shield.js` | Content script: finds your identity and marks it |
| `shield.css` | The three cover styles and the startup cover |
| `background.js` | Keyboard shortcuts and the toolbar badge |
| `popup.html`, `popup.css`, `popup.js` | The popup with the live preview |

## Privacy

The only permission is `storage`. Settings stay in your browser's local extension storage. There are no network requests, analytics or remote code.
