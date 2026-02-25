import { createElement, type ChangeEvent } from "react";

export type TailwindEditorToolbarProps = {
  value: string;
  onChange: (next: string) => void;
};

export function TailwindEditorToolbarAdapter({ value, onChange }: TailwindEditorToolbarProps) {
  return createElement(
    "div",
    { className: "tailwind-toolbar-adapter" },
    createElement(
      "label",
      {
        className: "tailwind-toolbar-label",
        htmlFor: "tailwind-toolbar-input"
      },
      "Tailwind classes"
    ),
    createElement("input", {
      id: "tailwind-toolbar-input",
      className: "tailwind-toolbar-input",
      type: "text",
      value,
      onChange: (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value),
      placeholder: "flex items-center gap-2"
    })
  );
}
