# Stream Shield for X

Hide, blur or redact your display name, @handle, and avatar while sharing an X tab. The extension supports the redesigned X layout and includes selectors for the older layout. It runs on x.com and twitter.com.

## Install on Edge or Chrome

1. Extract the ZIP. Keep the extracted folder somewhere you can leave it.
2. Open `edge://extensions` in Edge or `chrome://extensions` in Chrome.
3. Turn on **Developer mode**, select **Load unpacked**, and choose the folder containing `manifest.json`.
4. Turn off the old **X Privacy** extension if it is still enabled. Refresh X.
5. Open **Stream Shield for X** from your extensions toolbar. Turn on the shield and choose **Hide**, **Blur** or **Redact**.

## Features

- **Preview of what viewers see.** The popup shows a mock X post. Click your photo, name, handle or the notification count to choose what gets covered, and see the result in the style you picked.
- **Three cover styles**: Hide, Blur (adjustable strength) and Redact.
- **Counts and messages**: covers notification and message counts (including the count in the tab title) and the messages drawer previews.
- **Cover the whole tab**: one click or `Alt+Shift+C` puts a "Be right back" screen over every X tab. Press it again to uncover.
- **Keyboard shortcut**: `Alt+Shift+S` turns the shield on or off. Change shortcuts at `edge://extensions/shortcuts` or `chrome://extensions/shortcuts`.
- **Toolbar badge**: the icon shows **ON** while the shield is on and **BRB** while the tab is covered.
- **Optional "Shielded" tag** in the corner of X.

## Use it while sharing

- **Hide** is the default mask style. The shield starts off and remembers your choices after you turn it on.
- The shield targets identity elements in the sidebar, account menu, post headers, composer, and profile header. Other people's post headers remain visible. The account menu also masks identities of other accounts listed there.
- Check the X tab and the account menu before sharing. Share just the browser tab if the address bar or link previews could expose your handle. The shield can’t cover text embedded in images or videos, identifying details in your bio or post text, or browser UI.
- If account detection fails, set a **Fallback @handle** in the popup. The extension stores preferences locally and sends no data.
