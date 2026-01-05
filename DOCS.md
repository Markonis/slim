# Slim - Complete Documentation

## Introduction

Slim is a declarative frontend framework for building interactive web applications with minimal JavaScript. Instead of writing imperative code to handle user interactions, you declare behavior directly in HTML attributes. Slim intercepts browser events, constructs HTTP requests with your data, sends them to the server, and updates the DOM with responses.

The core philosophy is server-driven interactivity: your server renders HTML with Slim attributes, and Slim handles the rest. This approach eliminates boilerplate, keeps JavaScript minimal, and allows you to build complex UIs with just HTML and attributes.

## Request Lifecycle

Understanding how requests flow through Slim is essential. Here's what happens from user interaction to DOM update:

### Event Triggering

Slim listens for events on `document.body` using event capture. When an event occurs, Slim checks if the element or any ancestor has Slim attributes (`s-get`, `s-post`, `s-put`, `s-delete`, `s-emit`).

Events that trigger request handling are: `click`, `change`, `input`, `submit`, `appear`, `dragstart`, `dragover`, `dragleave`, and `drop`.

If an element doesn't have `s-on`, it uses a default event based on its tag:
- `<form>` → `submit`
- `<button>` → `click`
- `<input>`, `<select>` → `change` (also listens to `input`)
- All other elements → `appear`

### Event Propagation & Delegation

When an event fires, Slim walks up the DOM tree from the target element to the root. For each ancestor, it checks for matching event handlers:

- **Local handlers**: Elements without a selector in `s-on` only respond if they're the event target or an ancestor of it
- **Global handlers**: Elements with a selector in `s-on` (like `s-on="click on .item"`) check if the event target matches that selector

Appear events don't bubble up, so they only fire on the element itself.

### Request Construction

If a matching handler has an HTTP method attribute (`s-get`, `s-post`, etc.), Slim constructs a request:

1. **URL Building**: Takes the URL from the attribute and appends query parameters (described below)
2. **Data Collection**: Gathers form data or drag data
3. **Headers**: Sets Content-Type if needed (JSON for drag-drop, otherwise FormData)

### Request Execution

Slim sends the request using the Fetch API with the appropriate HTTP method. For form submissions, the event's `preventDefault()` is called to prevent browser default behavior.

### Response Processing

When the response arrives:

1. **Status Check**: Non-2xx status codes fail the request
2. **Headers**: Slim checks for `S-Target` (override target selector), `S-Emit` (event to broadcast), and `S-Refresh` (reload page)
3. **Content-Type**: Determines how to update the DOM
4. **DOM Update**: Updates the target element(s)

### UI Updates

Based on the response's `Content-Type`:

- `text/html`: Sets target's `innerHTML` to the response text
- `text/plain`: Sets target's `textContent` to the response text
- Other types: Only processes headers, no DOM update

If the response HTML contains elements with appear events, Slim observes them with the IntersectionObserver.

### Event Emission

After DOM updates, any `S-Emit` header value is broadcast as a custom event. This event can trigger other elements' handlers, creating chains of requests.

## Attributes Reference

### HTTP Method Attributes

`s-get`, `s-post`, `s-put`, `s-delete` specify which HTTP method to use and the endpoint URL.

```html
<button s-get="/api/data">Load</button>
<form s-post="/api/users">...</form>
<div s-put="/api/update">Update</div>
```

These attributes work on any element, not just forms and buttons. When an event fires (based on `s-on` or default bindings), the request is sent.

For form elements, all inputs are automatically collected as request data. For other elements, only descendant form inputs are collected.

### Event Handling Attributes

`s-on` specifies which event(s) trigger the request or emission.

Simple event:
```html
<button s-on="click" s-get="/api/data">Click me</button>
```

Multiple events (separated by `|`):
```html
<div s-on="click | change" s-get="/api/data">
  <button>Click</button>
  <input type="checkbox">
</div>
```

Event delegation with selector:
```html
<ul s-on="click on .item" s-delete="/api/items">
  <li class="item">Item 1</li>
  <li class="item">Item 2</li>
</ul>
```

The `on .selector` syntax means "when a click happens on an element matching `.item` inside this element, trigger the handler on this element."

If `s-on` is omitted, the default event for that element type is used (see Event Triggering section).

### Targeting Attributes

`s-target` specifies which element(s) should be updated with the response.

