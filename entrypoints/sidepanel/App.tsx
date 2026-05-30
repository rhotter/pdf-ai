import { useSettings } from "@/hooks/use-settings";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { ChatPanel } from "./ChatPanel";

export default function App() {
  const settings = useSettings();
  const isDark = useDarkMode(settings.theme);

  if (!settings.loaded) return null;

  return (
    <div
      className={isDark ? "dark" : ""}
      style={{
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        fontSize: "16px",
        lineHeight: "1.5",
        height: "100%",
      }}
    >
      <ChatPanel settings={settings} />
    </div>
  );
}
