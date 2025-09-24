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

  return params;
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
