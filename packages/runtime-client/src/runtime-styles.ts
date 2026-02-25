export const runtimeStyles = `
:host {
  all: initial;
}
.runtime-root {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2147483600;
  font-family: "IBM Plex Sans", "Avenir Next", "Segoe UI", sans-serif;
}
.runtime-fab {
  position: fixed;
  right: 20px;
  bottom: 20px;
  width: 52px;
  height: 52px;
  border: none;
  border-radius: 999px;
  color: #ffffff;
  background: linear-gradient(135deg, #111827 0%, #0f172a 100%);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  pointer-events: auto;
  padding: 0;
}
.runtime-fab[data-active="true"] {
  background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
}
.runtime-fab-content {
  display: flex;
  align-items: center;
  justify-content: center;
}
.runtime-fab-icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.runtime-fab-icon svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}
.selection-overlay {
  position: fixed;
  border: 2px solid #1d4ed8;
  background: rgba(29, 78, 216, 0.12);
  pointer-events: none;
}
.selection-label {
  position: fixed;
  pointer-events: none;
  padding: 4px 8px;
  border-radius: 6px;
  background: #0f172a;
  color: #f8fafc;
  font-size: 12px;
  line-height: 1.2;
  white-space: nowrap;
}
.action-menu {
  position: fixed;
  min-width: 220px;
  max-width: 320px;
  pointer-events: auto;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.2);
  overflow: hidden;
}
.action-menu-header {
  padding: 8px 10px;
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.action-menu-list {
  padding: 6px;
  display: grid;
  gap: 4px;
}
.action-menu-item {
  width: 100%;
  border: none;
  border-radius: 8px;
  background: #ffffff;
  color: #0f172a;
  text-align: left;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 10px;
  cursor: pointer;
}
.action-menu-item:hover {
  background: #eff6ff;
}
.panel-host {
  position: fixed;
  left: 16px;
  right: 16px;
  top: 16px;
  pointer-events: auto;
}
.panel-shell {
  border: 1px solid #d1d5db;
  border-radius: 14px;
  background: #f8fafc;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.18);
  padding: 10px;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.panel-title {
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.panel-close {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  color: #0f172a;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 10px;
  cursor: pointer;
}
.panel-close:hover {
  background: #f1f5f9;
}
.tool-panel-status {
  margin-top: 8px;
  font-size: 12px;
  color: #475569;
}
.tool-panel-status[data-state="error"] {
  color: #b91c1c;
}
.tailwind-toolbar-adapter {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px;
}
.tailwind-toolbar-label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
}
.tailwind-toolbar-input {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  color: #0f172a;
  background: #ffffff;
}
.tailwind-toolbar-input:focus {
  outline: 2px solid #bfdbfe;
  outline-offset: 0;
  border-color: #3b82f6;
}
`;

export const runtimeDocumentStyles = `
/* Radix popover/menu/select content portals to document.body by default, not
   inside Refract's ShadowRoot. Force those layers above the runtime shell so
   toolbar overlays are visible and clickable. */
body[data-refract-tool-runtime="active"] [data-radix-popper-content-wrapper],
body[data-refract-tool-runtime="active"] [data-radix-select-content],
body[data-refract-tool-runtime="active"] [data-radix-menu-content],
body[data-refract-tool-runtime="active"] [data-radix-menubar-content] {
  z-index: 2147483647 !important;
}
`;
