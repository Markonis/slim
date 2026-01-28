export function getTemplateSelector(element: Element): string | null {
  return element.getAttribute("s-template");
}

export function handleTemplate(element: Element, selector: string | null) {
  if (!selector) return;
  const template = document.querySelector(selector);
  if (template) {
    element.innerHTML = template.innerHTML;
  }
}
