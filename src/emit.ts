import { EmitSpec } from "./types.ts";

export function getEmitSpec(element: Element): EmitSpec | null {
  const emitStr = element.getAttribute("s-emit");
  if (!emitStr) return null;

  const parts = emitStr.split(/\s+after\s/);
  if (parts.length === 2) {
    const event = parts[0];
    let delay = parseFloat(parts[1]);
    if (!event || isNaN(delay)) return null;
    if (parts[1].endsWith("s")) delay *= 1000;
    delay = Math.round(delay);
    return { event, delay };
  } else {
    return { event: parts[0], delay: 0 };
  }
}
