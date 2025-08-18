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
      event: null,
      targets: []
    });
  }
  const serverTargetSelector = response.headers.get("S-Target");
  const finalTargetSelector = serverTargetSelector || targetSelector;
  return response.text().then((text) => {
    const contentType = response.headers.get("content-type");
    const mediaType = contentType?.split(";")[0];
    switch (mediaType) {
      case "text/html":
        return {
          status: response.status,
          html: text,
          event: null,
          targets: determineTargets(element, finalTargetSelector)
        };
      case "text/plain":
        return {
          status: response.status,
          html: null,
          event: text,
          targets: []
        };
      default:
        return {
          status: response.status,
          html: null,
          event: null,
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
function shouldHandleEvent(event, eventSpec) {
  if (eventSpec.event !== event.type) {
    return false;
  }
  if (eventSpec.selector) {
    const target = event.target;
    return target.matches(eventSpec.selector);
  }
  return true;
}
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
      return [];
  }
}
function parseOneEventSpec(spec) {
  const parts = spec.split(/\s+/);
  if (parts.length === 1) {
    return {
      event: parts[0]
    };
  } else if (parts.length === 3 && parts[1] === "on") {
    return {
      event: parts[0],
      selector: parts[2]
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
  function processElement(element, event, bubble) {
    const emit = element.getAttribute("s-emit");
    if (emit) {
      event.preventDefault();
      broadcastEvent(emit);
      return;
    }
    const config = getElementConfig(element, "get") ?? getElementConfig(element, "post") ?? getElementConfig(element, "put") ?? getElementConfig(element, "delete");
    if (config) {
      const { url, method } = config;
      const eventSpecs = parseEventSpecs(element);
      for (const spec of eventSpecs) {
        if (shouldHandleEvent(event, spec)) {
          handleEvent(url, method, element);
          event.preventDefault();
          break;
        }
      }
    } else {
      if (!bubble) return;
      const parent = element.parentElement;
      if (parent) {
        processElement(parent, event, true);
      }
    }
  }
  function handleEvent(url, method, element) {
    const queryParams = collectQueryParams(element);
    const urlWithQueryParams = appendQueryParams(url, queryParams);
    const confirmMessage = element.getAttribute("s-confirm");
    if (!confirmMessage || confirm(confirmMessage)) {
      sendRequest(urlWithQueryParams, method, element).then((result) => {
        if (result.html !== null) {
          result.targets.forEach((target) => {
            target.innerHTML = result.html;
            processAppearEvents(target);
          });
        } else if (result.event) {
          broadcastEvent(result.event);
        }
      }).catch((error) => {
        console.error("Request failed:", error);
      });
    }
  }
  function handleAppearIntersection(entries) {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const element = entry.target;
        const appearEvent = new CustomEvent("appear", {
          bubbles: false,
          cancelable: true
        });
        processElement(element, appearEvent, false);
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
  function processAppearEvents(rootElement) {
    const elements = rootElement.querySelectorAll("[s-on]");
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
      "submit"
    ];
    for (const eventType of eventTypesToProcess) {
      document.body.addEventListener(eventType, (event) => {
        processElement(event.target, event, true);
      }, {
        capture: true
      });
    }
  }
  function broadcastEvent(eventType) {
    const elements = document.querySelectorAll(`[s-on*="${eventType}"]`);
    for (const element of elements) {
      const syntheticEvent = new CustomEvent(eventType, {
        bubbles: false,
        cancelable: true
      });
      processElement(element, syntheticEvent, false);
    }
  }
  function enableWebSockets() {
    const url = document.body.getAttribute("s-ws");
    if (!url) return;
    const ws = new WebSocket(url);
    ws.onmessage = (event) => {
      const eventType = event.data.toString();
      broadcastEvent(eventType);
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
