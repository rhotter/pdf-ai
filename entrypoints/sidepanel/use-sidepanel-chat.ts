import { useState, useCallback, useRef, useEffect } from "react";
import { PORT_NAME } from "@/lib/constants";
import type { ModelMode } from "@/lib/constants";
import { generateId } from "@/lib/utils";
import { loadChatHistory, saveChatHistory } from "@/lib/storage";
import type {
  Chat,
  ChatMessage,
  ToBackgroundMessage,
  ToContentMessage,
} from "@/lib/messages";

export type { Chat };

interface UseChatOptions {
  apiKey: string;
  modelMode: ModelMode;
}

const CONTENT_SCRIPT_FILE = "content-scripts/pdf-sidebar.js";
const MISSING_RECEIVER_TEXT = "Receiving end does not exist";

function createChat(): Chat {
  return { id: generateId(), title: "New chat", messages: [] };
}

function createEmptyChatState() {
  const chat = createChat();
  return { chats: [chat], activeChatId: chat.id };
}

function resolveStoredChatState(
  stored: Awaited<ReturnType<typeof loadChatHistory>>,
) {
  if (!stored || stored.chats.length === 0) {
    return createEmptyChatState();
  }

  const activeChatId = stored.chats.some(
    (chat) => chat.id === stored.activeChatId,
  )
    ? stored.activeChatId
    : stored.chats[0].id;

  return { chats: stored.chats, activeChatId };
}

/** Get the active tab's URL (without fragment) and ID */
async function getActiveTab(): Promise<{ url: string; tabId: number } | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) return null;
  return { url: tab.url.split("#")[0], tabId: tab.id };
}

function isMissingReceiverError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes(MISSING_RECEIVER_TEXT.toLowerCase())
  );
}

function createMissingContentScriptError(url: string) {
  if (url.startsWith("file:")) {
    return new Error(
      'Readatron cannot access this local PDF yet. Open chrome://extensions, click Details for Readatron, enable "Allow access to file URLs", then reload the PDF.',
    );
  }

  if (
    url.startsWith("chrome:") ||
    url.startsWith("chrome-extension:") ||
    url.startsWith("edge:")
  ) {
    return new Error(
      "Readatron cannot read PDFs from this browser page. Open the PDF directly in a normal tab, then try again.",
    );
  }

  return new Error(
    "Readatron could not connect to a PDF in this tab. Reload the PDF and try again.",
  );
}

async function sendTabMessage<TResponse>(
  tabId: number,
  message: unknown,
): Promise<TResponse | undefined> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage<TResponse>(tabId, message, (response) => {
      const errorMessage = chrome.runtime.lastError?.message;
      if (errorMessage) {
        reject(new Error(errorMessage));
        return;
      }

      resolve(response);
    });
  });
}

async function ensurePdfContentScript(tabId: number, url: string) {
  try {
    const response = await sendTabMessage<{ pong?: boolean }>(tabId, {
      type: "ping",
    });
    if (response?.pong) return;
  } catch (err) {
    if (!isMissingReceiverError(err)) throw err;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [CONTENT_SCRIPT_FILE],
    });
  } catch {
    throw createMissingContentScriptError(url);
  }

  try {
    const response = await sendTabMessage<{ pong?: boolean }>(tabId, {
      type: "ping",
    });
    if (response?.pong) return;
  } catch (err) {
    if (isMissingReceiverError(err)) {
      throw createMissingContentScriptError(url);
    }
    throw err;
  }

  throw createMissingContentScriptError(url);
}

/** Ask the content script in the active tab to fetch the PDF as base64 */
async function fetchPdfFromContentScript(
  tabId: number,
  url: string,
): Promise<string> {
  await ensurePdfContentScript(tabId, url);

  let response: { pdfBase64?: string; error?: string } | undefined;
  try {
    response = await sendTabMessage<{
      pdfBase64?: string;
      error?: string;
    }>(tabId, { type: "get-pdf" });
  } catch (err) {
    if (isMissingReceiverError(err)) {
      throw createMissingContentScriptError(url);
    }
    throw err;
  }

  if (response?.error) {
    throw new Error(response.error);
  }

  if (response?.pdfBase64) {
    return response.pdfBase64;
  }

  throw new Error("No PDF data received from content script");
}

