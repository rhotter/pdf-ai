import { cn } from "@/lib/utils";
import { Response } from "@/components/elements/response";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/elements/reasoning";
import { ThinkingIndicator } from "@/components/elements/thinking-indicator";
import type { ChatMessage as ChatMessageType } from "@/lib/messages";

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming: boolean;
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "group flex w-full items-end gap-2 py-2",
        isUser
          ? "is-user justify-end"
          : "is-assistant flex-row-reverse justify-end",
        "[&>div]:max-w-[85%]",
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-1 overflow-hidden rounded-lg px-4 py-3 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-foreground",
        )}
      >
        {/* Reasoning (thinking) */}
        {!isUser && message.reasoning && (
          <Reasoning isStreaming={isStreaming && !message.content}>
            <ReasoningTrigger />
            <ReasoningContent>{message.reasoning}</ReasoningContent>
          </Reasoning>
        )}

        {/* Content */}
        {isUser ? (
          message.content
        ) : message.content ? (
          <Response mode={isStreaming ? "streaming" : "static"}>
            {message.content}
          </Response>
        ) : isStreaming && !message.reasoning ? (
          <ThinkingIndicator className="text-muted-foreground" />
        ) : null}
      </div>
    </div>
  );
}
