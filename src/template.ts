import { HandleTemplateParams } from "./types.ts";
import { performSwap } from "./swap.ts";

export function getTemplateSelector(element: Element): string | null {
  return element.getAttribute("s-template");
}

export function handleTemplate(params: HandleTemplateParams) {
  const {
    element,
    templateSelector,
    targetSelector,
    swapStrategy,
    observeElementsWithAppearEvent,
  } = params;
  if (!templateSelector) return;
  const template = document.querySelector(templateSelector);
  if (template) {
    performSwap({
      content: template.innerHTML,
      element,
      targetSelector,
      swapStrategy,
      observeElementsWithAppearEvent,
    });
  }
}
