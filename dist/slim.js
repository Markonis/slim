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
  return params;
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
function sendRequest(url, method, element) {
  const targetSelector = element.getAttribute("s-target");
  if (element instanceof HTMLFormElement) {
    return sendFormRequest(url, method, element, targetSelector);
  } else {
    return fetch(url, {
      method
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

// src/main.ts
(function() {
  let appearObserver;
  function getElementConfig(element, method) {
    const url = element.getAttribute(`s-${method}`);
    if (url) return {
      url,
      method
    };
    return null;
  }
  function queryEventHandlingElements(root = document.body) {
    return root.querySelectorAll("[s-get],[s-post],[s-put],[s-delete],[s-emit]");
  }
  function broadcastEvent(eventOrType) {
    const event = eventOrType instanceof Event ? eventOrType : new CustomEvent(eventOrType);
    const elements = queryEventHandlingElements();
    const globalHandlers = [];
    const localHandlers = [];
    for (const element of elements) {
      const emit = element.getAttribute("s-emit");
      const config = getAnyElementConfig(element);
      if (!emit && !config) continue;
      const specs = parseEventSpecs(element);
      for (const spec of specs) {
        if (spec.event !== event.type) continue;
        if (spec.selector) {
          globalHandlers.push({
            element,
            emit,
            config,
            spec
          });
        } else {
          localHandlers.push({
            element,
            emit,
            config,
            spec
          });
        }
      }
    }
    if (event.target && event.target instanceof Element) {
      let current = event.target;
      while (current) {
        const localHandler = localHandlers.find((handler) => handler.element.isSameNode(current));
        if (localHandler) {
          handleEvent(localHandler);
        }
        const matchingGlobalHandlers = globalHandlers.filter((handler) => current.matches(handler.spec.selector));
        for (const globalHandler of matchingGlobalHandlers) {
          handleEvent(globalHandler);
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
        if (handler.spec.event === event.type) {
          handleEvent(handler);
        }
      }
    }
  }
  function getAnyElementConfig(element) {
    return getElementConfig(element, "get") ?? getElementConfig(element, "post") ?? getElementConfig(element, "put") ?? getElementConfig(element, "delete");
  }
  function handleEvent({ element, config, emit }) {
    const confirmMessage = element.getAttribute("s-confirm");
    if (confirmMessage && !confirm(confirmMessage)) return;
    const queryParams = collectQueryParams(element);
    if (emit) {
      broadcastEvent(emit);
    }
    if (config) {
      const urlWithQueryParams = appendQueryParams(config.url, queryParams);
      sendRequest(urlWithQueryParams, config.method, element).then((result) => {
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
  function handleAppearIntersection(entries) {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const element = entry.target;
        element.dispatchEvent(new CustomEvent("appear"));
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
      "appear"
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
