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
      targets: [],
    });
  }

  const serverTargetSelector = response.headers.get("S-Target");
  const finalTargetSelector = serverTargetSelector || targetSelector;

  return response.text().then((text) => {
    const isHtml = response.headers.get("content-type")?.includes(
      "text/html",
    );
    const html = isHtml ? text : null;
    const targets = determineTargets(element, finalTargetSelector);
    return {
      status: response.status,
      html,
      targets,
    };
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
