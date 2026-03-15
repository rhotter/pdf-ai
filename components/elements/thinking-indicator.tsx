import { cn } from "@/lib/utils";

export function ThinkingIndicator({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex items-center gap-1 py-1", className)}
      aria-label="Thinking"
    >
      <span className="thinking-dot size-1.5 rounded-full bg-current opacity-60" />
      <span className="thinking-dot size-1.5 rounded-full bg-current opacity-60 [animation-delay:150ms]" />
      <span className="thinking-dot size-1.5 rounded-full bg-current opacity-60 [animation-delay:300ms]" />
    </div>
  );
}
