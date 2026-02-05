import { appendQueryParams, collectQueryParams } from "./query.ts";
import {
  EmitSpec,
  EventHandler,
  RequestConfig,
  SendRequestParams,
} from "./types.ts";
import { sendRequest } from "./request.ts";
import { parseEventSpecs } from "./event.ts";
import { handleDragEvents } from "./dnd.ts";
import { getEmitSpec } from "./emit.ts";
import { getEvalCode, handleEval } from "./eval.ts";
import { getTemplateSelector, handleTemplate } from "./template.ts";
import { getSwapStrategy, performSwap } from "./swap.ts";
import { getPushUrl, handlePush } from "./push.ts";

(function () {
  let appearObserver: IntersectionObserver;

  function getElementRequestConfig(
    element: Element,
    method: string,
  ): RequestConfig | null {
    const url = element.getAttribute(`s-${method}`);
    if (url) return { url, method };
    return null;
  }

  function queryEventHandlingElements(root: Element = document.body) {
    return root.querySelectorAll(
      "[s-get],[s-post],[s-put],[s-delete],[s-emit],[s-eval],[s-template],[s-push]",
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
      const emitSpec = getEmitSpec(element);
      const requestConfig = getAnyElementRequestConfig(element);
      const evalCode = getEvalCode(element);
      const templateSelector = getTemplateSelector(element);
      const targetSelector = element.getAttribute("s-target");
      const pushUrl = getPushUrl(element);
      if (
        !emitSpec && !requestConfig && !evalCode && !templateSelector &&
        !pushUrl
      ) {
        continue;
      }

      const eventSpecs = parseEventSpecs(element);
      for (const eventSpec of eventSpecs) {
        if (eventSpec.event !== event.type) continue;
        const list = eventSpec.selector ? globalHandlers : localHandlers;
        list.push({
          event,
          element,
          emitSpec,
          requestConfig,
          eventSpec,
          evalCode,
          templateSelector,
          targetSelector,
          swapStrategy: getSwapStrategy(element),
          pushUrl,
        });
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
          .filter((handler) => current.matches(handler.eventSpec.selector!));

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
        if (handler.eventSpec.event === event.type) {
          handleEvent(handler);
        }
      }
    }
  }

  function getAnyElementRequestConfig(element: Element) {
    return getElementRequestConfig(element, "get") ??
      getElementRequestConfig(element, "post") ??
      getElementRequestConfig(element, "put") ??
      getElementRequestConfig(element, "delete");
  }

  function handleEvent(
    {
      event,
      element,
      requestConfig,
      emitSpec,
      evalCode,
      templateSelector,
      targetSelector,
      swapStrategy,
      pushUrl,
    }: EventHandler,
  ) {
    const confirmMessage = element.getAttribute("s-confirm");
    if (confirmMessage && !confirm(confirmMessage)) return;

    if (evalCode) {
      handleEval(evalCode, element, event);
    }

    if (pushUrl) {
      handlePush(pushUrl);
      broadcastEvent("slim:push");
    }

    if (emitSpec) {
      handleEmit(element, emitSpec);
    }

    if (requestConfig) {
      const sendRequestParams: SendRequestParams = {
        event,
        element,
        targetSelector,
        swapStrategy,
        method: requestConfig.method,
        url: appendQueryParams(
          requestConfig.url,
          collectQueryParams(element),
        ),
      };

      sendRequest(sendRequestParams)
        .then((result) => {
          if (result.html !== null) {
            performSwap({
              content: result.html,
              element,
              targetSelector,
              swapStrategy: result.swapStrategy,
              observeElementsWithAppearEvent,
            });
          } else if (result.text !== null) {
            for (const target of result.targets) {
              target.textContent = result.text;
            }
          } else if (result.event) {
            broadcastEvent(result.event);
          }
          if (result.pushUrl) {
            handlePush(result.pushUrl);
            broadcastEvent("slim:push");
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

    if (templateSelector) {
      handleTemplate({
        element,
        templateSelector,
        targetSelector,
        swapStrategy,
        observeElementsWithAppearEvent,
      });
    }
  }

  function handleEmit(element: Element, emit: EmitSpec) {
    if (!emit.delay) {
      broadcastEvent(emit.event);
    } else {
      setTimeout(
        () => {
          if (!element.parentElement) return;
          broadcastEvent(emit.event);
        },
        emit.delay,
      );
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
