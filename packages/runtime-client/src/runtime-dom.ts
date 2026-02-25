import type { RefractSelectionRef } from "@refract/tool-contracts";

const DATA_FILE_ATTR = "data-tool-file";
const DATA_LINE_ATTR = "data-tool-line";
const DATA_COLUMN_ATTR = "data-tool-column";

export interface RuntimeSelectionTarget {
  selectionRef: RefractSelectionRef;
  element: HTMLElement;
}

export function findInstrumentedElement(
  target: EventTarget | null,
  hostElement: HTMLElement
): HTMLElement | null {
  if (!(target instanceof Element)) {
    return null;
  }

  if (hostElement.contains(target)) {
    return null;
  }

  return target.closest(`[${DATA_FILE_ATTR}]`) as HTMLElement | null;
}

export function toSelectionTarget(element: HTMLElement): RuntimeSelectionTarget | null {
  const file = element.getAttribute(DATA_FILE_ATTR);
  const line = Number.parseInt(element.getAttribute(DATA_LINE_ATTR) ?? "", 10);
  const column = Number.parseInt(element.getAttribute(DATA_COLUMN_ATTR) ?? "", 10);

  if (!file || Number.isNaN(line)) {
    return null;
  }

  return {
    element,
    selectionRef: {
      file,
      line,
      tagName: element.tagName.toLowerCase(),
      ...(Number.isNaN(column) ? {} : { column })
    }
  };
}
