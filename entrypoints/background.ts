import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { MODEL_ID, PORT_NAME } from "@/lib/constants";
import type {
  ChatMessage,
  ToBackgroundMessage,
  ToContentMessage,
} from "@/lib/messages";

export default defineBackground(() => {
  // Forward keyboard shortcut command to active tab's content script
  chrome.commands.onCommand.addListener(async (command) => {
    if (command === "toggle-sidebar") {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: "toggle-sidebar" }).catch(() => {
          // Content script not ready — ignored, direct keydown listener handles this case
        });
      }
    }
  });

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

        const result = streamText({
          model: openai(MODEL_ID),
          messages: aiMessages,
          abortSignal: abortController.signal,
          system:
            "You are a helpful assistant that answers questions about the provided PDF document. Be concise and accurate.",
          ...(modelMode === "thinking"
            ? {
                providerOptions: {
                  openai: {
                    reasoningEffort: "high" as const,
                  },
                },
              }
            : {}),
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
