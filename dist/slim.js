// src/query.ts
function collectQueryParams(element) {
  const params = new URLSearchParams();
  let currentElement = element;
  const ancestors = [];
  while (currentElement) {
    ancestors.unshift(currentElement);
    currentElement = currentElement.parentElement;
  }
  for (const ancestor of ancestors) {
    const queryAttr = ancestor.getAttribute("s-query");
    if (queryAttr) {
      const ancestorParams = new URLSearchParams(queryAttr);
      ancestorParams.forEach((value, key) => params.set(key, value));
    }
  }
  if (element instanceof HTMLFormElement) return params;
  const children = Array.from(element.querySelectorAll("input, select, textarea")).reverse();
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
    if (value) params.set(elementName, value);
  }
  return params;
}
function getElementValue(element) {
  return "value" in element ? element.value : "";
}
function appendQueryParams(url, params) {
  if (params.toString() === "") {
    return url;
  }
  const urlObj = new URL(url, location.origin);
  params.forEach((value, key) => {
    urlObj.searchParams.set(key, value);
  });
  return urlObj.toString();
}

// src/response.ts
function createEmptyResult(status, swapStrategy) {
  return Promise.resolve({
    status,
    html: null,
    text: null,
    event: null,
    targets: [],
    swapStrategy,
    pushUrl: null
  });
}
function processResponse(response, element, targetSelector, swapStrategy) {
  if (response.headers.get("S-Refresh") === "true") {
    location.reload();
    return createEmptyResult(response.status, swapStrategy);
  }
  const redirectLocation = response.headers.get("S-Redirect");
  if (redirectLocation) {
    window.location.href = redirectLocation;
    return createEmptyResult(response.status, swapStrategy);
  }
  const serverTargetSelector = response.headers.get("S-Target");
  const finalTargetSelector = serverTargetSelector || targetSelector;
  const event = response.headers.get("S-Emit");
  const serverSwapStrategy = response.headers.get("S-Swap");
  const finalSwapStrategy = serverSwapStrategy === "outer" ? "outer" : swapStrategy;
  const pushUrl = response.headers.get("S-Push");
  return response.text().then((text) => {
    const contentType = response.headers.get("content-type");
    const mediaType = contentType?.split(";")[0];
    const targets = determineTargets(element, finalTargetSelector);
    switch (mediaType) {
      case "text/html":
        return {
          status: response.status,
          html: text,
          text: null,
          event,
          targets,
          swapStrategy: finalSwapStrategy,
          pushUrl
        };
      case "text/plain":
        return {
          status: response.status,
          html: null,
          text,
          event,
          targets,
          swapStrategy: finalSwapStrategy,
          pushUrl
        };
      default:
        return {
          status: response.status,
          html: null,
          text: null,
          event,
          targets: [],
          swapStrategy: finalSwapStrategy,
          pushUrl
        };
    }
  });
}
function determineTargets(element, targetSelector) {
  if (!targetSelector) return [
    element
  ];
  const targets = document.querySelectorAll(targetSelector);
  return Array.from(targets);
}

// src/request.ts
function prepareFormData(form, method, url) {
  const formData = new FormData(form);
  if (method.toUpperCase() === "GET") {
    const urlObj = getFullURL(url);
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) continue;
      urlObj.searchParams.append(key, value.toString());
    }
    return {
      url: urlObj.toString(),
      body: null
    };
  } else {
    return {
      url,
      body: formData
    };
  }
}
function getFullURL(url) {
  if (url.startsWith("http")) {
    return new URL(url);
  } else {
    return new URL(url, location.origin);
  }
}
function sendFormRequest(url, method, element, targetSelector, swapStrategy) {
  const { url: finalUrl, body } = prepareFormData(element, method, url);
  const fetchOptions = {
    method,
    redirect: "manual",
    mode: "same-origin"
  };
  if (body) {
    fetchOptions.body = body;
  }
  if (!fetchOptions.headers) {
    fetchOptions.headers = {};
  }
  const headers = fetchOptions.headers;
  headers["S-Location"] = window.location.href;
  return fetch(finalUrl, fetchOptions).then((response) => processResponse(response, element, targetSelector, swapStrategy));
}
function sendRequest(params) {
  const { event, url, method, element, targetSelector, swapStrategy } = params;
  if (element instanceof HTMLFormElement) {
    return sendFormRequest(url, method, element, targetSelector, swapStrategy);
  } else {
    const headers = {};
    let body;
    if (event instanceof DragEvent) {
      const json = event.dataTransfer?.getData("application/json");
      if (json) {
        headers["Content-Type"] = "application/json";
        body = json;
      }
    }
    headers["S-Location"] = window.location.href;
    return fetch(url, {
      method,
      headers,
      body,
      redirect: "manual",
      mode: "same-origin"
    }).then((response) => processResponse(response, element, targetSelector, swapStrategy));
  }
}