```html
<button s-get="/api/data" s-target="#result">Load</button>
<div id="result"></div>
```

If `s-target` is omitted, the element that triggered the request is updated (the default).

The server can override the target by sending an `S-Target: selector` response header:

```html
<button s-get="/api/data" s-target="#default">
  Load (may update #other instead)
</button>
```

If the server responds with `S-Target: #other`, that element will be updated instead of `#default`.

The selector can match multiple elements. All matching elements are updated with the same response.

### Event Emission

`s-emit` broadcasts a custom event that other elements can listen for with `s-on`.

Immediate emission:
```html
<button s-emit="data-updated">Refresh</button>
```

Delayed emission (1.5 seconds):
```html
<button s-emit="data-updated after 1.5s">Refresh</button>
```

The delay can be in milliseconds or seconds (with `s` suffix):
```html
<button s-emit="event after 500">After 500ms</button>
<button s-emit="event after 2s">After 2 seconds</button>
```

An element can have both a request attribute and `s-emit`. The emit happens after the request completes:

```html
<button s-post="/api/create" s-emit="items-updated">
  Create Item
</button>
```

When `s-emit` has a delay, it waits before broadcasting. If the element is removed from the DOM before the delay completes, the event is not emitted.

### User Interaction

`s-confirm` shows a browser confirmation dialog before executing the request.

```html
<button s-confirm="Delete this item?" s-delete="/api/items/1">
  Delete
</button>
```

If the user clicks "Cancel", the request is not sent. The element triggering the request determines what happens—if there's both `s-confirm` and `s-emit`, neither executes on cancellation.

### Query Parameters

`s-query` adds query parameters to the request URL. Parameters from ancestor elements cascade down and can be overridden by child elements.

```html
<body s-query="org=acme">
  <div s-query="team=sales">
    <button s-get="/api/data">
      <!-- Request: /api/data?org=acme&team=sales -->
    </button>
  </div>
  <div s-query="team=marketing">
    <button s-get="/api/data">
      <!-- Request: /api/data?org=acme&team=marketing -->
    </button>
  </div>
</body>
```

If a parent and child have the same parameter key, the child's value wins.

For GET requests, form field values are also appended as query parameters (skipping file inputs).

`s-query` expects URL-encoded parameters in the format `key=value&key2=value2`.

### WebSocket

`s-ws` on `<body>` establishes a WebSocket connection. Every message received becomes a custom event name.

```html
<body s-ws="/ws">
  <div s-on="user-joined" s-get="/api/users" s-target="#list">
    <ul id="list"></ul>
  </div>
</body>
```

If the server sends a WebSocket message `user-joined`, it broadcasts a custom event with that name. Any element listening for `user-joined` will trigger its handler.

If the WebSocket connection fails or closes, Slim automatically attempts to reconnect after 1 second. This continues indefinitely.

### Drag & Drop

Slim supports HTML5 drag and drop with JSON data transfer.

On draggable elements:
```html
<div draggable s-drag-json='{"id":"123", "name":"Item"}'>
  Draggable item
</div>
```

On drop targets:
```html
<div s-on="drop" s-post="/api/move" s-drop-effect="move" s-drop-class="drop-active">
  Drop here
</div>
```

Attributes:

- `s-drag-json`: JSON string that's transferred when the element is dragged
- `s-drag-effect`: Visual effect during drag (copy, move, link)
- `s-drop-effect`: Indicates this element accepts drops (copy, move, link). Also enables `dragover` handling
- `s-drop-class`: CSS class added to the drop target during `dragover`, removed on `dragleave`

When an element is dropped on a target, the target's request is sent with the JSON data as the request body (Content-Type: application/json).

## Event System

### How Events Work

Events in Slim are the glue connecting different parts of the page. When you emit a custom event, Slim broadcasts it to all elements listening for that event, regardless of where they are in the DOM.

Slim distinguishes between:
- **User interaction events** (click, change, submit): Propagate from the target element up through ancestors
- **Broadcasted events** (custom events from `s-emit` or WebSocket): Broadcast globally to all listeners

### Event Delegation

Event delegation allows a single element to handle events for multiple descendants. This is useful for dynamic lists:

```html
<ul s-on="click on .delete-btn" s-delete="/api/items">
  <li>Item 1 <button class="delete-btn">Delete</button></li>
  <li>Item 2 <button class="delete-btn">Delete</button></li>
</ul>
```

