export type ReasoningEffort = "none" | "low" | "medium" | "high" | "xhigh";

export const MODEL_OPTIONS = [
  {
    value: "gpt-5.5:auto",
    label: "GPT 5.5 Auto",
    modelId: "gpt-5.5",
    streaming: true,
  },
  {
    value: "gpt-5.5:thinking",
    label: "GPT 5.5 Thinking",
    modelId: "gpt-5.5",
    reasoningEffort: "high",
    streaming: true,
  },
  {
    value: "gpt-5.5-pro",
    label: "GPT 5.5 Pro",
    modelId: "gpt-5.5-pro",
    reasoningEffort: "xhigh",
    streaming: false,
  },
  {
    value: "gpt-5.4:auto",
    label: "GPT 5.4 Auto",
    modelId: "gpt-5.4",
    streaming: true,
  },
  {
    value: "gpt-5.4:thinking",
    label: "GPT 5.4 Thinking",
    modelId: "gpt-5.4",
    reasoningEffort: "high",
    streaming: true,
  },
  {
    value: "gpt-5.4-mini:auto",
    label: "GPT 5.4 Mini",
    modelId: "gpt-5.4-mini",
    streaming: true,
  },
  {
    value: "gpt-5.4-nano:auto",
    label: "GPT 5.4 Nano",
    modelId: "gpt-5.4-nano",
    streaming: true,
  },
] as const satisfies readonly {
  value: string;
  label: string;
  modelId: string;
  reasoningEffort?: ReasoningEffort;
  streaming: boolean;
}[];

export type ModelMode = (typeof MODEL_OPTIONS)[number]["value"];

export const DEFAULT_MODEL_MODE: ModelMode = "gpt-5.5:auto";

export function getModelOption(modelMode: ModelMode) {
  return MODEL_OPTIONS.find((option) => option.value === modelMode) ?? MODEL_OPTIONS[0];
}

export function normalizeModelMode(modelMode: unknown): ModelMode {
  if (MODEL_OPTIONS.some((option) => option.value === modelMode)) {
    return modelMode as ModelMode;
  }

  // Migrate older stored values from the previous GPT-5.4-only selector.
  if (modelMode === "thinking") return "gpt-5.5:thinking";
  return DEFAULT_MODEL_MODE;
}

export const PORT_NAME = "pdf-chat-stream";
