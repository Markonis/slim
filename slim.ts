(function() {
  const prefix = "s";

  type EventSpec = {
    selector?: string;
    event: string;
  };
  
  type PrepareFormDataResult = {
    url: string;
    body: FormData | null;
  }
  
  type RequestResult = {
    status: number;
    html: string | null;
    targets: Element[];
  }
  
  function processElement(element: Element, event: Event) {
    let url: string | null = null;
    let method: string | null = null;
  
    if (url = element.getAttribute(`${prefix}-get`)) {
      method = "GET";
    } else if (url = element.getAttribute(`${prefix}-post`)) {
      method = "POST";
    } else if (url = element.getAttribute(`${prefix}-put`)) {
      method = "PUT";
    } else if (url = element.getAttribute(`${prefix}-delete`)) {
      method = "DELETE";
    }
  
    if (url && method) {
      const targetSelector = element.getAttribute(`${prefix}-target`);
      const eventSpecs = parseEventSpecs(element.getAttribute(`${prefix}-on`));
      for (const spec of eventSpecs) {
        if (shouldHandleEvent(event, spec)) {
          handleEvent(event, url, method, element, targetSelector);
          event.preventDefault();
          break;
        }
      }
    }
  
    const parent = element.parentElement;
    if (parent) {
      processElement(parent, event);
    }
  }
  
  function handleEvent(event: Event, url: string, method: string, element: Element, targetSelector: string | null) {
    sendRequest(url, method, element, targetSelector)
      .then(result => {
        if (result.html) {
          result.targets.forEach(target => {
            target.innerHTML = result.html!;
          });
        }
      })
      .catch(error => {
        console.error('Request failed:', error);
      });
  }
  
  function processResponse(response: Response, element: Element, targetSelector: string | null): Promise<RequestResult> {
    const serverTargetSelector = response.headers.get('S-Target');
    const finalTargetSelector = serverTargetSelector || targetSelector;
    
    return response.text().then(text => {
      const isHtml = response.headers.get('content-type')?.includes('text/html');
      const html = isHtml ? text : null;
      const targets = determineTargets(element, finalTargetSelector);
      
      return {
        status: response.status,
        html,
        targets
      };
    });
  }
  
  function determineTargets(element: Element, targetSelector: string | null): Element[] {
    if (!targetSelector) {
      return [element];
    }
    
    const targets = document.querySelectorAll(targetSelector);
    return Array.from(targets);
  }
  
  function prepareFormData(form: HTMLFormElement, method: string, url: string): PrepareFormDataResult {
    const formData = new FormData(form);
    
    if (method.toUpperCase() === 'GET') {
      const urlObj = new URL(url);
      for (const [key, value] of formData.entries()) {
        // Skip file inputs when encoding as URL parameters
        if (value instanceof File) {
          continue;
        }
        urlObj.searchParams.append(key, value.toString());
      }
      return { url: urlObj.toString(), body: null };
    } else {
      return { url, body: formData };
    }
  }
  
  function sendFormRequest(url: string, method: string, element: HTMLFormElement, targetSelector: string | null): Promise<RequestResult> {
    const { url: finalUrl, body } = prepareFormData(element, method, url);
  
    const fetchOptions: RequestInit = { method };
    if (body) {
      fetchOptions.body = body;
    }
    
    return fetch(finalUrl, fetchOptions)
      .then(response => processResponse(response, element, targetSelector));
  }
  
  function sendRequest(url: string, method: string, element: Element, targetSelector: string | null): Promise<RequestResult> {
    if (element instanceof HTMLFormElement) {
      return sendFormRequest(url, method, element, targetSelector);
    } else {
      return fetch(url, { method })
        .then(response => processResponse(response, element, targetSelector));
    }
  }
  
  function shouldHandleEvent(event: Event, eventSpec: EventSpec) {
    if (eventSpec.event !== event.type) {
      return false;
    }
  
    if (eventSpec.selector) {
      const target = event.target as Element;
      return target.matches(eventSpec.selector);
    }
  
    return true;
  }
  
  function parseEventSpecs(spec: string | null): EventSpec[] {
    if (!spec) return [];
    const parts = spec.split(/\s*\|\s*/);
    return parts.map(parseOneEventSpec).filter(Boolean) as EventSpec[];
  }
  
  function parseOneEventSpec(spec: string): EventSpec | null {
    // format is one of:
    // <event>
    // <event> on <selector>
    const parts = spec.split(/\s+/);
    if (parts.length === 1) {
      return { event: parts[0] };
    } else if (parts.length === 3 && parts[1] === "on") {
      return { event: parts[0], selector: parts[2] };
    } else {
      console.warn(`Invalid event spec: ${spec}`);
      return null;
    }
  }
  
  const eventTypesToProcess = ["click", "change", "input", "submit"];
  document.addEventListener("DOMContentLoaded", () => {
    eventTypesToProcess.forEach((eventType) => {
      document.body.addEventListener(eventType, (event) => {
        processElement(event.target as Element, event);
      }, { capture: true });
    });
  });  
})();
