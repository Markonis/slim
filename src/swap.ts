import { PerformSwapParams, SwapStrategy } from "./types.ts";
import { determineTargets } from "./response.ts";


export function getSwapStrategy(element: Element): SwapStrategy {
  const swapValue = element.getAttribute("s-swap");
  if (swapValue === "outer") return "outer";
  return "inner"; // default
}


function performInnerSwap(
  target: Element,
  content: string,
  observeElementsWithAppearEvent: (element: Element) => void,
): void {
  target.innerHTML = content;
  observeElementsWithAppearEvent(target);
}

function performOuterSwap(
  target: Element,
  content: string,
  observeElementsWithAppearEvent: (element: Element) => void,
): void {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = content;
  const newElements: Element[] = [];

  while (tempDiv.firstChild) {
    const node = tempDiv.firstChild;
    if (node.nodeType === Node.ELEMENT_NODE) {
      newElements.push(node as Element);
    }
    if (target.parentElement) {
      target.parentElement.insertBefore(node, target);
    }
  }

  if (target.parentElement) {
    target.parentElement.removeChild(target);
  }

  for (const newElement of newElements) {
    observeElementsWithAppearEvent(newElement);
  }
}

export function performSwap(params: PerformSwapParams): void {
  const { content, element, targetSelector, swapStrategy, observeElementsWithAppearEvent } = params;
  const targets = determineTargets(element, targetSelector);

  for (const target of targets) {
    if (swapStrategy === "outer") {
      performOuterSwap(target, content, observeElementsWithAppearEvent);
    } else {
      performInnerSwap(target, content, observeElementsWithAppearEvent);
    }
  }
}