When a click happens anywhere in the list, if the target matches `.delete-btn`, the handler fires. The `element` triggering the request is the `<ul>`, so the entire list can be refreshed by the server response.

### Appear Events

The `appear` event fires when an element scrolls into the viewport. This is useful for lazy loading:

```html
<div s-on="appear" s-get="/api/lazy-content">
  Content loads when scrolled into view
</div>
```

Appear events use the Intersection Observer API and only fire once per element. After the element becomes visible, it's unobserved. If it scrolls out and back in, the event won't fire again.

### Custom Events vs Browser Events

Browser events (click, change, submit) propagate from the event target up the DOM tree. Slim checks each ancestor for matching handlers.

Custom events (created by `s-emit` or WebSocket) are broadcasted globally. All elements listening for that event name receive it, regardless of DOM position.

```html
<!-- This fires on the button click -->
<button s-on="click" s-post="/api/update" s-emit="items-changed">
  Update
</button>

<!-- This listens for the custom event, even if far away -->
<div s-on="items-changed" s-get="/api/items" s-target="#list">
  <ul id="list"></ul>
</div>
```

## Data Collection & Processing

### Query Parameters

Slim collects query parameters from multiple sources and appends them to the request URL.

**From attributes**: Elements with `s-query` contribute their parameters. Parameters cascade from ancestors down to the element making the request. Child parameters override parent parameters with the same key.

