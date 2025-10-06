const out = document.getElementById("out");
const note = document.getElementById("note");
const btnRead = document.getElementById("read");
const btnSummarize = document.getElementById("summarize");
const btnOutline = document.getElementById("outline");
const btnJSON = document.getElementById("make-json");
const btnDetect = document.getElementById("detect");
const btnTranslate = document.getElementById("translate");
const btnProofread = document.getElementById("proofread");

const sumType = document.getElementById("sumType");
const sumLength = document.getElementById("sumLength");
const sumFormat = document.getElementById("sumFormat");
const targetLangSel = document.getElementById("targetLang");

function show(msg) {
  out.textContent = typeof msg === "string" ? msg : JSON.stringify(msg, null, 2);
}
function tip(msg) {
  note.textContent = msg || "";
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function isRestricted(url) {
  const allowFile = await (chrome.extension.isAllowedFileSchemeAccess?.() ?? Promise.resolve(false));
  return url.startsWith("chrome://") ||
         url.startsWith("chrome-extension://") ||
         url.startsWith("edge://") ||
         url.startsWith("about:") ||
         url.startsWith("https://chrome.google.com/webstore/") ||
         (url.startsWith("file://") && !allowFile);
}

async function ensureContentScript(tabId) {
  if (!chrome.scripting) throw new Error('chrome.scripting unavailable — add "scripting" permission or update Chrome.');
  // Fallback-safe: execute always so listener exists NOW
  await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
}

// ---- Read page text
async function readText() {
  const tab = await getActiveTab();
  if (!tab?.id) return show("No active tab");
  if (await isRestricted(tab.url || "")) return show(`Can't access: ${tab.url}`);

  await ensureContentScript(tab.id);
  await chrome.tabs.sendMessage(tab.id, { type: "PING" }).catch(() => {});
  const res = await chrome.tabs.sendMessage(tab.id, { type: "GET_TEXT" });
  const text = (res?.text || "").trim();
  return text;
}

// ---- Summarizer (built-in, on-device)  ───────────────────────────────
// Docs: availability() -> create({ monitor }) -> summarize()
// Types: 'key-points' | 'tldr' | 'teaser' | 'headline'
// Lengths: 'short' | 'medium' | 'long'; Formats: 'markdown' | 'plain-text'
async function summarizeWithBuiltInAI(text, { type, length, format }) {
  if (!("Summarizer" in self)) throw new Error("Summarizer API not supported in this Chrome.");
  const avail = await Summarizer.availability();
  if (avail === "unavailable") throw new Error("Summarizer model unavailable on this device.");

  const summarizer = await Summarizer.create({
    sharedContext: "This is web page text for teaching.",
    type, length, format,
    monitor(m) {
      m.addEventListener("downloadprogress", (e) => {
        tip(`Downloading model… ${Math.round(e.loaded * 100)}%`);
      });
    }
  });

  const out = await summarizer.summarize(text);
  summarizer.destroy();
  tip("");
  return out;
}

// ---- Prompt API (Extensions) — structured JSON  ──────────────────────
// Requires origin-trial token in manifest. We'll feature-detect.
async function promptForTeachingJSON(text) {
  if (!("LanguageModel" in self)) throw new Error("Prompt API not supported or origin trial missing.");
  const availability = await LanguageModel.availability?.();
  if (availability === "unavailable") throw new Error("Language model unavailable.");

  const session = await LanguageModel.create({
    initialPrompts: [{
      role: "system",
      content:
        "You are Lecture Co-Pilot. Given page text, return compact JSON only:\n" +
        "{ objectives: string[], outline: string[], notes: string[], quiz: { mcq: {q:string, a:string[], correct:number}[], short: {q:string}[] } }"
    }]
  });

  const schema = {
    type: "object",
    required: ["objectives", "outline", "notes", "quiz"],
    properties: {
      objectives: { type: "array", items: { type: "string" } },
      outline: { type: "array", items: { type: "string" } },
      notes: { type: "array", items: { type: "string" } },
      quiz: {
        type: "object",
        required: ["mcq", "short"],
        properties: {
          mcq: {
            type: "array",
            items: {
              type: "object",
              required: ["q", "a", "correct"],
              properties: {
                q: { type: "string" },
                a: { type: "array", items: { type: "string" }, minItems: 2 },
                correct: { type: "integer", minimum: 0 }
              }
            }
          },
          short: {
            type: "array",
            items: { type: "object", required: ["q"], properties: { q: { type: "string" } } }
          }
        }
      }
    }
  };

  const { response } = await session.prompt({
    messages: [{ role: "user", content: `Page text:\n${text}\nReturn JSON only.` }],
    responseConstraint: { type: "json_schema", value: schema }
  });
  return JSON.parse(response);
}

// ---- Translator + Language Detector  ─────────────────────────────────
async function detectLanguage(text) {
  if (!("LanguageDetector" in self)) throw new Error("Language Detector API not supported.");
  const detector = await LanguageDetector.create({
    monitor(m) { m.addEventListener("downloadprogress", e => tip(`Lang model… ${Math.round(e.loaded*100)}%`)); }
  });
  const results = await detector.detect(text);
  tip("");
  return results; // ranked list
}

async function translateText(text, source, target) {
  if (!("Translator" in self)) throw new Error("Translator API not supported.");
  const translator = await Translator.create({
    sourceLanguage: source || "auto",
    targetLanguage: target,
    monitor(m) { m.addEventListener("downloadprogress", e => tip(`Trans model… ${Math.round(e.loaded*100)}%`)); }
  });
  const out = await translator.translate(text);
  tip("");
  return out;
}

// ---- Proofreader (origin trial)  ─────────────────────────────────────
async function proofreadText(text) {
  if (!("Proofreader" in self)) throw new Error("Proofreader API not available (needs origin trial).");
  const proofreader = await Proofreader.create({
    expectedInputLanguages: ["en"],
    monitor(m) { m.addEventListener("downloadprogress", e => tip(`Proofreader… ${Math.round(e.loaded*100)}%`)); }
  });
  const result = await proofreader.proofread(text);
  tip("");
  // Simple rendering: corrected text + count of corrections
  const corrected = result.corrected ?? text;
  const count = (result.corrections || []).length;
  return `✅ Corrected (${count} changes):\n\n${corrected}`;
}

// ─── UI handlers ──────────────────────────────────────────────────────
btnRead.addEventListener("click", async () => {
  try {
    const text = await readText();
    show(text ? text.slice(0, 800) + "\n…" : "No text found.");
  } catch (e) { show(`Read failed: ${e?.message || e}`); }
});

btnSummarize.addEventListener("click", async () => {
  try {
    const text = await readText();
    if (!text) return show("No text to summarize.");
    const sum = await summarizeWithBuiltInAI(text, {
      type: sumType.value,
      length: sumLength.value,
      format: sumFormat.value
    });
    show(sum);
  } catch (e) { show(`Summarize failed: ${e?.message || e}`); }
});

btnOutline.addEventListener("click", async () => {
  try {
    const text = await readText();
    if (!text) return show("No text.");
    // quick heuristic: ask Summarizer for headline/teaser then key-points
    const head = await summarizeWithBuiltInAI(text, { type: "headline", length: "short", format: "plain-text" });
    const points = await summarizeWithBuiltInAI(text, { type: "key-points", length: "medium", format: "markdown" });
    show(`# ${head}\n\n${points}`);
  } catch (e) { show(`Outline failed: ${e?.message || e}`); }
});

btnJSON.addEventListener("click", async () => {
  try {
    const text = await readText();
    if (!text) return show("No text.");
    const json = await promptForTeachingJSON(text);
    show(json);
  } catch (e) { show(`Prompt failed: ${e?.message || e}`); }
});

btnDetect.addEventListener("click", async () => {
  try {
    const text = await readText();
    if (!text) return show("No text.");
    const det = await detectLanguage(text);
    show(det);
  } catch (e) { show(`Detect failed: ${e?.message || e}`); }
});

btnTranslate.addEventListener("click", async () => {
  try {
    const text = await readText();
    if (!text) return show("No text.");
    let src = "auto";
    try {
      const det = await detectLanguage(text);
      src = det?.[0]?.detectedLanguage || "auto";
    } catch {}
    const tgt = targetLangSel.value;
    const tr = await translateText(text, src, tgt);
    show(tr);
  } catch (e) { show(`Translate failed: ${e?.message || e}`); }
});

btnProofread.addEventListener("click", async () => {
  try {
    const text = await readText();
    if (!text) return show("No text.");
    const res = await proofreadText(text);
    show(res);
  } catch (e) { show(`Proofread failed: ${e?.message || e}`); }
});
