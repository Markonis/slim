export function getEvalSpec(element: Element): string | null {
  return element.getAttribute("s-eval");
}

export function handleEval(code: string, element: Element, event: Event) {
  try {
    const fn = new Function("event", code);
    fn.call(element, event);
  } catch (error) {
    console.error("s-eval execution failed:", error);
  }
}
