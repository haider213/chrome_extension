// Very light normalization (no external libs to keep CSP simple)
chrome.runtime.onMessage.addListener((msg, _s, send) => {
  if (msg?.type !== "CLEAN_TEXT") return;
  const text = String(msg.text || "")
    .replace(/\s+\n/g, "\n")      // trim extra spaces before newlines
    .replace(/\n{3,}/g, "\n\n")   // collapse too many newlines
    .trim();
  send({ text });
});
