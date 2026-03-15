export const MODEL_ID = "gpt-5.4";

export type ModelMode = "auto" | "thinking";

export const MODEL_MODES: { value: ModelMode; label: string }[] = [
  { value: "auto", label: "GPT 5.4 auto" },
  { value: "thinking", label: "GPT 5.4 thinking" },
];

export const DEFAULT_MODEL_MODE: ModelMode = "auto";

export const PORT_NAME = "pdf-chat-stream";
