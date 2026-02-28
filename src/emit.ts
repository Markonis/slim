import { EmitSpec } from "./types.ts";
import { parseTime } from "./time.ts";

export function getEmitSpec(element: Element): EmitSpec | null {
  const emitStr = element.getAttribute("s-emit");
  if (!emitStr) return null;

  const parts = emitStr.split(/\s+after\s/);
  if (parts.length === 2) {
    const event = parts[0];
    const delay = parseTime(parts[1]);
    if (!event || delay === null) return null;
    return { event, delay };
  } else {
    return { event: parts[0], delay: 0 };
  }
}
