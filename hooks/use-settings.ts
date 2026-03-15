import { useState, useEffect } from "react";
import {
  openaiKeyStorage,
  modelModeStorage,
  themeStorage,
} from "@/lib/storage";
import { DEFAULT_MODEL_MODE, type ModelMode } from "@/lib/constants";

export function useSettings() {
  const [openaiKey, setOpenaiKey] = useState("");
  const [modelMode, setModelMode] = useState<ModelMode>(DEFAULT_MODEL_MODE);
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      openaiKeyStorage.getValue(),
      modelModeStorage.getValue(),
      themeStorage.getValue(),
    ]).then(([ok, mm, t]) => {
      setOpenaiKey(ok);
      setModelMode(mm);
      setTheme(t);
      setLoaded(true);
    });

    const unwatchOk = openaiKeyStorage.watch((v) => setOpenaiKey(v ?? ""));
    const unwatchMm = modelModeStorage.watch((v) =>
      setModelMode(v ?? DEFAULT_MODEL_MODE),
    );
    const unwatchT = themeStorage.watch((v) => setTheme(v ?? "system"));

    return () => {
      unwatchOk();
      unwatchMm();
      unwatchT();
    };
  }, []);

  const hasKey = openaiKey.length > 0;

  return {
    openaiKey,
    modelMode,
    theme,
    loaded,
    hasKey,
    apiKey: openaiKey,
    setModelMode: (m: ModelMode) => modelModeStorage.setValue(m),
    setTheme: (t: "system" | "light" | "dark") => themeStorage.setValue(t),
    setOpenaiKey: (k: string) => openaiKeyStorage.setValue(k),
  };
}
