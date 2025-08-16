import { EventSpec } from "./types.ts";

export function shouldHandleEvent(event: Event, eventSpec: EventSpec) {
  if (eventSpec.event !== event.type) {
    return false;
  }

  if (eventSpec.selector) {
    const target = event.target as Element;
    return target.matches(eventSpec.selector);
  }

  return true;
}

export function parseEventSpecs(spec: string | null): EventSpec[] {
  if (!spec) return [];
  const parts = spec.split(/\s*\|\s*/);
  return parts.map(parseOneEventSpec).filter(Boolean) as EventSpec[];
}

function parseOneEventSpec(spec: string): EventSpec | null {
  // format is one of:
  // <event>
  // <event> on <selector>
  const parts = spec.split(/\s+/);
  if (parts.length === 1) {
    return { event: parts[0] };
  } else if (parts.length === 3 && parts[1] === "on") {
    return { event: parts[0], selector: parts[2] };
  } else {
    console.warn(`Invalid event spec: ${spec}`);
    return null;
  }
}
