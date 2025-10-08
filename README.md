# Lecture Co-Pilot

**Turn any webpage into objectives, outlines, notes, and quizzes — powered by on-device AI in Chrome.**

Lecture Co-Pilot is a Chrome extension designed for educators to quickly transform web content into structured teaching materials. No internet connection required for AI processing — everything runs locally on your device using Chrome's built-in AI.

## 🎯 What does it do?

- **Learning Objectives**: Auto-generate clear learning goals from any webpage
- **Course Outline**: Create structured topic breakdowns
- **Study Notes**: Extract key points and summaries
- **Quizzes**: Generate multiple-choice and short-answer questions

Perfect for teachers creating lesson plans, study guides, or assessment materials from online articles, videos, or documentation.

---

## 📋 Requirements

Before installing, make sure you have:

### 1. **Chrome Browser** (Version 128 or newer)
   - Download from [google.com/chrome](https://www.google.com/chrome/)
   - Check your version: Go to `chrome://settings/help`

### 2. **Enable Chrome AI Features**
   Open Chrome and visit `chrome://flags`, then enable:
   - Search for **"Prompt API for Gemini Nano"** → Set to **Enabled**
   - Search for **"Optimization Guide On Device Model"** → Set to **Enabled BypassPerfRequirement**
   - Click **Relaunch** to restart Chrome

### 3. **Download the AI Model**
   - Visit `chrome://components`
   - Find **"Optimization Guide On Device Model"**
   - Click **Check for update**
   - Wait for the download to complete (may take several minutes, requires ~22GB free space)

### 4. **System Requirements**
   - **Operating System**: Windows 10/11, macOS 13+, or Linux
   - **Storage**: At least 22 GB of free disk space
   - **RAM**: 8 GB or more recommended
   - **GPU**: 4 GB VRAM or more

---

## 🚀 Installation Instructions

### Step 1: Download the Extension
1. Download this repository as a ZIP file or clone it:
   ```bash
   git clone https://github.com/haider213/lecture-copilot.git
   ```
2. If downloaded as ZIP, extract it to a folder on your computer

### Step 2: Load the Extension in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the folder containing the extension files (the one with `manifest.json`)
5. The extension icon should appear in your Chrome toolbar

### Step 3: Verify Installation
1. Click the Lecture Co-Pilot icon in your toolbar
2. You should see the popup interface
3. If you see any errors about AI availability, check that you completed the Requirements section above

---

## 📖 How to Use

### Basic Workflow:
1. **Navigate to any webpage** with educational content (article, blog post, documentation, etc.)
2. **Click the Lecture Co-Pilot icon** in your toolbar
3. **Choose what you want to generate:**
   - Click **"Read Page"** to extract text from the current page
   - Click **"Summarize"** for a quick summary
   - Click **"Prompt/Quiz"** to generate full teaching materials (objectives, outline, notes, and quiz)
4. **Wait for processing** — the first time may take longer as the AI model downloads
5. **Copy or save the results** for your lesson plans

### Tips for Best Results:
- Works best with text-heavy pages (articles, documentation, educational content)
- May not work on restricted pages (Chrome settings, browser internal pages)
- For longer articles, the AI will process the full content automatically
- Generated quizzes include both multiple-choice and short-answer questions

---

## 🛠️ Troubleshooting

### "Prompt API not available" error
- **Check Chrome version**: Must be 128 or newer (`chrome://settings/help`)
- **Enable flags**: Visit `chrome://flags` and enable the AI features (see Requirements)
- **Download model**: Visit `chrome://components` and update "Optimization Guide On Device Model"
- **Restart Chrome** after making changes

### "Summarizer model is not available"
- Visit `chrome://components`
- Find **"Optimization Guide On Device Model"**
- Click **Check for update** and wait for download
- Ensure you have at least 22 GB free disk space

### Extension icon not showing
- Go to `chrome://extensions/`
- Ensure the extension is **Enabled** (toggle on the right)
- Click the puzzle piece icon in Chrome toolbar, then pin Lecture Co-Pilot

### Blank popup or no response
- Right-click the popup and select **Inspect** to see console errors
- Check that the webpage allows content script access (won't work on `chrome://` pages)
- Reload the extension: Go to `chrome://extensions/`, find Lecture Co-Pilot, click the refresh icon

### Model download stuck or failed
- Check your internet connection (unmetered connection recommended)
- Ensure you have sufficient disk space (22+ GB)
- Try clicking **Check for update** again in `chrome://components`
- If download fails repeatedly, try clearing Chrome cache and restarting

---

## 🔒 Privacy & Data

- **All processing happens on your device** — no data is sent to external servers
- **No internet required** for AI features after model download
- **No tracking or analytics** — your teaching materials stay private
- The extension only accesses the current webpage when you click "Read Page"

---

## 📁 Files in This Extension

- `manifest.json` — Extension configuration and permissions
- `popup.html`, `popup.js` — User interface and main functionality
- `content.js` — Script that reads webpage content
- `service_worker.js` — Background processes
- `offscreen.html`, `offscreen.js` — Handles long-running AI tasks
- `icons/` — Extension icons (16px, 48px, 128px)

---

## 🤝 For Developers

### Local Development
1. Make changes to any `.js` or `.html` files
2. Go to `chrome://extensions/`
3. Click the **refresh icon** on the Lecture Co-Pilot card
4. Test your changes

### Debugging
- **Popup issues**: Right-click popup → Inspect
- **Content script**: Open DevTools on the webpage → Console tab
- **Service worker**: `chrome://extensions/` → Service worker → Inspect

### Security Note
- The `trial_tokens` in `manifest.json` are for Chrome's AI origin trial
- These tokens are extension-specific and not secret, but don't share your extension ID publicly
- For production, obtain your own trial token from [Chrome Origin Trials](https://developer.chrome.com/origintrials/)

---

## 📝 License

This project is released under the MIT License.

---

## 💡 Tips for Teachers

- **Batch Process**: Open multiple tabs and generate materials for several lessons at once
- **Customize Results**: Use generated content as a starting point, then edit to match your teaching style
- **Accessibility**: The summarize feature can help create simplified versions of complex content
- **Quiz Bank**: Generate questions from various sources to build comprehensive assessments
- **Flipped Classroom**: Create pre-class materials from videos or articles for student review

---

## ❓ Need Help?

If you encounter issues not covered in Troubleshooting:
1. Check the [Chrome AI documentation](https://developer.chrome.com/docs/ai/built-in)
2. Verify all Requirements are met
3. Try removing and re-installing the extension
4. Open an issue on GitHub with error details from the console

**Happy Teaching! 📚✨**


