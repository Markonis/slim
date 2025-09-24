import { appendQueryParams, collectQueryParams } from "./query.ts";
import { EventHandler, RequestConfig } from "./types.ts";
import { sendRequest } from "./request.ts";
import { parseEventSpecs } from "./event.ts";
import { handleDragEvents } from "./dnd.ts";

(function () {
  let appearObserver: IntersectionObserver;

  function getElementConfig(
    element: Element,
    method: string,
  ): RequestConfig | null {
    const url = element.getAttribute(`s-${method}`);
    if (url) return { url, method };
    return null;
  }

  function queryEventHandlingElements(root: Element = document.body) {
    return root.querySelectorAll(
      "[s-get],[s-post],[s-put],[s-delete],[s-emit]",
    );
  }

  function broadcastEvent(eventOrType: Event | string) {
    const event = eventOrType instanceof Event
      ? eventOrType
      : new CustomEvent(eventOrType);

    const elements = queryEventHandlingElements();
    const globalHandlers: EventHandler[] = [];
    const localHandlers: EventHandler[] = [];

    for (const element of elements) {
      const emit = element.getAttribute("s-emit");
      const config = getAnyElementConfig(element);
      if (!emit && !config) continue;

      const specs = parseEventSpecs(element);
      for (const spec of specs) {
        if (spec.event !== event.type) continue;
        if (spec.selector) {
          globalHandlers.push({ event, element, emit, config, spec });
        } else {
          localHandlers.push({ event, element, emit, config, spec });
        }
      }
    }

    if (event.target && event.target instanceof Element) { // User interaction event
      let current: Element = event.target;
      handleDragEvents(current, event);

      while (current) {
        const localHandler = localHandlers
          .find((handler) => handler.element.isSameNode(current));

        if (localHandler) {
          handleEvent(localHandler);
        }

        const matchingGlobalHandlers = globalHandlers
          .filter((handler) => current.matches(handler.spec.selector!));

        for (const globalHandler of matchingGlobalHandlers) {
          handleEvent(globalHandler);
        }

        if (event.type === "appear") {
          break;
        }

        if (current.parentElement) {
          current = current.parentElement;
        } else {
          break;
        }
      }
    } else { // Globally broadcasted event
      for (const handler of [...globalHandlers, ...localHandlers]) {
        if (handler.spec.event === event.type) {
          handleEvent(handler);
        }
      }
    }
  }

  function getAnyElementConfig(element: Element) {
    return getElementConfig(element, "get") ??
      getElementConfig(element, "post") ??
      getElementConfig(element, "put") ??
      getElementConfig(element, "delete");
  }

  function handleEvent({ event, element, config, emit }: EventHandler) {
    const confirmMessage = element.getAttribute("s-confirm");
    if (confirmMessage && !confirm(confirmMessage)) return;

    const queryParams = collectQueryParams(element);
    if (emit) {
      broadcastEvent(emit);
    }

    if (config) {
      const urlWithQueryParams = appendQueryParams(config.url, queryParams);
      sendRequest(event, urlWithQueryParams, config.method, element)
        .then((result) => {
          if (result.html !== null) {
            for (const target of result.targets) {
              target.innerHTML = result.html!;
              observeElementsWithAppearEvent(target);
            }
          } else if (result.text !== null) {
            for (const target of result.targets) {
              target.textContent = result.text;
            }
          } else if (result.event) {
            broadcastEvent(result.event);
          }
          element.dispatchEvent(new CustomEvent("slim:ok"));
        })
        .catch((error) => {
          console.error("Request failed:", error);
          element.dispatchEvent(new CustomEvent("slim:error"));
        })
        .finally(() => {
          element.dispatchEvent(new CustomEvent("slim:done"));
        });
    }
  }

  function handleAppearIntersection(entries: IntersectionObserverEntry[]) {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const element = entry.target as Element;
        element.dispatchEvent(new CustomEvent("appear", { bubbles: false }));
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

  function observeElementsWithAppearEvent(rootElement: Element) {
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
    const eventTypesToProcess = [
      "click",
      "change",
      "input",
      "submit",
      "appear",
      "dragstart",
      "dragover",
      "dragleave",
      "drop",
    ];
    for (const eventType of eventTypesToProcess) {
      document.body.addEventListener(eventType, (event) => {
        if (event.type === "submit") event.preventDefault();
        broadcastEvent(event);
      }, { capture: true });
    }
  }

  function createWebSocket(handleError: () => void) {
    const url = document.body.getAttribute("s-ws");
    if (!url) return;

    const ws = new WebSocket(url);

    ws.onmessage = (event) => {
      const eventType = event.data.toString();
      broadcastEvent(eventType);
    };

    ws.onerror = (error) => {
      console.warn("WebSocket error:", error);
      handleError();
    };
  }

  function initWebSockets() {
    createWebSocket(() => {
      setTimeout(() => initWebSockets(), 1000);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initializeAppearObserver();
    registerEventHandlers();
    initWebSockets();
    observeElementsWithAppearEvent(document.body);
  });
})();
