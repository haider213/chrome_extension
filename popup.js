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
function getOutputLanguage() {
  const v = document.getElementById('outLang')?.value?.toLowerCase?.() || 'en';
  return ['en','es','ja'].includes(v) ? v : 'en';
}

async function summarizeWithBuiltInAI(text, { type, length, format }) {
  if (!("Summarizer" in self)) throw new Error("Summarizer API not supported in this Chrome.");

  const avail = await Summarizer.availability();
  if (avail === "no") throw new Error("Summarizer model is not available on this device.");
  if (avail === "after-download") tip("Summarizer model will be downloaded...");

  const lang = getOutputLanguage();

  const summarizer = await Summarizer.create({
    sharedContext: "This is web page text for teaching.",
    type,
    length,
    format,
    monitor(m) {
      m.addEventListener("downloadprogress", (e) => {
        tip(`Downloading summarizer model… ${Math.round(e.loaded * 100)}%`);
      });
    }
  });

  let out;
  try {
    out = await summarizer.summarize(text, { outputLanguage: lang });
  } finally {
    summarizer.destroy();
    tip("");
  }
  return out;
}

// ---- Prompt API (Extensions) — structured JSON  ──────────────────────
async function promptForTeachingJSON(text) {
  // 0) Check multiple ways the API might be available
  const hasLanguageModel = 'LanguageModel' in self;
  const hasAI = 'ai' in self && self.ai?.languageModel;
  const hasChrome = chrome?.aiOriginTrial?.languageModel;
  
  if (!hasLanguageModel && !hasAI && !hasChrome) {
    throw new Error(
      'Prompt API not available. Please:\n' +
      '1. Use Chrome 128+\n' +
      '2. Enable chrome://flags/#prompt-api-for-gemini-nano\n' +
      '3. Enable chrome://flags/#optimization-guide-on-device-model\n' +
      '4. Download model at chrome://components'
    );
  }

  // Try different API access methods
  let LanguageModelAPI;
  if (hasLanguageModel) {
    LanguageModelAPI = self.LanguageModel;
  } else if (hasAI) {
    LanguageModelAPI = self.ai.languageModel;
  } else if (hasChrome) {
    LanguageModelAPI = chrome.aiOriginTrial.languageModel;
  }

  // 1) Decide languages - outputs must be 'en' | 'es' | 'ja'
  const inLangs  = ['en'];
  const outLangs = ['en'];

  // 2) Check availability with the SAME options you'll pass to create()
  let availability;
  try {
    availability = await LanguageModelAPI.capabilities();
    if (!availability || availability.available === 'no') {
      throw new Error('Language model unavailable. Check chrome://components for "Optimization Guide On Device Model"');
    }
  } catch (err) {
    // Fallback to old API
    availability = await LanguageModelAPI.availability({
      expectedInputs:  [{ type: 'text', languages: inLangs }],
      expectedOutputs: [{ type: 'text', languages: outLangs }]
    });
    
    if (availability === 'no') {
      throw new Error('Language model unavailable for chosen languages.');
    }
  }
  
  if (availability === 'after-download' || availability.available === 'after-download') {
    tip('Language model will be downloaded...');
  }

  // 3) Create session - try new API first, then fallback
  let session;
  try {
    // New API (Chrome 128+)
    session = await LanguageModelAPI.create({
      systemPrompt: 'You are Lecture Co-Pilot. Return JSON ONLY matching this schema. No prose, no markdown, just valid JSON:\n' +
                   '{ "objectives": ["string"], "outline": ["string"], "notes": ["string"], "quiz": { "mcq": [{"q":"string", "a":["string"], "correct":0}], "short": [{"q":"string"}] } }'
    });
  } catch (err) {
    // Fallback to old API with initialPrompts
    session = await LanguageModelAPI.create({
      expectedInputs:  [{ type: 'text', languages: inLangs }],
      expectedOutputs: [{ type: 'text', languages: outLangs }],
      initialPrompts: [{
        role: 'system',
        content: 'You are Lecture Co-Pilot. Return JSON ONLY matching this schema. No prose, no markdown, just valid JSON:\n' +
                 '{ "objectives": ["string"], "outline": ["string"], "notes": ["string"], "quiz": { "mcq": [{"q":"string", "a":["string"], "correct":0}], "short": [{"q":"string"}] } }'
      }],
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          tip(`Downloading language model… ${Math.round(e.loaded*100)}%`);
        });
      }
    });
  }

  // 4) Define the JSON schema for structured output
  const schema = {
    type: "object",
    required: ["objectives", "outline", "notes", "quiz"],
    properties: {
      objectives: { 
        type: "array", 
        items: { type: "string" } 
      },
      outline: { 
        type: "array", 
        items: { type: "string" } 
      },
      notes: { 
        type: "array", 
        items: { type: "string" } 
      },
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
                a: { 
                  type: "array", 
                  items: { type: "string" }, 
                  minItems: 2 
                },
                correct: { 
                  type: "integer", 
                  minimum: 0 
                }
              }
            }
          },
          short: {
            type: "array",
            items: { 
              type: "object", 
              required: ["q"], 
              properties: { 
                q: { type: "string" } 
              } 
            }
          }
        }
      }
    }
  };

  // 5) Prompt with structured output
  let result;
  try {
    // Try with responseConstraint (newer API)
    result = await session.prompt(
      `Create educational objectives, outline, notes, and quiz from this page text:\n\n${text}`,
      {
        responseConstraint: { type: 'json_schema', value: schema }
      }
    );
  } catch (err) {
    // Fallback: prompt without constraint, extract JSON manually
    result = await session.prompt(
      `Create educational objectives, outline, notes, and quiz from this page text. Return ONLY valid JSON matching this exact structure:\n` +
      `{ "objectives": ["string"], "outline": ["string"], "notes": ["string"], "quiz": { "mcq": [{"q":"string", "a":["option1","option2"], "correct":0}], "short": [{"q":"string"}] } }\n\n` +
      `Page text:\n${text}`
    );
  }
  
  session.destroy();
  tip('');
  
  if (!result) {
    throw new Error("No response from language model");
  }
  
  // Extract JSON if wrapped in markdown
  let jsonText = result.trim();
  const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1];
  }
  
  // Parse and return JSON
  return JSON.parse(jsonText);
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

