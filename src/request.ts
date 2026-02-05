import {
  PrepareFormDataResult,
  RequestResult,
  SendRequestParams,
  SwapStrategy,
} from "./types.ts";
import { processResponse } from "./response.ts";

function prepareFormData(
  form: HTMLFormElement,
  method: string,
  url: string,
): PrepareFormDataResult {
  const formData = new FormData(form);

  if (method.toUpperCase() === "GET") {
    const urlObj = getFullURL(url);
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) continue;
      urlObj.searchParams.append(key, value.toString());
    }
    return { url: urlObj.toString(), body: null };
  } else {
    return { url, body: formData };
  }
}

function getFullURL(url: string): URL {
  if (url.startsWith("http")) {
    return new URL(url);
  } else {
    return new URL(url, location.origin);
  }
}

function sendFormRequest(
  url: string,
  method: string,
  element: HTMLFormElement,
  targetSelector: string | null,
  swapStrategy: SwapStrategy,
): Promise<RequestResult> {
  const { url: finalUrl, body } = prepareFormData(element, method, url);

  const fetchOptions: RequestInit = { method };
  if (body) {
    fetchOptions.body = body;
  }

  if (!fetchOptions.headers) {
    fetchOptions.headers = {};
  }
  const headers = fetchOptions.headers as Record<string, string>;
  headers["S-Location"] = window.location.href;

  return fetch(finalUrl, fetchOptions)
    .then((response) =>
      processResponse(response, element, targetSelector, swapStrategy)
    );
}

export function sendRequest(
  params: SendRequestParams,
): Promise<RequestResult> {
  const { event, url, method, element, targetSelector, swapStrategy } = params;
  if (element instanceof HTMLFormElement) {
    return sendFormRequest(url, method, element, targetSelector, swapStrategy);
  } else {
    const headers: Record<string, string> = {};
    let body: string | undefined;

    if (event instanceof DragEvent) {
      const json = event.dataTransfer?.getData("application/json");
      if (json) {
        headers["Content-Type"] = "application/json";
        body = json;
      }
    }

    headers["S-Location"] = window.location.href;

    return fetch(url, { method, headers, body })
      .then((response) =>
        processResponse(response, element, targetSelector, swapStrategy)
      );
  }
}
