import { EventSpec } from "./types.ts";

export function shouldHandleEvent(element:Element, event: Event, eventSpec: EventSpec) {
  if (eventSpec.event !== event.type) {
    return false;
  }
  const target = event.target as Element;
  if (eventSpec.selector) {
    return target.matches(eventSpec.selector);
  } else {
    return element.isSameNode(target);
  }
}

export function parseEventSpecs(element: Element): EventSpec[] {
  const spec = element.getAttribute("s-on");
  if (!spec) return getDefaultEventSpecs(element);
  const parts = spec.split(/\s*\|\s*/);
  return parts.map(parseOneEventSpec).filter(Boolean) as EventSpec[];
}

function getDefaultEventSpecs(element: Element): EventSpec[] {
  switch (element.tagName) {
    case "FORM":
      return [{ event: "submit" }];
    case "BUTTON":
      return [{ event: "click" }];
    case "SELECT":
    case "INPUT":
      return [{ event: "change" }];
    default:
      return [];
  }
}

function parseOneEventSpec(spec: string): EventSpec | null {
  // format is one of:
  // <event>
  // <event> on <selector>
  const parts = spec.split(/\s+on\s+/);
  if (parts.length === 1) {
    return { event: parts[0] };
  } else if (parts.length === 2) {
    return { event: parts[0], selector: parts[1] };
  } else {
    console.warn(`Invalid event spec: ${spec}`);
    return null;
  }
}
