Lecture Co-Pilot

Turn any webpage into objectives, outlines, notes, and quizzes - on-device with Chrome built-in AI.

This repository contains a Chrome Manifest V3 extension named `Lecture Co-Pilot` (version 1.0.0). The extension includes a popup UI, a content script that runs on pages, an offscreen page, and a background service worker.

## Quick facts
- Name: Lecture Co-Pilot
- Version: 1.0.0
- Manifest: `manifest.json` (Manifest V3)
- Permissions used: `activeTab`, `scripting`, `storage`, `offscreen`

## Files in this repo
- `manifest.json` — extension manifest and permissions
- `popup.html`, `popup.js` — UI shown when clicking the extension action
- `content.js` — content script injected into matching pages
- `service_worker.js` — background/service worker script (MV3)
- `offscreen.html`, `offscreen.js` — offscreen document used for long-running or DOM work
- `icons/` — extension icons (16/48/128)

## Install / Load locally
1. Open Chrome (or Chromium) and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked** and select this repository folder (the folder that contains `manifest.json`).
4. The extension should appear in the list. Click the extension icon to open the popup.

## Usage
- Click the extension icon to open the popup (`popup.html`).
- The content script (`content.js`) runs on `http://*/*` and `https://*/*` pages and can interact with the page DOM.
- Background tasks and long-running work are handled by `service_worker.js` and the offscreen document (`offscreen.html` / `offscreen.js`).

## Development notes
- Manifest v3 uses a service worker for background logic; service workers are event-driven and may be suspended when idle. Use the offscreen document for persistent DOM or long-running tasks.
- To inspect the service worker: open `chrome://extensions`, find the extension entry, click **Service worker** -> **Inspect views** (or use the Extensions panel in DevTools to inspect the service worker and offscreen page).
- Use the browser console (DevTools) on content pages to see logs from `content.js`.

## Configuration / Secrets
- `manifest.json` contains a `trial_tokens` array with placeholder tokens: do NOT commit real API keys or secrets to source control. If you need to use API keys, store them securely (for local testing keep them out of repo or use environment-managed secrets).

## Troubleshooting
- If the extension doesn't load, confirm the selected folder contains `manifest.json` and the manifest JSON is valid.
- If the action popup is blank, open the popup and inspect it (right-click in the popup and choose **Inspect**).
- For errors from the service worker, open the extension entry in `chrome://extensions` and click **Service worker** -> **Inspect** to view console and network activity.

## Contributing
- Small fixes, feature additions, or tests are welcome. If you want, tell me what feature to add next (examples: keyboard shortcuts, context menu, options page, or CI packaging).

## License
This project is released under the MIT License — see the `LICENSE` file for details.

If you'd like, I can also:
- Add a `package.json` and build scripts (if you plan to use bundlers like Vite/webpack).
- Add a small test harness or a basic developer script for reloading the extension from the command line.


