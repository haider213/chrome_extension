// Optional: create an offscreen document on demand for any DOM-heavy cleaning.
async function ensureOffscreen() {
  const has = await chrome.offscreen.hasDocument?.();
  if (!has) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["DOM_PARSER"],
      justification: "Optional text normalization and HTML-to-text fallback"
    });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("Lecture Co-Pilot installed");
});

// Example pass-through for optional TEXT normalization offscreen
chrome.runtime.onMessage.addListener((msg, _s, send) => {
  (async () => {
    if (msg?.type === "CLEAN_TEXT") {
      await ensureOffscreen();
      // forward to offscreen; offscreen replies with send({text})
      chrome.runtime.sendMessage({ type: "CLEAN_TEXT", text: msg.text }, send);
    }
  })();
  return true; // keep channel open for async
});
