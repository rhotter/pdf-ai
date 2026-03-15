import { useState, useEffect, useCallback } from "react";
import { useSettings } from "@/hooks/use-settings";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { ChatSidebar } from "./ChatSidebar";

interface AppProps {
  shadowRoot: ShadowRoot;
  registerToggle: (fn: () => void) => void;
}

const SHORTCUT_LABEL = navigator.platform.includes("Mac") ? "⌘E" : "Ctrl+E";

export default function App({ shadowRoot, registerToggle }: AppProps) {
  const settings = useSettings();
  const isDark = useDarkMode(settings.theme);
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  // Register toggle so the content script can call it from chrome.commands
  useEffect(() => {
    registerToggle(toggle);
  }, [toggle, registerToggle]);

  if (!settings.loaded) return null;

  return (
    <div
      className={isDark ? "dark" : ""}
      style={{
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        fontSize: "16px",
        lineHeight: "1.5",
      }}
    >
      <ChatSidebar
        settings={settings}
        shadowRoot={shadowRoot}
        isOpen={isOpen}
        onToggle={toggle}
        shortcutLabel={SHORTCUT_LABEL}
      />
    </div>
  );
}
