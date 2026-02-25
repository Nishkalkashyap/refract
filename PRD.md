# Project: Visual In-Browser Design Mode (Dev Plugin for Vite/Next.js)

---

# 1. Overview — What We Are Building

We are building a **development-only visual design tool** for React apps (starting with Vite) that enables:

* Selecting any rendered DOM element in the browser
* Mapping it back to its original source file + line number
* Triggering contextual actions on that element
* Eventually editing CSS/Tailwind or invoking AI-based modifications

This tool will function similarly to v0’s Design Mode, but implemented as:

* A **Vite plugin**
* A **Babel transform**
* A **dev-only injected client UI**
* An **extensible action system**

This is **NOT** a production feature. It must run only in development mode.

---

# 2. Goals (Phase 1 – POC)

We will first build a **minimal but complete working system** that includes:

* Vite plugin
* Babel transform that injects source metadata
* Client-side injected script
* Floating Action Button (FAB)
* Select mode overlay
* Dummy action execution

When selecting an element and triggering an action, it should log:

```js
console.log(
  "action taken on div element with file <file>, line number <line>"
)
```

No file editing yet. No AI yet. No Tailwind editor yet.

Just infrastructure.

---

# 3. High-Level Architecture

```
Vite Dev Server
  ├── Babel Transform (JSX instrumentation)
  ├── HTML Script Injection
  ├── Dev-only runtime client
  │       ├── FAB
  │       ├── Select Mode
  │       ├── Overlay
  │       └── Action Dispatcher
  └── Action Extensions (plugin system)
```

---

# 4. Monorepo Setup (TurboRepo)

We will use a **TurboRepo monorepo**.

## Folder Structure

```
/
  turbo.json
  package.json
  tsconfig.base.json

  /apps
    /vite-example-app

  /packages
    /vite-plugin
    /runtime-client
    /dummy-action
```

---

# 5. Module Breakdown

---

## Module 1 — Vite Plugin (`/packages/vite-plugin`)

### Responsibilities

1. Run only in `serve` (dev mode)
2. Apply Babel transform to JSX/TSX
3. Inject client runtime script into HTML
4. Expose extension/action registration API

---

### 5.1 Babel Transform

We will write a Babel plugin that:

* Targets JSX elements
* Injects attributes:

```jsx
<div
  data-tool-file="/src/App.tsx"
  data-tool-line="83"
  data-tool-column="12"
>
```

### Requirements

* Only in dev
* Only for JSX
* Should not break HMR
* Must preserve formatting
* Must skip fragments

### Implementation Strategy

Use:

* `@babel/parser`
* `@babel/traverse`
* `@babel/types`
* `@babel/generator`

OR implement as Vite `transform()` hook with Babel.

---

## Module 2 — Runtime Client (`/packages/runtime-client`)

This is the browser-side code injected via Vite.

### Responsibilities

* Render FAB
* Handle select mode
* Render overlay highlight
* Dispatch actions

---

### 6. Runtime Client Architecture

### 6.1 Injection

The Vite plugin must inject:

```html
<script type="module" src="/@tool/runtime"></script>
```

Implemented using:

```ts
transformIndexHtml()
```

---

### 6.2 UI Isolation

The runtime must:

* Mount into a root div
* Use Shadow DOM
* Use very high z-index
* Avoid CSS collisions

---

### 6.3 FAB

Small circular button bottom-right.

Click behavior:

* Toggles "Select Mode"

---

### 6.4 Select Mode

When active:

* Add `mousemove` listener
* Identify closest element with:

```js
closest('[data-tool-file]')
```

* Render highlight overlay
* On click:

  * Prevent default
  * Extract metadata
  * Dispatch action

---

### 6.5 Overlay

Overlay must:

* Use `getBoundingClientRect()`
* Position absolute rectangle
* Pointer-events: none
* Render file + line label

---

## Module 3 — Action System (Extensible Architecture)

We must design actions as plugins.

### Interface Definition

```ts
export interface ToolAction {
  id: string
  label: string
  run(context: {
    file: string
    line: number
    column?: number
    element: HTMLElement
  }): void
}
```

The runtime should:

* Register actions
* Support default action
* Support right-click menu (later)
* For POC: single dummy action

---

## Module 4 — Dummy Action (`/packages/dummy-action`)

This is the first extension.

### Responsibilities

Exports a ToolAction:

```ts
export const dummyAction: ToolAction = {
  id: "dummy",
  label: "Log Action",
  run({ file, line, element }) {
    console.log(
      `action taken on ${element.tagName.toLowerCase()} element with file ${file}, line number ${line}`
    )
  }
}
```

The Vite plugin should auto-register this for the POC.

---

# 7. Step-by-Step Implementation Plan (POC)

---

## Step 1 — Setup Monorepo

* Create TurboRepo
* Setup TS config
* Setup shared build pipeline
* Ensure internal package linking works

---

## Step 2 — Create Minimal Vite Plugin

* Add dev-only enforcement
* Add transform hook
* Add transformIndexHtml injection

---

## Step 3 — Implement Babel Transform

Test case:

Input:

```jsx
<div>Hello</div>
```

Output:

```jsx
<div data-tool-file="/src/App.tsx" data-tool-line="12">Hello</div>
```

Validate:

* Line numbers correct
* HMR still works

---

## Step 4 — Runtime Client

* Inject script
* Render FAB
* Toggle select mode
* Highlight hovered element

---

## Step 5 — Element Click Handling

On click:

* Extract:

  * data-tool-file
  * data-tool-line
* Call action

---

## Step 6 — Integrate Dummy Action

Register dummy action in runtime.

Click should log:

```
action taken on div element with file /src/App.tsx, line number 83
```

---

# 8. Non-Goals (For POC)

* No file writing
* No AST editing
* No Tailwind editor
* No LLM integration
* No undo/redo
* No Next.js support
* No iframe bridge

---

# 9. Phase 2 (Future Extensions)

Not to be implemented yet, but architecture must allow:

* Tailwind class editor
* AST-based file editing
* AI prompt editor
* Dev server bridge for file writes
* postMessage bridge for iframe support
* Right-click contextual action menu
* Multi-action plugin ecosystem

---

# 10. Technical Constraints

* Must not affect production builds
* Must not degrade dev performance significantly
* Must support React 18
* Must not break Fast Refresh
* Must be framework-agnostic where possible

---

# 11. Success Criteria (POC Complete When)

1. Running `vite-example-app`
2. FAB appears
3. Clicking FAB enables select mode
4. Hover highlights JSX elements
5. Clicking an element logs correct file + line
6. Works with HMR enabled
7. Disabled in production build

---

# 12. Risks

| Risk                        | Mitigation                        |
| --------------------------- | --------------------------------- |
| Performance overhead        | Dev-only transform                |
| Incorrect line numbers      | Use Babel node.loc                |
| Overlay interfering with UI | Use pointer-events: none          |
| CSS collisions              | Use Shadow DOM                    |
| HMR breakage                | Avoid modifying structure heavily |

---

# 13. Deliverables

For POC:

* Monorepo setup
* Working Vite plugin
* Working runtime client
* Working dummy action
* Example app demonstrating feature

---