// src/event.ts
function parseEventSpecs(element) {
  const spec = element.getAttribute("s-on");
  if (!spec) return getDefaultEventSpecs(element);
  const parts = spec.split(/\s*\|\s*/);
  return parts.map(parseOneEventSpec).filter(Boolean);
}
function getDefaultEventSpecs(element) {
  switch (element.tagName) {
    case "FORM":
      return [
        {
          event: "submit"
        }
      ];
    case "BUTTON":
      return [
        {
          event: "click"
        }
      ];
    case "SELECT":
    case "INPUT":
      return [
        {
          event: "change"
        }
      ];
    default:
      return [
        {
          event: "appear"
        }
      ];
  }
}
function parseOneEventSpec(spec) {
  const parts = spec.split(/\s+on\s+/);
  if (parts.length === 1) {
    return {
      event: parts[0]
    };
  } else if (parts.length === 2) {
    return {
      event: parts[0],
      selector: parts[1]
    };
  } else {
    console.warn(`Invalid event spec: ${spec}`);
    return null;
  }
}

// src/dnd.ts
function handleDragEvents(element, event) {
  if (!(event instanceof DragEvent) || !event.dataTransfer) return;
  if (event.type === "dragstart") {
    const dragJSON = element.getAttribute("s-drag-json");
    const dragEffect = element.getAttribute("s-drag-effect");
    if (dragJSON) {
      event.dataTransfer.setData("application/json", dragJSON);
    }
    if (dragEffect) {
      event.dataTransfer.effectAllowed = dragEffect;
    }
  }
  const dropClass = element.getAttribute("s-drop-class");
  const dropEffect = element.getAttribute("s-drop-effect");
  if (event.type === "dragover") {
    if (!dropEffect) return;
    event.preventDefault();
    event.dataTransfer.dropEffect === dropEffect;
    if (dropClass) {
      element.classList.add(dropClass);
    }
  } else if (event.type === "dragleave" && dropClass) {
    element.classList.remove(dropClass);
  }
}

// src/emit.ts
function getEmitSpec(element) {
  const emitStr = element.getAttribute("s-emit");
  if (!emitStr) return null;
  const parts = emitStr.split(/\s+after\s/);
  if (parts.length === 2) {
    const event = parts[0];
    let delay = parseFloat(parts[1]);
    if (!event || isNaN(delay)) return null;
    if (parts[1].endsWith("s")) delay *= 1e3;
    delay = Math.round(delay);
    return {
      event,
      delay
    };
  } else {
    return {
      event: parts[0],
      delay: 0
    };
  }
}

// src/eval.ts
function getEvalCode(element) {
  return element.getAttribute("s-eval");
}
function handleEval(code, element, event) {
  try {
    const fn = new Function("event", code);
    fn.call(element, event);
  } catch (error) {
    console.error("s-eval execution failed:", error);
  }
}

// src/swap.ts
function getSwapStrategy(element) {
  const swapValue = element.getAttribute("s-swap");
  if (swapValue === "outer") return "outer";
  return "inner";
}
function performInnerSwap(target, content, observeElementsWithAppearEvent) {
  target.innerHTML = content;
  observeElementsWithAppearEvent(target);
}
function performOuterSwap(target, content, observeElementsWithAppearEvent) {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = content;
  const newElements = [];
  while (tempDiv.firstChild) {
    const node = tempDiv.firstChild;
    if (node.nodeType === Node.ELEMENT_NODE) {
      newElements.push(node);
    }
    if (target.parentElement) {
      target.parentElement.insertBefore(node, target);
    }
  }
  if (target.parentElement) {
    target.parentElement.removeChild(target);
  }
  for (const newElement of newElements) {
    observeElementsWithAppearEvent(newElement);
  }
}
function performSwap(params) {
  const { content, element, targetSelector, swapStrategy, observeElementsWithAppearEvent } = params;
  const targets = determineTargets(element, targetSelector);
  for (const target of targets) {
    if (swapStrategy === "outer") {
      performOuterSwap(target, content, observeElementsWithAppearEvent);
    } else {
      performInnerSwap(target, content, observeElementsWithAppearEvent);
    }
  }
}

// src/template.ts
function getTemplateSelector(element) {
  return element.getAttribute("s-template");
}
function handleTemplate(params) {
  const { element, templateSelector, targetSelector, swapStrategy, observeElementsWithAppearEvent } = params;
  if (!templateSelector) return;
  const template = document.querySelector(templateSelector);
  if (template) {
    performSwap({
      content: template.innerHTML,
      element,
      targetSelector,
      swapStrategy,
      observeElementsWithAppearEvent
    });
  }
}

// src/push.ts
function getPushUrl(element) {
  const pushUrl = element.getAttribute("s-push");
  return pushUrl || null;
}
function handlePush(url) {
  window.history.pushState({}, "", url);
}

