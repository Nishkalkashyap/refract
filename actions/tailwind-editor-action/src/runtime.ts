import { createElement, Fragment, useCallback, useEffect, useRef, useState } from "react";

import {
  defineRefractBrowserPlugin,
  type RefractPanelProps,
  type RefractRuntimePlugin,
  type RefractServerResult
} from "@refract/tool-contracts";

import type { TailwindEditorInvokePayload } from "./types";
import { TailwindEditorToolbarAdapter } from "./tailwind-toolbar-adapter.ts";

const SAVE_DEBOUNCE_MS = 250;

type SaveState = "idle" | "saving" | "error";

function TailwindEditorPanel({
  element,
  server
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

  return createElement(
    Fragment,
    null,
    createElement(TailwindEditorToolbarAdapter, { value, onChange: handleChange }),
    createElement(
      "div",
      {
        className: "tool-panel-status",
        "data-state": saveState
      },
      statusText
    )
  );
}

const tailwindEditorBrowserPlugin: RefractRuntimePlugin<TailwindEditorInvokePayload> =
  defineRefractBrowserPlugin(import.meta.url, {
    id: "tailwind-editor",
    label: "Tailwind Editor",
    inBrowserHandler({ ui }) {
      ui.openPanel();
    },
    Panel: TailwindEditorPanel
  });

export default tailwindEditorBrowserPlugin;
