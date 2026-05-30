import { useState } from "react";
import ReactDOM from "react-dom/client";
import { isPdfPage, fetchPdfAsBase64 } from "@/lib/pdf-detection";

type OpenSidePanelResponse =
  | { ok: true }
  | { ok: false; error: string };

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",

  async main(ctx) {
    if (!isPdfPage()) return;

    // Notify background that this tab has a PDF
    chrome.runtime.sendMessage({ type: "pdf-detected" }).catch(() => {});

    // Listen for messages from the side panel / background
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg?.type === "get-pdf") {
        fetchPdfAsBase64()
          .then((pdfBase64) => sendResponse({ pdfBase64 }))
          .catch((err) =>
            sendResponse({ error: err instanceof Error ? err.message : "Failed to fetch PDF" }),
          );
        return true;
      }

      if (msg?.type === "navigate-to-page") {
        const page = msg.page;
        window.location.hash = `page=${page}`;
        window.location.reload();
        return;
      }

      if (msg?.type === "ping") {
        sendResponse({ pong: true });
        return;
      }
    });

    // Fallback keyboard listener for Cmd+E
    window.addEventListener("keydown", (e) => {
      const modifier = navigator.platform.includes("Mac")
        ? e.metaKey
        : e.ctrlKey;
      if (modifier && e.key === "e") {
        e.preventDefault();
        e.stopPropagation();
        chrome.runtime.sendMessage({ type: "open-side-panel" }).catch(() => {});
      }
    }, true);

    // Inject FAB using shadow root overlay (required for Chrome's PDF viewer)
    const SHORTCUT_LABEL = navigator.platform.includes("Mac") ? "⌘E" : "Ctrl+E";

    const ui = await createShadowRootUi(ctx, {
      name: "pdf-ai-fab",
      position: "overlay",
      isolateEvents: ["click", "mousedown", "mouseup", "pointerdown", "pointerup", "mouseenter", "mouseleave"],
      onMount(container) {
        const wrapper = container.parentElement;
        if (wrapper) wrapper.style.pointerEvents = "none";
        container.style.pointerEvents = "none";

        const root = ReactDOM.createRoot(container);
        root.render(<Fab shortcutLabel={SHORTCUT_LABEL} />);
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });

    ui.mount();
  },
});

function Fab({ shortcutLabel }: { shortcutLabel: string }) {
  const [error, setError] = useState<string | null>(null);

  function openSidePanel() {
    setError(null);
    chrome.runtime.sendMessage(
      { type: "open-side-panel" },
      (response?: OpenSidePanelResponse) => {
        const errorMessage = chrome.runtime.lastError?.message;
        const responseError =
          response?.ok === false ? response.error : undefined;

        if (errorMessage || responseError) {
          setError(errorMessage ?? responseError ?? "Failed to open chat");
        }
      },
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 2147483647,
        display: "flex",
        alignItems: "center",
        gap: 8,
        pointerEvents: "auto",
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      }}
    >
      <style>{`
        .pdf-ai-fab-tooltip {
          display: none;
          background: #1f2937;
          color: #f9fafb;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 12px;
          white-space: nowrap;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }
        .pdf-ai-fab-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: none;
          background: #18181b;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          transition: background 0.15s;
        }
        .pdf-ai-fab-btn:hover {
          background: #27272a;
        }
        .pdf-ai-fab-btn:hover + .pdf-ai-fab-tooltip,
        .pdf-ai-fab-wrap:hover .pdf-ai-fab-tooltip {
          display: block;
        }
      `}</style>
      <div className="pdf-ai-fab-wrap" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div className="pdf-ai-fab-tooltip">
          {error ? (
            "Use the extension icon to open chat"
          ) : (
            <>
              Chat with PDF{" "}
              <kbd style={{ marginLeft: 6, background: "#374151", padding: "2px 5px", borderRadius: 4, fontSize: 10, fontFamily: "monospace" }}>
                {shortcutLabel}
              </kbd>
            </>
          )}
        </div>
        <button
          className="pdf-ai-fab-btn"
          aria-label="Open PDF Chat"
          onClick={openSidePanel}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
