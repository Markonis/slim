import { prefix } from "./constants.ts";
import { appendQueryParams, collectQueryParams } from "./query.ts";
import { ElementConfig } from "./types.ts";
import { sendRequest } from "./request.ts";
import { parseEventSpecs, shouldHandleEvent } from "./event.ts";

(function () {
  let appearObserver: IntersectionObserver;

  function getElementConfig(
    element: Element,
    method: string,
  ): ElementConfig | null {
    const url = element.getAttribute(`${prefix}-${method}`);
    if (url) return { url, method };
    return null;
  }

  function processElement(element: Element, event: Event, bubble: boolean) {
    const config = getElementConfig(element, "get") ??
      getElementConfig(element, "post") ??
      getElementConfig(element, "put") ??
      getElementConfig(element, "delete");

    if (!config) {
      return;
    }

    const { url, method } = config;
    const targetSelector = element.getAttribute(`${prefix}-target`);
    const eventSpecs = parseEventSpecs(element.getAttribute(`${prefix}-on`));
    for (const spec of eventSpecs) {
      if (shouldHandleEvent(event, spec)) {
        handleEvent(url, method, element, targetSelector);
        event.preventDefault();
        break;
      }
    }

    if (!bubble) return;
    const parent = element.parentElement;
    if (parent) {
      processElement(parent, event, true);
    }
  }

  function handleEvent(
    url: string,
    method: string,
    element: Element,
    targetSelector: string | null,
  ) {
    const queryParams = collectQueryParams(element);
    const urlWithQueryParams = appendQueryParams(url, queryParams);

    sendRequest(urlWithQueryParams, method, element, targetSelector)
      .then((result) => {
        if (result.html) {
          result.targets.forEach((target) => {
            target.innerHTML = result.html!;
            processAppearEvents(target);
          });
        }
      })
      .catch((error) => {
        console.error("Request failed:", error);
      });
  }

  function handleAppearIntersection(entries: IntersectionObserverEntry[]) {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const element = entry.target as Element;
        const appearEvent = new CustomEvent("appear", {
          bubbles: false,
          cancelable: true,
        });
        processElement(element, appearEvent, false);
        appearObserver.unobserve(element);
      }
    }
  }

  function initializeAppearObserver() {
    const options = { root: null, threshold: 0 };
    appearObserver = new IntersectionObserver(
      handleAppearIntersection,
      options,
    );
  }

  function processAppearEvents(rootElement: Element) {
    const elements = rootElement.querySelectorAll(`[${prefix}-on]`);

    for (const element of elements) {
      const eventSpecs = parseEventSpecs(element.getAttribute(`${prefix}-on`));
      const hasAppearEvent = eventSpecs.some((spec) => spec.event === "appear");
      if (hasAppearEvent) {
        appearObserver.observe(element);
      }
    }
  }

  function registerEventHandlers() {
    const eventTypesToProcess = ["click", "change", "input", "submit"];
    for (const eventType of eventTypesToProcess) {
      document.body.addEventListener(eventType, (event) => {
        processElement(event.target as Element, event, true);
      }, { capture: true });
    }
  }

  function enableWebSockets() {
    const url = document.body.getAttribute(`${prefix}-ws`);
    if (!url) return;

    const ws = new WebSocket(url);

    ws.onmessage = (event) => {
      const eventType = event.data.toString();

      // Find all elements with s-on attribute containing this event type
      const elements = document.querySelectorAll(
        `[${prefix}-on*="${eventType}"]`,
      );

      for (const element of elements) {
        const syntheticEvent = new CustomEvent(eventType, {
          bubbles: false,
          cancelable: true,
        });
        processElement(element, syntheticEvent, false);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    initializeAppearObserver();
    registerEventHandlers();
    enableWebSockets();
    processAppearEvents(document.body);
  });
})();
