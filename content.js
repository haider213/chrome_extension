// Prove injection & provide GET_TEXT / PING
console.log("Lecture Co-Pilot content script active on", location.href);

chrome.runtime.onMessage.addListener((msg, _s, send) => {
  try {
    if (!msg?.type) return;

    if (msg.type === "PING") { send({ ok: true }); return; }

    if (msg.type === "GET_TEXT") {
      const sel = window.getSelection()?.toString().trim();
      const text = (sel && sel.length > 50)
        ? sel
        : (document.body?.innerText || document.documentElement.innerText || "");
      send({ text });
      return;
    }
  } catch (e) {
    send({ error: String(e) });
  }
});