// src/main.ts
(function() {
  let appearObserver;
  function getElementRequestConfig(element, method) {
    const url = element.getAttribute(`s-${method}`);
    if (url) return {
      url,
      method
    };
    return null;
  }
  function queryEventHandlingElements(root = document.body) {
    return root.querySelectorAll("[s-get],[s-post],[s-put],[s-delete],[s-emit],[s-eval],[s-template],[s-push]");
  }
  function broadcastEvent(eventOrType) {
    const event = eventOrType instanceof Event ? eventOrType : new CustomEvent(eventOrType);
    const elements = queryEventHandlingElements();
    const globalHandlers = [];
    const localHandlers = [];
    for (const element of elements) {
      const emitSpec = getEmitSpec(element);
      const requestConfig = getAnyElementRequestConfig(element);
      const evalCode = getEvalCode(element);
      const templateSelector = getTemplateSelector(element);
      const targetSelector = element.getAttribute("s-target");
      const pushUrl = getPushUrl(element);
      if (!emitSpec && !requestConfig && !evalCode && !templateSelector && !pushUrl) {
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
          pushUrl
        });
      }
    }
    if (event.target && event.target instanceof Element) {
      let current = event.target;
      handleDragEvents(current, event);
      while (current) {
        const localHandler = localHandlers.find((handler) => handler.element.isSameNode(current));
        if (localHandler) {
          handleEvent(localHandler);
        }
        const matchingGlobalHandlers = globalHandlers.filter((handler) => current.matches(handler.eventSpec.selector));
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
    } else {
      for (const handler of [
        ...globalHandlers,
        ...localHandlers
      ]) {
        if (handler.eventSpec.event === event.type) {
          handleEvent(handler);
        }
      }
    }
  }
  function getAnyElementRequestConfig(element) {
    return getElementRequestConfig(element, "get") ?? getElementRequestConfig(element, "post") ?? getElementRequestConfig(element, "put") ?? getElementRequestConfig(element, "delete");
  }
  function handleEvent({ event, element, requestConfig, emitSpec, evalCode, templateSelector, targetSelector, swapStrategy, pushUrl }) {
    const confirmMessage = element.getAttribute("s-confirm");
    if (confirmMessage && !confirm(confirmMessage)) return;
    if (evalCode) {
      handleEval(evalCode, element, event);
    }
    if (pushUrl) {
      handlePush(pushUrl);
      broadcastEvent("location:change");
    }
    if (emitSpec) {
      handleEmit(element, emitSpec);
    }
    if (requestConfig) {
      const sendRequestParams = {
        event,
        element,
        targetSelector,
        swapStrategy,
        method: requestConfig.method,
        url: appendQueryParams(requestConfig.url, collectQueryParams(element))
      };
      sendRequest(sendRequestParams).then((result) => {
        if (result.html !== null) {
          performSwap({
            content: result.html,
            element,
            targetSelector,
            swapStrategy: result.swapStrategy,
            observeElementsWithAppearEvent
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
          broadcastEvent("location:change");
        }
        element.dispatchEvent(new CustomEvent("slim:ok"));
      }).catch((error) => {
        console.error("Request failed:", error);
        element.dispatchEvent(new CustomEvent("slim:error"));
      }).finally(() => {
        element.dispatchEvent(new CustomEvent("slim:done"));
      });
    }
    if (templateSelector) {
      handleTemplate({
        element,
        templateSelector,
        targetSelector,
        swapStrategy,
        observeElementsWithAppearEvent
      });
    }
  }
  function handleEmit(element, emit) {
    if (!emit.delay) {
      broadcastEvent(emit.event);
    } else {
      setTimeout(() => {
        if (!element.parentElement) return;
        broadcastEvent(emit.event);
      }, emit.delay);
    }
  }
  function handleAppearIntersection(entries) {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const element = entry.target;
        element.dispatchEvent(new CustomEvent("appear", {
          bubbles: false
        }));
        appearObserver.unobserve(element);
      }
    }
  }
  function initializeAppearObserver() {
    const options = {
      root: null,
      threshold: 0
    };
    appearObserver = new IntersectionObserver(handleAppearIntersection, options);
  }
  function observeElementsWithAppearEvent(rootElement) {
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
      "drop"
    ];
    for (const eventType of eventTypesToProcess) {
      document.body.addEventListener(eventType, (event) => {
        if (event.type === "submit") event.preventDefault();
        broadcastEvent(event);
      }, {
        capture: true
      });
    }
    addEventListener("popstate", () => {
      broadcastEvent("location:change");
    });
    addEventListener("hashchange", () => {
      broadcastEvent("hash:change");
    });
  }
  function createWebSocket(handleError) {
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
      setTimeout(() => initWebSockets(), 1e3);
    });
  }
  window.slim = {
    broadcastEvent
  };
  document.addEventListener("DOMContentLoaded", () => {
    initializeAppearObserver();
    registerEventHandlers();
    initWebSockets();
    observeElementsWithAppearEvent(document.body);
  });
})();