**From form fields**: For GET requests, all `<input>`, `<select>`, and `<textarea>` descendants (or the element itself if it's a form input) are collected as query parameters. File inputs are skipped for GET requests.

The final URL looks like: `/api/endpoint?param1=value1&param2=value2&field1=value`

Parameter collection works even for non-form elements:

```html
<div s-query="org=acme" s-get="/api/data">
  <input name="user_id" value="123">
  <!-- Request: /api/data?org=acme&user_id=123 -->
</div>
```

### Form Data

For POST/PUT/DELETE requests from form elements, all form inputs are automatically serialized and sent as FormData in the request body. File inputs are included.

For POST/PUT/DELETE requests from non-form elements with descendant inputs, those inputs are serialized as FormData.

For GET requests, form data becomes query parameters (files skipped).

Named form fields use their `name` attribute. If no `name`, their `id` is used. Unnamed fields are ignored.

```html
<form s-post="/api/users">
  <input name="email" value="user@example.com">
  <input type="file" name="avatar">
  <button type="submit">Create</button>
</form>
```

Slim creates FormData with `email` and `avatar` properties and sends it as the request body.

### Drag & Drop Data

When an element with `s-drag-json` is dragged and dropped on an element with `s-on="drop"`, the JSON is extracted from the drag event and sent as the request body.

```html
<div draggable s-drag-json='{"item_id":"123"}'>Item</div>

<div s-on="drop" s-post="/api/move">
  <!-- Request body: {"item_id":"123"} -->
  <!-- Content-Type: application/json -->
</div>
```

The JSON must be valid. Invalid JSON silently fails—no data is transferred.

## Response Processing

### Status Codes

Response status codes determine success or failure. Any 2xx status (200-299) is considered successful. All other statuses fail the request.

### Response Headers

Slim checks for three special headers:

**S-Target**: Overrides the client-side `s-target` selector. If the server sends this header, the response updates the target it specifies instead.

```
S-Target: #different-element
```

**S-Emit**: Broadcasts a custom event after DOM updates complete. This allows the server to trigger chains of requests.

```
S-Emit: items-updated
```

**S-Refresh**: If set to "true", the page reloads instead of updating the DOM.

```
S-Refresh: true
```

### Content-Type Handling

The `Content-Type` header determines how the response body is processed:

**text/html**: The response is parsed as HTML and inserted into the target element's `innerHTML`. Any new elements with appear events are observed for visibility changes.

**text/plain**: The response is inserted into the target element's `textContent`. HTML is not parsed.

**Other types**: No DOM update occurs. Only response headers are processed. This is useful when you only need to emit an event or refresh.

### DOM Targeting

The target element(s) are determined by:
1. The `S-Target` header (if present)
2. The `s-target` attribute (if present)
3. The element that triggered the request (default)

If a selector matches multiple elements, all are updated with the same response content.

## Custom Events

Custom events are the primary way to coordinate requests across your page. Emit events with `s-emit` and listen for them with `s-on`.

```html
<button s-post="/api/create" s-emit="items-updated">
  Create Item
</button>

<div s-on="items-updated" s-get="/api/items" s-target="#list">
  <ul id="list"></ul>
</div>
```

You can chain multiple listeners:

```html
<button s-emit="item-changed">Change</button>

<div s-on="item-changed" s-get="/api/item" s-target="#preview"></div>
<div s-on="item-changed" s-get="/api/stats" s-target="#stats"></div>
```

Event names are arbitrary strings. Use descriptive names like `items-updated`, `form-submitted`, `user-logged-in`.

**Note on slim:ok, slim:error, slim:done**: Slim dispatches these events on elements that make requests for interoperability with other frameworks. However, relying on these events is an anti-pattern. Use custom events via `s-emit` instead for cleaner, more maintainable code.

## Common Patterns & Recipes

### Form Submission with Server Validation

The server receives the form data and can validate it. If there's an error, it responds with an error message.

```html
<form s-post="/api/users" s-target="#message">
  <input name="email" required>
  <input name="password" required>
  <button type="submit">Sign Up</button>
</form>
<div id="message"></div>
```

The server responds with either:
- Success: `<div>Account created!</div>` (status 201)
- Error: `<div style="color: red;">Email already exists</div>` (status 400)

Both update the `#message` div.

### Loading States

Use custom events to coordinate loading indicators:

```html
<button s-get="/api/data" s-emit="loading-start after 0">
  Load
</button>

<div id="spinner" style="display:none;" s-on="loading-start"></div>

<div s-on="loading-start" s-emit="loading-done after 2s">
  <!-- Waits 2s, then emits loading-done to hide spinner -->
</div>
```

Or use the server response to control the UI:

```html
<button s-get="/api/data" s-target="#results">
  Load
</button>
<div id="results"></div>
```

The server returns:
```html
<div>
  <p>Results loaded!</p>
  <button onclick="...">Clear</button>
</div>
```

### Request Chaining

Use event emission to create sequences of requests:

```html
<button s-post="/api/users" s-emit="user-created">
  Create
</button>

<div s-on="user-created" s-get="/api/users" s-target="#list"></div>
```

Or chain multiple steps:

```html
<button s-post="/api/item" s-emit="item-saved">Save</button>

<div s-on="item-saved" s-get="/api/stats" s-emit="stats-loaded"></div>
<div s-on="stats-loaded" s-get="/api/graph" s-target="#chart"></div>
```

### Lazy Loading

Use the `appear` event to load content when scrolled into view:

```html
<section s-on="appear" s-get="/api/section-3" s-target="self">
  <!-- Loads when scrolled into view -->
</section>
```

### Real-time Updates with WebSocket

Connect to a WebSocket and let the server broadcast events:

```html
<body s-ws="/ws">
  <div id="messages" s-on="new-message" s-get="/api/messages" s-target="#list">
    <ul id="list"></ul>
  </div>
</body>
```

The server sends WebSocket messages like `new-message`, which trigger listeners.

### Drag and Drop Workflow

Create draggable items and drop zones:

```html
<div class="items">
  <div draggable s-drag-json='{"id":"1"}'>Item 1</div>
  <div draggable s-drag-json='{"id":"2"}'>Item 2</div>
</div>

<div s-on="drop" s-post="/api/move" s-drop-effect="move" s-drop-class="drop-zone-active">
  Drop here to move
</div>
```

The server receives the JSON and updates the state. You can emit an event to refresh lists:

```html
<div s-on="drop" s-post="/api/move" s-emit="items-reordered">
  <div s-on="items-reordered" s-get="/api/items" s-target="#items"></div>
</div>
```

### Event Delegation with Dynamic Lists

Handle clicks on dynamically added list items:

```html
<ul s-on="click on .item" s-delete="/api/items">
  <!-- Each item will be added by the server -->
</ul>
```

The server can add items:

```html
<li class="item">
  Item 1
  <button class="delete">Delete</button>
</li>
<li class="item">
  Item 2
  <button class="delete">Delete</button>
</li>
```

When a user clicks an item, the request is sent and the server can respond with an updated list.

## Edge Cases & Important Details

### Confirmation Cancellation

When a user clicks "Cancel" on an `s-confirm` dialog, the entire request chain stops. No request is sent, no `s-emit` is broadcast, nothing happens.

```html
<button s-confirm="Delete?" s-delete="/api/item" s-emit="deleted">
  Delete
</button>
```

If the user confirms, both the DELETE request and the `deleted` event occur. If they cancel, neither happens.

### Appear Events Fire Once

The appear event only fires the first time an element becomes visible:

```html
<div s-on="appear" s-get="/api/content">
  Content
</div>
```

The element is observed when the page loads. When it scrolls into view, the event fires and the element is unobserved. If it scrolls out of view and back in, the event won't fire again.

### WebSocket Reconnection Timing

If a WebSocket fails to connect or disconnects, Slim automatically reconnects after 1000ms (1 second). This retry loop is indefinite.

If you want to know about connection failures, log to the console. Slim logs a warning when a WebSocket error occurs.

### Query Parameter Inheritance Edge Cases

Parameters are collected from all ancestors up to the root. If multiple ancestors have the same parameter key, the closest element wins:

```html
<body s-query="env=prod">
  <div s-query="env=staging">
    <button s-get="/api/data">
      <!-- Request: /api/data?env=staging (child overrides) -->
    </button>
  </div>
</body>
```

Additionally, for GET requests, form field values can override `s-query` parameters if they have the same name:

```html
<div s-query="user=default" s-get="/api/data">
  <input name="user" value="john">
  <!-- Request: /api/data?user=john (field overrides) -->
</div>
```

### Form Field Collection from Non-Form Elements

A regular element can have descendant form inputs and they'll be collected:

```html
<div s-post="/api/data">
  <input name="name" value="John">
  <input name="email" value="john@example.com">
  <!-- Form data: {name: "John", email: "john@example.com"} -->
</div>
```

Only form inputs (`<input>`, `<select>`, `<textarea>`) are collected. Other elements are ignored.

### Drag Events and Event Target

When a draggable element is dragged, its `s-drag-json` is captured. When dropped on a target, that target's request is sent with the JSON as the body:

```html
<div draggable s-drag-json='{"id":"123"}'>
  <!-- User drags this -->
</div>

<div s-on="drop" s-post="/api/move">
  <!-- Drop happens here; request body contains {"id":"123"} -->
</div>
```

The element sending the request is the drop target, not the dragged element. This is important for targeting response updates.

## Debugging & Troubleshooting

### Browser DevTools Tips

1. **Network tab**: Watch the requests Slim sends and responses received. Check headers (`S-Target`, `S-Emit`, `S-Refresh`) in the response.

2. **Elements tab**: Inspect elements to see which attributes are present. Verify selectors in `s-target` and `s-on` are correct.

3. **Console**: Slim logs WebSocket errors. Watch for messages about WebSocket connection failures.

4. **Events**: You can manually dispatch events in the console to test handlers:
   ```javascript
   document.body.dispatchEvent(new CustomEvent('my-event'));
   ```

### Common Mistakes

1. **Incorrect event delegation syntax**: Using `s-on="click .selector"` instead of `s-on="click on .selector"`. The `on` keyword is required.

2. **Expecting appear events to fire multiple times**: Appear events only fire once. If you need repeated behavior, use `s-on="change"` on a form input or listen for a custom event.

3. **Not checking s-query format**: `s-query` expects URL-encoded parameters. `s-query="key=value&key2=value2"` works; `s-query='{"key":"value"}'` doesn't.

4. **WebSocket message format confusion**: WebSocket messages are treated as event names as strings. Send `user-joined` (text) to trigger listeners, not JSON objects.

5. **Forgetting file uploads can't be done via GET**: GET requests convert form data to query params and skip files. Use POST/PUT for file uploads.

6. **Form inputs in non-form elements not serialized properly**: Make sure inputs have `name` attributes (or `id` as fallback). Unnamed inputs are ignored.

7. **Malformed s-drag-json**: Invalid JSON silently fails. Validate your JSON before setting `s-drag-json='...'`.

8. **Selector issues**: Verify CSS selectors in `s-target` and `s-on` are valid. Use the DevTools Elements tab to test selectors.

9. **Default events not what you expect**: Remember form elements have `submit`, buttons have `click`, inputs have `change`. Other elements have `appear`. Explicitly set `s-on` if you need different behavior.

10. **Confirmation cancellation surprise**: If a request is cancelled via `s-confirm`, no `s-emit` event is broadcast. If you need the event regardless, put it on a separate element.

11. **Invalid JSON in s-drag-json**: Test your JSON to ensure it's valid. Use online JSON validators if unsure.
