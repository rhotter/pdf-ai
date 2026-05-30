import { useState, useCallback, useRef, useEffect } from "react";
import { PORT_NAME } from "@/lib/constants";
import type { ModelMode } from "@/lib/constants";
import { generateId } from "@/lib/utils";
import { fetchPdfAsBase64 } from "@/lib/pdf-detection";
import { loadChatHistory, saveChatHistory } from "@/lib/storage";
import type { Chat, ChatMessage, ToBackgroundMessage, ToContentMessage } from "@/lib/messages";

export type { Chat };

interface UseChatOptions {
  apiKey: string;
  modelMode: ModelMode;
}

/** Strip fragment so #page=X changes don't create separate histories */
function getPdfUrl(): string {
  return window.location.href.split("#")[0];
}

export function useChat({ apiKey, modelMode }: UseChatOptions) {
  const [chats, setChats] = useState<Chat[]>([
    { id: generateId(), title: "New chat", messages: [] },
  ]);
  const [activeChatId, setActiveChatId] = useState(chats[0].id);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const portRef = useRef<chrome.runtime.Port | null>(null);
  const loadedRef = useRef(false);
  const pdfUrl = useRef(getPdfUrl());

  // Load chats from storage on mount
  useEffect(() => {
    const url = pdfUrl.current;
    loadChatHistory(url).then((stored) => {
      if (stored && stored.chats.length > 0) {
        setChats(stored.chats);
        setActiveChatId(stored.activeChatId);
      }
      loadedRef.current = true;
    });
  }, []);

  // Save chats to storage when they change (debounced)
  useEffect(() => {
    if (!loadedRef.current) return;
    const timeout = setTimeout(() => {
      saveChatHistory(pdfUrl.current, { chats, activeChatId });
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
        const pdfBase64 = await fetchPdfAsBase64();
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
