export type TailwindEditorToolbarProps = {
  value: string;
  onChange: (next: string) => void;
};

export function TailwindEditorToolbarAdapter({ value, onChange }: TailwindEditorToolbarProps) {
  return (
    <div className="tailwind-toolbar-adapter">
      <label className="tailwind-toolbar-label" htmlFor="tailwind-toolbar-input">
        Tailwind classes
      </label>
      <input
        id="tailwind-toolbar-input"
        className="tailwind-toolbar-input"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="flex items-center gap-2"
      />
    </div>
  );
}
