import { storage } from "wxt/utils/storage";
import { DEFAULT_MODEL_MODE, type ModelMode } from "./constants";
import type { Chat } from "./messages";

export const openaiKeyStorage = storage.defineItem<string>(
  "local:openai-api-key",
  { fallback: "" },
);

export const modelModeStorage = storage.defineItem<ModelMode>(
  "local:model-mode",
  { fallback: DEFAULT_MODEL_MODE },
);

export const themeStorage = storage.defineItem<"system" | "light" | "dark">(
  "local:theme",
  { fallback: "system" },
);

// Chat history persistence (per PDF URL)

interface StoredChatHistory {
  chats: Chat[];
  activeChatId: string;
}

function chatStorageKey(pdfUrl: string): `local:${string}` {
  return `local:chat-history:${pdfUrl}`;
}

export async function loadChatHistory(
  pdfUrl: string,
): Promise<StoredChatHistory | null> {
  return storage.getItem<StoredChatHistory>(chatStorageKey(pdfUrl));
}

export async function saveChatHistory(
  pdfUrl: string,
  data: StoredChatHistory,
): Promise<void> {
  await storage.setItem(chatStorageKey(pdfUrl), data);
}
