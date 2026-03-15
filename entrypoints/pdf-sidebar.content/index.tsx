import ReactDOM from "react-dom/client";
import { isPdfPage } from "@/lib/pdf-detection";
import App from "./App";
import "./style.css";

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",

  async main(ctx) {
    if (!isPdfPage()) return;

    // Toggle callback — set by the React app once mounted
    let onToggle: (() => void) | null = null;

    // Dedup toggle calls from chrome.commands and direct keydown within
    // the same key-press (50ms window — imperceptible to humans).
    let lastToggle = 0;
    function toggle() {
      const now = Date.now();
      if (now - lastToggle < 50) return;
      lastToggle = now;
      onToggle?.();
    }

    // Listen for toggle command from background (chrome.commands API).
    // This is the primary path when the PDF embed has focus.
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg?.type === "toggle-sidebar") {
        toggle();
      }
    });

    // Direct keyboard listener as fallback — chrome.commands can fail on
    // PDF pages until the page has received user interaction.
    document.addEventListener("keydown", (e) => {
      const modifier = navigator.platform.includes("Mac")
        ? e.metaKey
        : e.ctrlKey;
      if (modifier && e.key === "e") {
        e.preventDefault();
        toggle();
      }
    });

    const ui = await createShadowRootUi(ctx, {
      name: "pdf-ai-sidebar",
      position: "overlay",
      isolateEvents: ["keydown", "keyup", "keypress"],
      onMount(container) {
        const wrapper = container.parentElement;
        if (wrapper) {
          wrapper.style.pointerEvents = "none";
        }
        container.style.pointerEvents = "none";

        const root = ReactDOM.createRoot(container);
        root.render(
          <App
            shadowRoot={container.getRootNode() as ShadowRoot}
            registerToggle={(fn) => {
              onToggle = fn;
            }}
          />,
        );
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });

    ui.mount();
  },
});
