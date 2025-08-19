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
    const url = element.getAttribute(`s-${method}`);
    if (url) return { url, method };
    return null;
  }

  function queryEventHandlingElements(root: Element = document.body) {
    return root.querySelectorAll("[s-on]");
  }

  function processEvent(event: Event | string) {
    let eventObj: Event;
    if (typeof event === "string") {
      eventObj = new CustomEvent(event);
    } else {
      eventObj = event;
    }
    const elements = queryEventHandlingElements();
    for(const element of elements) {
      processElement(element, eventObj);
    }
  }

  function processElement(element: Element, event: Event) {
    const emit = element.getAttribute("s-emit");
    if (emit) {
      event.preventDefault();
      processEvent(event);
      return;
    }

    const config = getElementConfig(element, "get") ??
      getElementConfig(element, "post") ??
      getElementConfig(element, "put") ??
      getElementConfig(element, "delete");

    if (!config) { return }
    
    const { url, method } = config;
    const eventSpecs = parseEventSpecs(element);
    for (const spec of eventSpecs) {
      if (shouldHandleEvent(element, event, spec)) {
        handleEvent(url, method, element);
        event.preventDefault();
        break;
      }
    }
  }

  function handleEvent(
    url: string,
    method: string,
    element: Element,
  ) {
    const queryParams = collectQueryParams(element);
    const urlWithQueryParams = appendQueryParams(url, queryParams);
    const confirmMessage = element.getAttribute("s-confirm");
    if (!confirmMessage || confirm(confirmMessage)) {
      sendRequest(urlWithQueryParams, method, element)
        .then((result) => {
          if (result.html !== null) {
            result.targets.forEach((target) => {
              target.innerHTML = result.html!;
              processAppearEvents(target);
            });
          } else if (result.event) {
            processEvent(result.event);
          }
        })
        .catch((error) => {
          console.error("Request failed:", error);
        });
    }
  }

  function handleAppearIntersection(entries: IntersectionObserverEntry[]) {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const element = entry.target as Element;
        const appearEvent = new CustomEvent("appear", {
          bubbles: false,
          cancelable: true,
        });
        processElement(element, appearEvent);
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
    const elements = queryEventHandlingElements(rootElement);
    for (const element of elements) {
      const eventSpecs = parseEventSpecs(element);
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
        processEvent(event);
      }, { capture: true });
    }
  }

  function enableWebSockets() {
    const url = document.body.getAttribute("s-ws");
    if (!url) return;

    const ws = new WebSocket(url);

    ws.onmessage = (event) => {
      const eventType = event.data.toString();
      processEvent(eventType);
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
