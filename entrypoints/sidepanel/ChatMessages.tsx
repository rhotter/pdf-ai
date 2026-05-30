import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/elements/conversation";
import { ChatMessage } from "./ChatMessage";
import type { ChatMessage as ChatMessageType } from "@/lib/messages";

interface ChatMessagesProps {
  messages: ChatMessageType[];
  isStreaming: boolean;
}

export function ChatMessages({ messages, isStreaming }: ChatMessagesProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <h3 className="mb-1 text-lg font-semibold text-foreground">
          Chat with this PDF
        </h3>
        <p className="text-sm text-muted-foreground">
          Ask questions about the document and get AI-powered answers.
        </p>
      </div>
    );
  }

  return (
    <Conversation>
      <ConversationContent className="flex flex-col gap-1">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            isStreaming={
              isStreaming &&
              msg === messages[messages.length - 1] &&
              msg.role === "assistant"
            }
          />
        ))}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
