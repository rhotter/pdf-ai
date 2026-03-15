import { storage } from "wxt/utils/storage";
import type { ModelMode } from "./constants";

export const openaiKeyStorage = storage.defineItem<string>(
  "local:openai-api-key",
  { fallback: "" },
);

export const modelModeStorage = storage.defineItem<ModelMode>(
  "local:model-mode",
  { fallback: "auto" },
);

export const themeStorage = storage.defineItem<"system" | "light" | "dark">(
  "local:theme",
  { fallback: "system" },
);
