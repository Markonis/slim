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
      text: null,
      event: null,
      targets: [],
    });
  }

  if (!response.ok) {
    return Promise.reject();
  }

  const serverTargetSelector = response.headers.get("S-Target");
  const finalTargetSelector = serverTargetSelector || targetSelector;
  const event = response.headers.get("S-Emit");

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
        };
      case "text/plain":
        return {
          status: response.status,
          html: null,
          text: text,
          event,
          targets,
        };
      default:
        return {
          status: response.status,
          html: null,
          text: null,
          event,
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
