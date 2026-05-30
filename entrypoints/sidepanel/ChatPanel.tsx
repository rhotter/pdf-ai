import { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  ChevronDown,
  Monitor,
  Sun,
  Moon,
  Settings,
} from "lucide-react";
import { useSidePanelChat } from "./use-sidepanel-chat";
import { Button } from "@/components/ui/button";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import type { useSettings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  settings: ReturnType<typeof useSettings>;
}

export function ChatPanel({ settings }: ChatPanelProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showChats, setShowChats] = useState(false);

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
  } = useSidePanelChat({
    apiKey: settings.apiKey,
    modelMode: settings.modelMode,
  });

  // Settings view
  if (showSettings) {
    return (
      <div className="flex h-full flex-col bg-background text-foreground">
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
    <div className="flex h-full flex-col bg-background text-foreground">
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
