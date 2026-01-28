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
function processResponse(response, element, targetSelector) {
  if (response.headers.get("S-Refresh") === "true") {
    location.reload();
    return Promise.resolve({
      status: response.status,
      html: null,
      text: null,
      event: null,
      targets: []
    });
  }
  if (!response.ok) {
    return Promise.reject();
  }
  const serverTargetSelector = response.headers.get("S-Target");
  const finalTargetSelector = serverTargetSelector || targetSelector;
  const event = response.headers.get("S-Emit");
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
          targets
        };
      case "text/plain":
        return {
          status: response.status,
          html: null,
          text,
          event,
          targets
        };
      default:
        return {
          status: response.status,
          html: null,
          text: null,
          event,
          targets: []
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
function sendFormRequest(url, method, element, targetSelector) {
  const { url: finalUrl, body } = prepareFormData(element, method, url);
  const fetchOptions = {
    method
  };
  if (body) {
    fetchOptions.body = body;
  }
  return fetch(finalUrl, fetchOptions).then((response) => processResponse(response, element, targetSelector));
}
function sendRequest(event, url, method, element) {
  const targetSelector = element.getAttribute("s-target");
  if (element instanceof HTMLFormElement) {
    return sendFormRequest(url, method, element, targetSelector);
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
    return fetch(url, {
      method,
      headers,
      body
    }).then((response) => processResponse(response, element, targetSelector));
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

// src/template.ts
function getTemplateSelector(element) {
  return element.getAttribute("s-template");
}
function handleTemplate(element, selector) {
  if (!selector) return;
  const template = document.querySelector(selector);
  if (template) {
    element.innerHTML = template.innerHTML;
  }
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
    return root.querySelectorAll("[s-get],[s-post],[s-put],[s-delete],[s-emit],[s-eval],[s-template]");
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
      if (!emitSpec && !requestConfig && !evalCode && !templateSelector) {
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
          templateSelector
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
  function handleEvent({ event, element, requestConfig, emitSpec, evalCode, templateSelector }) {
    const confirmMessage = element.getAttribute("s-confirm");
    if (confirmMessage && !confirm(confirmMessage)) return;
    if (evalCode) {
      handleEval(evalCode, element, event);
    }
    if (emitSpec) {
      handleEmit(element, emitSpec);
    }
    if (templateSelector) {
      handleTemplate(element, templateSelector);
    }
    if (requestConfig) {
      const queryParams = collectQueryParams(element);
      const urlWithQueryParams = appendQueryParams(requestConfig.url, queryParams);
      sendRequest(event, urlWithQueryParams, requestConfig.method, element).then((result) => {
        if (result.html !== null) {
          for (const target of result.targets) {
            target.innerHTML = result.html;
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
      }).catch((error) => {
        console.error("Request failed:", error);
        element.dispatchEvent(new CustomEvent("slim:error"));
      }).finally(() => {
        element.dispatchEvent(new CustomEvent("slim:done"));
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
  document.addEventListener("DOMContentLoaded", () => {
    initializeAppearObserver();
    registerEventHandlers();
    initWebSockets();
    observeElementsWithAppearEvent(document.body);
  });
})();
