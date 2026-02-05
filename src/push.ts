export function getPushUrl(element: Element): string | null {
  const pushUrl = element.getAttribute("s-push");
  return pushUrl || null;
}

export function handlePush(url: string) {
  window.history.pushState({}, "", url);
}
