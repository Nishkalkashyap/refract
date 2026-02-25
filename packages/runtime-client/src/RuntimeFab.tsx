interface RuntimeFabProps {
  active: boolean;
  onToggle: () => void;
}

export function RuntimeFab({ active, onToggle }: RuntimeFabProps) {
  return (
    <button
      type="button"
      className="runtime-fab"
      data-active={active ? "true" : "false"}
      onClick={onToggle}
    >
      Select
    </button>
  );
}
