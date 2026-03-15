# PDF AI Chat

Chrome extension that adds an AI chat sidebar to any PDF you open in the browser. Ask questions about the document and get answers with references to specific sections and pages.

## Features

- Chat with any PDF open in Chrome
- Multiple conversation threads per document
- Thinking/reasoning mode with collapsible reasoning display
- Dark/light/system theme support
- Keyboard shortcut to toggle sidebar (Cmd+E / Ctrl+E)
- Streaming responses

## Setup

1. Clone and install dependencies:

```bash
pnpm install
```

2. Run the dev server:

```bash
pnpm dev
```

3. Load the extension in Chrome:
   - Go to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `.output/chrome-mv3` directory

4. Click the extension icon and enter your OpenAI API key.

## Tech Stack

- [WXT](https://wxt.dev) (web extension framework)
- React 19 + TypeScript
- Vercel AI SDK + OpenAI
- Tailwind CSS + Radix UI
