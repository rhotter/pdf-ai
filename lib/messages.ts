import type { ModelMode } from "./constants";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
}

/** Messages sent from content script to background */
export type ToBackgroundMessage =
  | {
      type: "chat-start";
      messages: ChatMessage[];
      pdfBase64: string;
      apiKey: string;
      modelMode: ModelMode;
    }
  | {
      type: "chat-abort";
    };

/** Messages sent from background to content script */
export type ToContentMessage =
  | { type: "chat-delta"; delta: string }
  | { type: "chat-reasoning"; delta: string }
  | { type: "chat-done" }
  | { type: "chat-error"; error: string };
