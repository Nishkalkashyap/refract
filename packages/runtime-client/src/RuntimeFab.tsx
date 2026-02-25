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
      aria-label={active ? "Exit selection mode" : "Enter selection mode"}
      title={active ? "Exit selection mode" : "Enter selection mode"}
    >
      <span className="runtime-fab-content">
        <span className="runtime-fab-icon" aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            className="lucide lucide-mouse-pointer-icon lucide-mouse-pointer"
          >
            <path d="M12.586 12.586 19 19" />
            <path d="M3.688 3.037a.497.497 0 0 0-.651.651l6.5 15.999a.501.501 0 0 0 .947-.062l1.569-6.083a2 2 0 0 1 1.448-1.479l6.124-1.579a.5.5 0 0 0 .063-.947z" />
          </svg>
        </span>
      </span>
    </button>
  );
}
