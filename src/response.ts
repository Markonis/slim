import { RequestResult, SwapStrategy } from "./types.ts";

function createEmptyResult(
  status: number,
  swapStrategy: SwapStrategy,
): Promise<RequestResult> {
  return Promise.resolve({
    status,
    html: null,
    text: null,
    event: null,
    targets: [],
    swapStrategy,
    pushUrl: null,
  });
}

export function processResponse(
  response: Response,
  element: Element,
  targetSelector: string | null,
  swapStrategy: SwapStrategy,
): Promise<RequestResult> {
  if (response.headers.get("S-Refresh") === "true") {
    location.reload();
    return createEmptyResult(response.status, swapStrategy);
  }

  const redirectLocation = response.headers.get("S-Redirect");
  if (redirectLocation) {
    window.location.href = redirectLocation;
    return createEmptyResult(response.status, swapStrategy);
  }

  const serverTargetSelector = response.headers.get("S-Target");
  const finalTargetSelector = serverTargetSelector || targetSelector;
  const event = response.headers.get("S-Emit");
  const serverSwapStrategy = response.headers.get("S-Swap");
  const finalSwapStrategy =
    (serverSwapStrategy === "outer" ? "outer" : swapStrategy) as SwapStrategy;
  const pushUrl = response.headers.get("S-Push");

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
          pushUrl,
        };
      case "text/plain":
        return {
          status: response.status,
          html: null,
          text: text,
          event,
          targets,
          swapStrategy: finalSwapStrategy,
          pushUrl,
        };
      default:
        return {
          status: response.status,
          html: null,
          text: null,
          event,
          targets: [],
          swapStrategy: finalSwapStrategy,
          pushUrl,
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
