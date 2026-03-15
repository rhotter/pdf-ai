import { useState } from "react";
import { Eye, EyeOff, Monitor, Sun, Moon } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MODEL_MODES, type ModelMode } from "@/lib/constants";

export default function App() {
  const settings = useSettings();
  const isDark = useDarkMode(settings.theme);

  if (!settings.loaded) return null;

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="bg-background text-foreground p-4 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-lg font-semibold">PDF AI Chat</h1>
          <p className="text-xs text-muted-foreground">
            Add your OpenAI API key to chat with PDFs
          </p>
        </div>

        {/* API Key */}
        <ApiKeyInput
          label="OpenAI API Key"
          value={settings.openaiKey}
          onChange={settings.setOpenaiKey}
          placeholder="sk-..."
        />

        {/* Model Mode */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Model</label>
          <Select
            value={settings.modelMode}
            onValueChange={(v) =>
              settings.setModelMode(v as ModelMode)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {MODEL_MODES.map((mode) => (
                <SelectItem key={mode.value} value={mode.value}>
                  {mode.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Theme */}
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
                variant={settings.theme === value ? "secondary" : "ghost"}
                size="sm"
                onClick={() => settings.setTheme(value)}
                className="flex-1 gap-1.5"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ApiKeyInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setShow(!show)}
          aria-label={show ? "Hide" : "Show"}
        >
          {show ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
