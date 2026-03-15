import { SendIcon, SquareIcon } from "lucide-react";
import type {
  ComponentProps,
  HTMLAttributes,
  KeyboardEventHandler,
} from "react";
import { useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type PromptInputProps = HTMLAttributes<HTMLFormElement>;

export const PromptInput = ({ className, ...props }: PromptInputProps) => (
  <form
    className={cn(
      "w-full overflow-hidden rounded-xl border bg-background shadow-sm",
      className,
    )}
    {...props}
  />
);

export type PromptInputTextareaProps = ComponentProps<typeof Textarea>;

export const PromptInputTextarea = ({
  className,
  placeholder = "Ask about this PDF...",
  onChange,
  ...props
}: PromptInputTextareaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === "Enter") {
      if (e.nativeEvent.isComposing) return;
      if (e.shiftKey) return;

      e.preventDefault();

      const form = e.currentTarget.form;
      const submitButton = form?.querySelector(
        'button[type="submit"]',
      ) as HTMLButtonElement | null;
      if (submitButton?.disabled) return;

      form?.requestSubmit();
    }
  };

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      // Auto-resize
      const el = e.target;
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
      onChange?.(e);
    },
    [onChange],
  );

  return (
    <Textarea
      ref={textareaRef}
      className={cn(
        "w-full resize-none rounded-none border-none p-3 shadow-none ring-0",
        "bg-transparent dark:bg-transparent",
        "focus-visible:ring-0",
        "min-h-0",
        className,
      )}
      rows={1}
      name="message"
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      placeholder={placeholder}
      {...props}
    />
  );
};

export type PromptInputToolbarProps = HTMLAttributes<HTMLDivElement>;

export const PromptInputToolbar = ({
  className,
  ...props
}: PromptInputToolbarProps) => (
  <div
    className={cn("flex items-center justify-between p-1", className)}
    {...props}
  />
);

export type PromptInputSubmitProps = ComponentProps<typeof Button> & {
  isStreaming?: boolean;
};

export const PromptInputSubmit = ({
  className,
  variant = "default",
  size = "icon",
  isStreaming,
  children,
  ...props
}: PromptInputSubmitProps) => {
  const Icon = isStreaming ? (
    <SquareIcon className="size-4" />
  ) : (
    <SendIcon className="size-4" />
  );

  return (
    <Button
      className={cn("gap-1.5 rounded-lg", className)}
      size={size}
      type="submit"
      variant={variant}
      {...props}
    >
      {children ?? Icon}
    </Button>
  );
};

export const PromptInputModelSelect = Select;
export const PromptInputModelSelectTrigger = ({
  className,
  ...props
}: ComponentProps<typeof SelectTrigger>) => (
  <SelectTrigger
    className={cn(
      "border-none bg-transparent font-medium text-muted-foreground shadow-none transition-colors",
      "hover:bg-accent hover:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground",
      "h-auto px-2 py-1.5",
      className,
    )}
    {...props}
  />
);
export const PromptInputModelSelectContent = SelectContent;
export const PromptInputModelSelectItem = SelectItem;
export const PromptInputModelSelectValue = SelectValue;
