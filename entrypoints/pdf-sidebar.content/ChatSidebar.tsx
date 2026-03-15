import { useState } from "react";
import {
  MessageSquare,
  X,
  Plus,
  Trash2,
  ChevronDown,
  Monitor,
  Sun,
  Moon,
  Settings,
} from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import type { useSettings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";

interface ChatSidebarProps {
  settings: ReturnType<typeof useSettings>;
  shadowRoot: ShadowRoot;
  isOpen: boolean;
  onToggle: () => void;
  shortcutLabel: string;
}

export function ChatSidebar({
  settings,
  shadowRoot,
  isOpen,
  onToggle,
  shortcutLabel,
}: ChatSidebarProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showChats, setShowChats] = useState(false);
  const [fabHovered, setFabHovered] = useState(false);

  const {
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
  } = useChat({
    apiKey: settings.apiKey,
    modelMode: settings.modelMode,
  });

  // Floating action button when closed
  if (!isOpen) {
    return (
      <div
        className="fixed right-4 bottom-4 z-[2147483647] flex items-center gap-2"
        style={{ pointerEvents: "auto" }}
        onMouseEnter={() => setFabHovered(true)}
        onMouseLeave={() => setFabHovered(false)}
      >
        {fabHovered && (
          <div className="rounded-lg bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md border border-border whitespace-nowrap">
            Chat with PDF
            <kbd className="ml-1.5 rounded bg-muted px-1 py-0.5 text-[10px] font-mono text-muted-foreground">
              {shortcutLabel}
            </kbd>
          </div>
        )}
        <button
          onClick={onToggle}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
          aria-label="Open PDF Chat"
        >
          <MessageSquare className="h-5 w-5" />
        </button>
      </div>
    );
  }

  // Settings view
  if (showSettings) {
    return (
      <div className="fixed top-0 right-0 z-[2147483647] flex h-screen w-[400px] flex-col border-l border-border bg-background text-foreground shadow-xl" style={{ pointerEvents: "auto" }}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold">Settings</span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowSettings(false)}
            aria-label="Back"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <InlineSettings
            settings={settings}
            onDone={() => setShowSettings(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-0 right-0 z-[2147483647] flex h-screen w-[400px] flex-col border-l border-border bg-background text-foreground shadow-xl" style={{ pointerEvents: "auto" }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-1">
          {/* Chat list toggle */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowChats(!showChats)}
            aria-label="Chat list"
            className={cn(showChats && "bg-accent")}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                showChats && "rotate-180",
              )}
            />
          </Button>
          <span className="text-sm font-semibold truncate max-w-[160px]">
            {chats.find((c) => c.id === activeChatId)?.title ?? "New chat"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={newChat}
            aria-label="New chat"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowSettings(true)}
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            aria-label={`Close sidebar (${shortcutLabel})`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chat list dropdown */}
      {showChats && (
        <div className="border-b border-border bg-muted/30 max-h-48 overflow-y-auto">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={cn(
                "flex items-center justify-between px-4 py-2 text-sm cursor-pointer hover:bg-accent",
                chat.id === activeChatId && "bg-accent",
              )}
              onClick={() => {
                switchChat(chat.id);
                setShowChats(false);
              }}
            >
              <span className="truncate flex-1">{chat.title}</span>
              {chats.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(chat.id);
                  }}
                  className="ml-2 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <ChatMessages messages={messages} isStreaming={isStreaming} />

      {/* Error */}
      {error && (
        <div className="mx-4 mb-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* No API key warning */}
      {!settings.hasKey && (
        <div className="mx-4 mb-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          <button
            className="underline hover:text-foreground"
            onClick={() => setShowSettings(true)}
          >
            Add an API key
          </button>{" "}
          to start chatting.
        </div>
      )}

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        onAbort={abort}
        isStreaming={isStreaming}
        disabled={!settings.hasKey}
        modelMode={settings.modelMode}
        onModelModeChange={settings.setModelMode}
      />
    </div>
  );
}

// ---- Inline Settings ----

function InlineSettings({
  settings,
  onDone,
}: {
  settings: ReturnType<typeof useSettings>;
  onDone: () => void;
}) {
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [theme, setTheme] = useState(settings.theme);
  const [saved, setSaved] = useState(false);

  const hasChanges =
    apiKey !== settings.apiKey || theme !== settings.theme;

  const save = () => {
    settings.setOpenaiKey(apiKey);
    settings.setTheme(theme);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onDone();
    }, 800);
  };

  return (
    <>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">OpenAI API Key</label>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Theme</label>
        <div className="flex gap-1">
          {(
            [
              { value: "system", icon: Monitor, label: "System" },
              { value: "light", icon: Sun, label: "Light" },
              { value: "dark", icon: Moon, label: "Dark" },
            ] as const
          ).map(({ value, icon: Icon, label }) => (
            <Button
              key={value}
              variant={theme === value ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setTheme(value)}
              className="flex-1 gap-1.5"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      <Button onClick={save} disabled={!hasChanges && !saved} className="w-full">
        {saved ? "Saved!" : "Save"}
      </Button>
    </>
  );
}