export function useSidePanelChat({ apiKey, modelMode }: UseChatOptions) {
  const [initialChat] = useState<Chat>(() => createChat());
  const [chats, setChats] = useState<Chat[]>(() => [initialChat]);
  const [activeChatId, setActiveChatId] = useState(initialChat.id);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const portRef = useRef<chrome.runtime.Port | null>(null);
  const loadedRef = useRef(false);
  const loadRequestIdRef = useRef(0);
  const pdfUrl = useRef<string>("");
  const tabIdRef = useRef<number | null>(null);
  const chatsRef = useRef(chats);
  const activeChatIdRef = useRef(activeChatId);

  useEffect(() => {
    chatsRef.current = chats;
    activeChatIdRef.current = activeChatId;
  }, [chats, activeChatId]);

  const abort = useCallback(() => {
    if (portRef.current) {
      const msg: ToBackgroundMessage = { type: "chat-abort" };
      try {
        portRef.current.postMessage(msg);
      } catch {
        // port may already be disconnected
      }
      portRef.current.disconnect();
      portRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const syncActiveTab = useCallback(async () => {
    const tab = await getActiveTab();
    if (!tab) return;

    const previousUrl = pdfUrl.current;
    const isSameDocument = loadedRef.current && previousUrl === tab.url;
    const shouldSavePrevious = loadedRef.current && previousUrl;

    tabIdRef.current = tab.tabId;

    if (isSameDocument) return;

    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    loadedRef.current = false;
    abort();
    setError(null);

    if (shouldSavePrevious) {
      void saveChatHistory(shouldSavePrevious, {
        chats: chatsRef.current,
        activeChatId: activeChatIdRef.current,
      }).catch((err) => {
        console.error("Failed to save chat history before tab switch", err);
      });
    }

    pdfUrl.current = tab.url;

    const emptyState = createEmptyChatState();
    setChats(emptyState.chats);
    setActiveChatId(emptyState.activeChatId);

    try {
      const stored = await loadChatHistory(tab.url);
      if (loadRequestIdRef.current !== requestId) return;

      const nextState = resolveStoredChatState(stored);
      setChats(nextState.chats);
      setActiveChatId(nextState.activeChatId);
    } catch (err) {
      if (loadRequestIdRef.current !== requestId) return;
      setError(
        err instanceof Error ? err.message : "Failed to load chat history",
      );
    } finally {
      if (loadRequestIdRef.current === requestId) {
        loadedRef.current = true;
      }
    }
  }, [abort]);

  // Load chats from storage on mount and whenever the active tab/document changes.
  useEffect(() => {
    void syncActiveTab();

    const handleActivated = () => {
      void syncActiveTab();
    };

    const handleUpdated = (
      tabId: number,
      changeInfo: chrome.tabs.TabChangeInfo,
    ) => {
      if (tabId === tabIdRef.current && changeInfo.url) {
        void syncActiveTab();
      }
    };

    chrome.tabs.onActivated.addListener(handleActivated);
    chrome.tabs.onUpdated.addListener(handleUpdated);

    const tabSyncPort = chrome.runtime.connect({ name: "sidepanel-tab-sync" });
    const handleTabSyncMessage = (msg: { type?: string }) => {
      if (msg.type === "active-tab-changed") {
        void syncActiveTab();
      }
    };
    tabSyncPort.onMessage.addListener(handleTabSyncMessage);

    return () => {
      chrome.tabs.onActivated.removeListener(handleActivated);
      chrome.tabs.onUpdated.removeListener(handleUpdated);
      tabSyncPort.onMessage.removeListener(handleTabSyncMessage);
      tabSyncPort.disconnect();
    };
  }, [syncActiveTab]);

  // Save chats to storage when they change (debounced)
  useEffect(() => {
    if (!loadedRef.current || !pdfUrl.current) return;
    const storageUrl = pdfUrl.current;
    const timeout = setTimeout(() => {
      saveChatHistory(storageUrl, { chats, activeChatId });
    }, 500);
    return () => clearTimeout(timeout);
  }, [chats, activeChatId]);

  const activeChat = chats.find((c) => c.id === activeChatId) ?? chats[0];
  const messages = activeChat.messages;

  const updateMessages = useCallback(
    (updater: (msgs: ChatMessage[]) => ChatMessage[]) => {
      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChatId ? { ...c, messages: updater(c.messages) } : c,
        ),
      );
    },
    [activeChatId],
  );

  const updateTitle = useCallback(
    (title: string) => {
      setChats((prev) =>
        prev.map((c) => (c.id === activeChatId ? { ...c, title } : c)),
      );
    },
    [activeChatId],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || !apiKey) return;

      setError(null);
      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        content: content.trim(),
      };
      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: "",
        reasoning: "",
      };

      // Set title from first message
      if (messages.length === 0) {
        const title =
          content.trim().length > 40
            ? content.trim().substring(0, 40) + "..."
            : content.trim();
        updateTitle(title);
      }

      updateMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      try {
        const tab = await getActiveTab();
        if (!tab) throw new Error("No active tab found");
        tabIdRef.current = tab.tabId;
        pdfUrl.current = tab.url;

        const pdfBase64 = await fetchPdfFromContentScript(
          tabIdRef.current,
          tab.url,
        );
        const allMessages = [...messages, userMsg];

        const port = chrome.runtime.connect({ name: PORT_NAME });
        portRef.current = port;

        const startMsg: ToBackgroundMessage = {
          type: "chat-start",
          messages: allMessages,
          pdfBase64,
          apiKey,
          modelMode,
        };
        port.postMessage(startMsg);

        port.onMessage.addListener((msg: ToContentMessage) => {
          if (msg.type === "chat-delta") {
            updateMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + msg.delta,
                };
              }
              return updated;
            });
          } else if (msg.type === "chat-reasoning") {
            updateMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  reasoning: (last.reasoning ?? "") + msg.delta,
                };
              }
              return updated;
            });
          } else if (msg.type === "chat-done") {
            setIsStreaming(false);
            port.disconnect();
            portRef.current = null;
          } else if (msg.type === "chat-error") {
            setError(msg.error);
            setIsStreaming(false);
            updateMessages((prev) => {
              if (
                prev.length > 0 &&
                prev[prev.length - 1].role === "assistant" &&
                prev[prev.length - 1].content === ""
              ) {
                return prev.slice(0, -1);
              }
              return prev;
            });
            port.disconnect();
            portRef.current = null;
          }
        });

        port.onDisconnect.addListener(() => {
          setIsStreaming(false);
          portRef.current = null;
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch PDF",
        );
        setIsStreaming(false);
        updateMessages((prev) => {
          if (
            prev.length > 0 &&
            prev[prev.length - 1].role === "assistant" &&
            prev[prev.length - 1].content === ""
          ) {
            return prev.slice(0, -1);
          }
          return prev;
        });
      }
    },
    [messages, apiKey, modelMode, updateMessages, updateTitle],
  );

  const newChat = useCallback(() => {
    abort();
    const chat: Chat = { id: generateId(), title: "New chat", messages: [] };
    setChats((prev) => [chat, ...prev]);
    setActiveChatId(chat.id);
    setError(null);
  }, [abort]);

  const deleteChat = useCallback(
    (chatId: string) => {
      setChats((prev) => {
        const filtered = prev.filter((c) => c.id !== chatId);
        if (filtered.length === 0) {
          const fresh: Chat = {
            id: generateId(),
            title: "New chat",
            messages: [],
          };
          setActiveChatId(fresh.id);
          return [fresh];
        }
        if (chatId === activeChatId) {
          setActiveChatId(filtered[0].id);
        }
        return filtered;
      });
      setError(null);
    },
    [activeChatId],
  );

  const switchChat = useCallback(
    (chatId: string) => {
      if (isStreaming) abort();
      setActiveChatId(chatId);
      setError(null);
    },
    [isStreaming, abort],
  );

  return {
    chats,
    activeChatId,
    messages,
    isStreaming,
    error,
    sendMessage,
    abort,
    newChat,
    deleteChat,
    switchChat,
  };
}
