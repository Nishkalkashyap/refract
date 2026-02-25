import { useCallback, useEffect, useRef, useState } from "react";

import type {
  ToolActionOperationResult,
  ToolRuntimePanelAction,
  ToolRuntimePanelProps
} from "@refract/tool-contracts";

import { TailwindEditorToolbarAdapter } from "./tailwind-toolbar-adapter";

const SAVE_DEBOUNCE_MS = 250;

type SaveState = "idle" | "saving" | "error";

function TailwindEditorPanel({ element, invokeOperation, preview }: ToolRuntimePanelProps) {
  const [value, setValue] = useState(() => element.className ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingValueRef = useRef<string | null>(null);
  const requestVersionRef = useRef(0);
  const mountedRef = useRef(true);
  const invokeOperationRef = useRef(invokeOperation);

  useEffect(() => {
    invokeOperationRef.current = invokeOperation;
  }, [invokeOperation]);

  const persistNow = useCallback(
    async (next: string) => {
      const requestVersion = ++requestVersionRef.current;

      const result: ToolActionOperationResult = await invokeOperationRef.current("updateClassName", {
        nextClassName: next
      });

      if (!mountedRef.current || requestVersion !== requestVersionRef.current) {
        return;
      }

      if (result.ok) {
        setSaveState("idle");
        setErrorMessage("");
        return;
      }

      setSaveState("error");
      setErrorMessage(result.message);
    },
    []
  );

  const schedulePersist = useCallback(
    (next: string) => {
      pendingValueRef.current = next;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const pendingValue = pendingValueRef.current;
        pendingValueRef.current = null;
        if (pendingValue !== null) {
          void persistNow(pendingValue);
        }
      }, SAVE_DEBOUNCE_MS);
    },
    [persistNow]
  );

  const handleChange = useCallback(
    (next: string) => {
      setValue(next);
      setSaveState("saving");
      setErrorMessage("");
      preview.setClassName(next);
      schedulePersist(next);
    },
    [preview, schedulePersist]
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      const pendingValue = pendingValueRef.current;
      pendingValueRef.current = null;
      if (pendingValue !== null) {
        void invokeOperationRef.current("updateClassName", {
          nextClassName: pendingValue
        });
      }
    };
  }, []);

  const statusText =
    saveState === "idle"
      ? "Ready"
      : saveState === "saving"
        ? "Saving..."
        : errorMessage || "Failed to persist className changes.";

  return (
    <>
      <TailwindEditorToolbarAdapter value={value} onChange={handleChange} />
      <div className="tool-panel-status" data-state={saveState}>
        {statusText}
      </div>
    </>
  );
}

export const tailwindEditorRuntimeAction: ToolRuntimePanelAction = {
  id: "tailwind-editor",
  label: "Tailwind Editor",
  type: "panel",
  Panel: TailwindEditorPanel
};