// ---- Teaching JSON -> Markdown formatter and copy helper  ────────────
function toTeacherMarkdown(data, opts = {}) {
  const title = (opts.title || 'Lesson Plan').trim();

  const esc = (s) => String(s ?? '').toString().trim();
  const arr = (v) => Array.isArray(v) ? v : (v ? [v] : []);
  const bullets = (items) => arr(items).filter(Boolean).map(i => `- ${esc(i)}`).join('\n');
  const numbers = (items) => arr(items).filter(Boolean).map((i, idx) => `${idx + 1}) ${esc(i)}`).join('\n');

  // MCQ formatting
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const mcqLines = arr(data?.quiz?.mcq).map((qObj, qi) => {
    const q = esc(qObj?.q);
    const answers = arr(qObj?.a).map((a, i) => `   ${letters[i]}) ${esc(a)}`).join('\n');
    // Handle either index (number) or text (string) for 'correct'
    let correctLabel = '';
    if (typeof qObj?.correct === 'number') {
      correctLabel = letters[qObj.correct] || '';
    } else if (typeof qObj?.correct === 'string') {
      const idx = arr(qObj.a).findIndex(x => String(x).trim().toLowerCase() === String(qObj.correct).trim().toLowerCase());
      correctLabel = idx >= 0 ? letters[idx] : qObj.correct;
    }
    const answerLine = correctLabel ? `Answer: ${correctLabel}` : '';
    return [`${qi + 1}. ${q}`, answers, answerLine].filter(Boolean).join('\n');
  }).join('\n\n');

  // Short answers formatting
  const shortLines = arr(data?.quiz?.short).map((qObj, qi) => {
    const q = esc(qObj?.q);
    const ans = qObj?.correct ? `Answer: ${esc(qObj.correct)}` : '';
    return [`${qi + 1}. ${q}`, ans].filter(Boolean).join('\n');
  }).join('\n\n');

  return [
    `Lesson Plan: ${title}`,
    '',
    'Learning Objectives',
    bullets(data?.objectives),
    '',
    'Outline',
    numbers(data?.outline),
    '',
    'Instructor Notes',
    bullets(data?.notes),
    '',
    'Quiz — Multiple Choice',
    mcqLines || '- (none)',
    '',
    'Quiz — Short Answer',
    shortLines || '- (none)'
  ].join('\n');
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    tip('Copied to clipboard');
  } catch (_) {
    // Fallback for environments without clipboard permission
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); tip('Copied to clipboard'); } catch {}
    document.body.removeChild(ta);
  }
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

    // Render markdown for teachers and copy it
    const md = toTeacherMarkdown(json, { title: document.title || 'Webpage' });
    show(md);
    await copyToClipboard(md);
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
