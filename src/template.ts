import { HandleTemplateParams } from "./types.ts";
import { determineTargets } from "./response.ts";

export function getTemplateSelector(element: Element): string | null {
  return element.getAttribute("s-template");
}

export function handleTemplate(params: HandleTemplateParams) {
  const { element, templateSelector, targetSelector } = params;
  if (!templateSelector) return;
  const template = document.querySelector(templateSelector);
  if (template) {
    const targets = determineTargets(element, targetSelector);
    for (const target of targets) {
      target.innerHTML = template.innerHTML;
    }
  }
}
