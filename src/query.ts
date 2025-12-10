type FormChild = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export function collectQueryParams(element: Element): URLSearchParams {
  const params = new URLSearchParams();
  let currentElement: Element | null = element;

  // Collect from ancestors first (lower precedence)
  const ancestors: Element[] = [];
  while (currentElement) {
    ancestors.unshift(currentElement); // Add to beginning for correct order
    currentElement = currentElement.parentElement;
  }

  // Process from root to element (so closer elements override)
  for (const ancestor of ancestors) {
    const queryAttr = ancestor.getAttribute("s-query");
    if (queryAttr) {
      const ancestorParams = new URLSearchParams(queryAttr);
      ancestorParams.forEach((value, key) => params.set(key, value));
    }
  }

  if (element instanceof HTMLFormElement) return params;

  // Collect form values in children
  const children = Array.from(element
    .querySelectorAll<FormChild>("input, select, textarea")).reverse();

  for (const child of children) {
    const name = child.getAttribute("name") ?? child.id;
    if (!name) continue;

    const value = getElementValue(child);
    if (!value) continue;
    params.set(name, child.value);
  }

  const elementName = element.getAttribute("name") ?? element.id;
  if (elementName) {
    const value = getElementValue(element);
    if (value) params.set(elementName, value as string);
  }

  return params;
}

function getElementValue(element: Element): string {
  return "value" in element ? element.value as string : "";
}

export function appendQueryParams(
  url: string,
  params: URLSearchParams,
): string {
  if (params.toString() === "") {
    return url;
  }

  const urlObj = new URL(url, location.origin);
  params.forEach((value, key) => {
    urlObj.searchParams.set(key, value);
  });

  return urlObj.toString();
}
