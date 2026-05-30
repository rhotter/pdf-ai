import { createOpenAI } from "@ai-sdk/openai";
import { generateText, streamText } from "ai";
import { getModelOption, PORT_NAME } from "@/lib/constants";
import type {
  ChatMessage,
  ToBackgroundMessage,
  ToContentMessage,
} from "@/lib/messages";

export default defineBackground(() => {
  // Track side panel open state via lifecycle port
  let sidePanelPort: chrome.runtime.Port | null = null;
  const sidePanelTabSyncPorts = new Set<chrome.runtime.Port>();

  function notifySidePanelsTabChanged() {
    for (const port of sidePanelTabSyncPorts) {
      try {
        port.postMessage({ type: "active-tab-changed" });
      } catch {
        sidePanelTabSyncPorts.delete(port);
      }
    }
  }

  async function closeSidePanel(tabId: number, windowId: number) {
    const sidePanel = chrome.sidePanel as typeof chrome.sidePanel & {
      close?: (options: { tabId?: number; windowId?: number }) => Promise<void>;
    };

    if (sidePanel.close) {
      await sidePanel.close({ windowId });
      return;
    }

    await chrome.sidePanel.setOptions({ tabId, enabled: false });
    await chrome.sidePanel.setOptions({
      tabId,
      path: "sidepanel.html",
      enabled: true,
    });
  }

  async function openSidePanel(tabId: number) {
    // Keep open() first: Chrome requires it to be called directly from the user gesture chain.
    await chrome.sidePanel.open({ tabId });
    await chrome.sidePanel.setOptions({
      tabId,
      path: "sidepanel.html",
      enabled: true,
    });
  }

  // Toggle side panel on extension icon click or Cmd+E (_execute_action)
  chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.id || !tab.windowId) return;

    try {
      if (sidePanelPort) {
        await closeSidePanel(tab.id, tab.windowId);
      } else {
        await openSidePanel(tab.id);
      }
    } catch (error) {
      console.error("Failed to toggle side panel", error);
    }
  });

  // Handle toggle requests from content script (FAB click or Cmd+E fallback)
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type !== "open-side-panel") return;

    const tabId = sender.tab?.id;
    const windowId = sender.tab?.windowId;

    if (!tabId || !windowId) {
      sendResponse({ ok: false, error: "No sender tab found" });
      return;
    }

    openSidePanel(tabId)
      .then(() => sendResponse({ ok: true }))
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : "Failed to open side panel";
        console.error("Failed to open side panel", error);
        sendResponse({ ok: false, error: message });
      });

    return true;
  });

  // Side panel connects on mount, disconnects on close
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name === "sidepanel-lifecycle") {
      sidePanelPort = port;
      port.onDisconnect.addListener(() => {
        sidePanelPort = null;
      });
    }

    if (port.name === "sidepanel-tab-sync") {
      sidePanelTabSyncPorts.add(port);
      port.onDisconnect.addListener(() => {
        sidePanelTabSyncPorts.delete(port);
      });
    }
  });

  chrome.tabs.onActivated.addListener(() => {
    notifySidePanelsTabChanged();
  });

  chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
    if (changeInfo.url) {
      notifySidePanelsTabChanged();
    }
  });

  // Streaming chat handler
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== PORT_NAME) return;

    let abortController: AbortController | null = null;

    port.onMessage.addListener(async (msg: ToBackgroundMessage) => {
      if (msg.type === "chat-abort") {
        abortController?.abort();
        return;
      }

      if (msg.type !== "chat-start") return;

      const { messages, pdfBase64, apiKey, modelMode } = msg;
      abortController = new AbortController();

      try {
        const openai = createOpenAI({ apiKey });
        const modelOption = getModelOption(modelMode);

        // Build messages: first user message includes the PDF
        const aiMessages = messages.map((m: ChatMessage, i: number) => {
          if (m.role === "user" && i === 0) {
            return {
              role: "user" as const,
              content: [
                {
                  type: "file" as const,
                  data: pdfBase64,
                  mediaType: "application/pdf" as const,
                },
                { type: "text" as const, text: m.content },
              ],
            };
          }
          return {
            role: m.role as "user" | "assistant",
            content: m.content,
          };
        });

        const system = `You are a helpful assistant that answers questions about the provided PDF document. Be concise and accurate.

When referencing information from the PDF, cite the page number and a short relevant quote using this exact markdown link format:

[p. X](#page=X "short quote from the PDF")

Example: "The company performed well [p. 3](#page=3 "revenue grew by 15% year-over-year") despite rising costs [p. 7](#page=7 "operating expenses increased to $4.2M")."

Rules:
- Always cite when stating facts or specific details from the document.
- Keep quotes short (under ~60 characters) — just enough to locate the text on the page.
- The quote must be verbatim text from the PDF.`;

        const reasoningEffort =
          "reasoningEffort" in modelOption
            ? modelOption.reasoningEffort
            : undefined;

        const providerOptions = reasoningEffort
          ? {
              openai: {
                reasoningEffort,
              },
            }
          : undefined;

        if (!modelOption.streaming) {
          const result = await generateText({
            model: openai(modelOption.modelId),
            messages: aiMessages,
            abortSignal: abortController.signal,
            system,
            ...(providerOptions ? { providerOptions } : {}),
          });

          if (!safeSend({ type: "chat-delta", delta: result.text })) return;
          safeSend({ type: "chat-done" });
          return;
        }

        const result = streamText({
          model: openai(modelOption.modelId),
          messages: aiMessages,
          abortSignal: abortController.signal,
          system,
          ...(providerOptions ? { providerOptions } : {}),
        });

        function safeSend(msg: ToContentMessage) {
          try {
            port.postMessage(msg);
            return true;
          } catch {
            abortController?.abort();
            return false;
          }
        }

        for await (const part of result.fullStream) {
          if (part.type === "text-delta") {
            if (!safeSend({ type: "chat-delta", delta: part.text })) return;
          } else if (part.type === "reasoning-delta") {
            if (!safeSend({ type: "chat-reasoning", delta: part.text }))
              return;
          }
        }

        safeSend({ type: "chat-done" });
      } catch (err: unknown) {
        if (abortController.signal.aborted) return;

        const errorMsg =
          err instanceof Error ? err.message : "Unknown error occurred";
        try {
          port.postMessage({
            type: "chat-error",
            error: errorMsg,
          } satisfies ToContentMessage);
        } catch {
          // Port disconnected
        }
      }
    });

    port.onDisconnect.addListener(() => {
      abortController?.abort();
    });
  });
});
