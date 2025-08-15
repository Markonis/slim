import { RequestResult } from "./types.ts";

export function processResponse(
  response: Response,
  element: Element,
  targetSelector: string | null,
): Promise<RequestResult> {
  if (response.headers.get("S-Refresh") === "true") {
    location.reload();
    return Promise.resolve({
      status: response.status,
      html: null,
      event: null,
      targets: [],
    });
  }

  const serverTargetSelector = response.headers.get("S-Target");
  const finalTargetSelector = serverTargetSelector || targetSelector;

  return response.text().then((text) => {
    const contentType = response.headers.get("content-type");
    switch (contentType) {
      case "text/html":
        return {
          status: response.status,
          html: text,
          event: null,
          targets: determineTargets(element, finalTargetSelector),
        };
      case "text/plain":
        return {
          status: response.status,
          html: null,
          event: text,
          targets: [],
        };
      default:
        return {
          status: response.status,
          html: null,
          event: null,
          targets: [],
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
