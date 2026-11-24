# Chrome Web Store listing

Copy each section into the matching field in the [Developer Dashboard](https://chrome.google.com/webstore/devconsole).

## Package

Run `python scripts/package.py` and upload `dist/stream-shield-x-<version>.zip`.

## Store listing tab

**Name** (from the manifest): Stream Shield for X

**Summary** (from the manifest description, 132 characters max):
Hide, blur or redact your name, @handle and avatar on X while screen sharing.

**Category:** Productivity

**Language:** English

**Description:**

```
Stream or share your screen on X without showing who you are.

Stream Shield covers your own display name, @handle and profile photo everywhere they appear on X: the sidebar, account menu, post headers, replies, the composer and your profile page. Other people's names and posts stay visible, so your stream still makes sense.

WHAT IT COVERS
• Your name, @handle and profile photo
• Notification and message counts, including the unread count in the tab title
• Message previews in the messages drawer

THREE STYLES
• Hide: makes them invisible without moving the layout
• Blur: adjustable strength
• Redact: solid bars and a dark silhouette

BE RIGHT BACK
Something private pop up? Press Alt+Shift+C and every X tab shows a "Be right back" screen until you uncover it.

QUICK CONTROL
• Alt+Shift+S turns the shield on or off from anywhere
• The toolbar icon shows ON while you're covered and BRB while the tab is hidden
• The popup shows a preview of what viewers see. Click a part to choose whether it's covered

PRIVATE BY DESIGN
No accounts, no tracking, no network requests. Your settings stay in your browser.

Note: Stream Shield can't cover text inside images or videos, details you've written in your bio or posts, or browser UI. Share just the browser tab for the best protection.
```

**Graphic assets** (in `store/images/`):

| Field | File |
|---|---|
| Store icon (128×128) | `icons/shield-128.png` |
| Screenshots (1280×800) | `screenshot-1.png` to `screenshot-4.png` |
| Small promo tile (440×280) | `promo-tile-440x280.png` |

**Homepage URL:** https://github.com/Abdelouahedb/stream-shield-x

**Support URL:** https://github.com/Abdelouahedb/stream-shield-x/issues

## Privacy practices tab

**Single purpose:**

```
Stream Shield for X covers the user's own name, @handle, profile photo, notification counts and message previews on x.com while they stream or share their screen.
```

**Permission justification, `storage`:**

```
Saves the user's settings (shield on or off, cover style, what to cover, and an optional fallback @handle) locally in the browser so they persist between sessions.
```

**Host permission justification, x.com and twitter.com (content script):**

```
The extension must read and style pages on x.com and twitter.com to find the user's own name, handle and photo and cover them. It runs on no other sites.
```

**Remote code:** No, I am not using remote code.

**Data usage:** tick none of the data types. Then confirm all three certifications:
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** https://github.com/Abdelouahedb/stream-shield-x/blob/main/PRIVACY.md

## Regenerating the images

The screenshots are rendered from the HTML in `store/screens/`, which loads the real popup with a stand-in for the extension APIs (`store/screens/mock.js`). Serve the repository root with `python -m http.server`, open each page at 1280×800 (the promo tile at 440×280), and take a screenshot. After changing `popup.html`, regenerate `store/screens/popup.html` so the screenshots match.
