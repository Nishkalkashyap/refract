"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  type RefractPanelProps,
  type RefractRuntimePlugin,
  type RefractServerResult
} from "@nkstack/refract-tool-contracts";
import {
  TailwindInspectorToolbar,
  tailwindEditorCssText
} from "@nkstack/tailwind-editor-react/unstyled";

import type { TailwindEditorInvokePayload } from "./types.js";

const SAVE_DEBOUNCE_MS = 250;

type SaveState = "idle" | "saving" | "error";

function TailwindEditorPanel({
  element,
  server,
  portalContainer
}: RefractPanelProps<TailwindEditorInvokePayload>) {
  const [value, setValue] = useState(() => element.className ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingValueRef = useRef<string | null>(null);
  const requestVersionRef = useRef(0);
  const mountedRef = useRef(true);
  const invokeRef = useRef(server.invoke);

  useEffect(() => {
    invokeRef.current = server.invoke;
  }, [server]);

  const persistNow = useCallback(async (next: string) => {
    const requestVersion = ++requestVersionRef.current;

    const result: RefractServerResult = await invokeRef.current({
      kind: "updateClassName",
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
  }, []);

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
      element.className = next;
      schedulePersist(next);
    },
    [element, schedulePersist]
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
        void invokeRef.current({
          kind: "updateClassName",
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
      <TailwindInspectorToolbar
        value={value}
        onChange={handleChange}
        portalContainer={portalContainer}
      />
      <div className="tool-panel-status" data-state={saveState}>
        {statusText}
      </div>
    </>
  );
}

export const tailwindEditorRuntimePlugin: RefractRuntimePlugin<TailwindEditorInvokePayload> = {
  id: "tailwind-editor",
  label: "Tailwind Editor",
  onSelect: "open-panel",
  panelStyles: [tailwindEditorCssText],
  Panel: TailwindEditorPanel
};
