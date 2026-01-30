import { RequestResult, SwapStrategy } from "./types.ts";

export function processResponse(
  response: Response,
  element: Element,
  targetSelector: string | null,
  swapStrategy: SwapStrategy,
): Promise<RequestResult> {
  if (response.headers.get("S-Refresh") === "true") {
    location.reload();
    return Promise.resolve({
      status: response.status,
      html: null,
      text: null,
      event: null,
      targets: [],
      swapStrategy,
    });
  }

  if (!response.ok) {
    return Promise.reject();
  }

  const serverTargetSelector = response.headers.get("S-Target");
  const finalTargetSelector = serverTargetSelector || targetSelector;
  const event = response.headers.get("S-Emit");
  const serverSwapStrategy = response.headers.get("S-Swap");
  const finalSwapStrategy = (serverSwapStrategy === "outer" ? "outer" : swapStrategy) as "inner" | "outer";

  return response.text().then((text) => {
    const contentType = response.headers.get("content-type");
    const mediaType = contentType?.split(";")[0];
    const targets = determineTargets(element, finalTargetSelector);
    switch (mediaType) {
      case "text/html":
        return {
          status: response.status,
          html: text,
          text: null,
          event,
          targets,
          swapStrategy: finalSwapStrategy,
        };
      case "text/plain":
        return {
          status: response.status,
          html: null,
          text: text,
          event,
          targets,
          swapStrategy: finalSwapStrategy,
        };
      default:
        return {
          status: response.status,
          html: null,
          text: null,
          event,
          targets: [],
          swapStrategy: finalSwapStrategy,
        };
    }
  });
}

export function determineTargets(
  element: Element,
  targetSelector: string | null,
): Element[] {
  if (!targetSelector) return [element];
  const targets = document.querySelectorAll(targetSelector);
  return Array.from(targets);
}
