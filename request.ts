import { PrepareFormDataResult, RequestResult } from "./types.ts";
import { processResponse } from "./response.ts";

function prepareFormData(
  form: HTMLFormElement,
  method: string,
  url: string,
): PrepareFormDataResult {
  const formData = new FormData(form);

  if (method.toUpperCase() === "GET") {
    const urlObj = new URL(url);
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) continue;
      urlObj.searchParams.append(key, value.toString());
    }
    return { url: urlObj.toString(), body: null };
  } else {
    return { url, body: formData };
  }
}

function sendFormRequest(
  url: string,
  method: string,
  element: HTMLFormElement,
  targetSelector: string | null,
): Promise<RequestResult> {
  const { url: finalUrl, body } = prepareFormData(element, method, url);

  const fetchOptions: RequestInit = { method };
  if (body) {
    fetchOptions.body = body;
  }

  return fetch(finalUrl, fetchOptions)
    .then((response) => processResponse(response, element, targetSelector));
}

export function sendRequest(
  url: string,
  method: string,
  element: Element,
  targetSelector: string | null,
): Promise<RequestResult> {
  if (element instanceof HTMLFormElement) {
    return sendFormRequest(url, method, element, targetSelector);
  } else {
    return fetch(url, { method })
      .then((response) => processResponse(response, element, targetSelector));
  }
}
