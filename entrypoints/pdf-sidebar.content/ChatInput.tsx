import { useState, useCallback } from "react";
import { SendIcon, SquareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MODEL_MODES, type ModelMode } from "@/lib/constants";

interface ChatInputProps {
  onSend: (message: string) => void;
  onAbort: () => void;
  isStreaming: boolean;
  disabled: boolean;
  modelMode: ModelMode;
  onModelModeChange: (mode: ModelMode) => void;
}

export function ChatInput({
  onSend,
  onAbort,
  isStreaming,
  disabled,
  modelMode,
  onModelModeChange,
}: ChatInputProps) {
  const [input, setInput] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (isStreaming) {
        onAbort();
        return;
      }
      if (!input.trim() || disabled) return;
      onSend(input);
      setInput("");
    },
    [input, disabled, onSend, isStreaming, onAbort],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      if (isStreaming) return;
      if (!input.trim() || disabled) return;
      onSend(input);
      setInput("");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  return (
    <div className="p-4 pt-0">
      <form
        onSubmit={handleSubmit}
        className="w-full overflow-hidden rounded-xl border border-border bg-background shadow-sm"
      >
        <Textarea
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={
            disabled ? "Add an API key to start..." : "Ask about this PDF..."
          }
          rows={1}
          className="w-full resize-none rounded-none border-none p-3 shadow-none ring-0 bg-transparent focus-visible:ring-0 min-h-0"
        />
        <div className="flex items-center justify-between p-1">
          <div className="flex items-center">
            <ModelModeSelect
              modelMode={modelMode}
              onChange={onModelModeChange}
            />
          </div>
          <Button
            type="submit"
            size="icon"
            variant="default"
            disabled={disabled && !isStreaming}
            className="gap-1.5 rounded-full"
          >
            {isStreaming ? (
              <SquareIcon className="size-4" />
            ) : (
              <SendIcon className="size-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

/** Native <select> for model mode — avoids Radix portal overlay that darkens the PDF page. */
function ModelModeSelect({
  modelMode,
  onChange,
}: {
  modelMode: ModelMode;
  onChange: (mode: ModelMode) => void;
}) {
  return (
    <select
      value={modelMode}
      onChange={(e) => onChange(e.target.value as ModelMode)}
      className={cn(
        "h-auto rounded-lg border-none bg-transparent px-2 py-1.5 text-xs font-medium text-muted-foreground",
        "hover:bg-accent hover:text-foreground cursor-pointer",
        "focus:outline-none focus:ring-0",
      )}
    >
      {MODEL_MODES.map((mode) => (
        <option key={mode.value} value={mode.value}>
          {mode.label}
        </option>
      ))}
    </select>
  );
}
