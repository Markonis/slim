# Slim

A lightweight, declarative frontend framework that brings server-driven interactivity to HTML with minimal JavaScript. Slim lets you build dynamic web applications using simple HTML attributes.

## Features

- **Declarative HTML attributes** - Define behavior directly in your markup
- **HTTP method support** - GET, POST, PUT, DELETE requests via attributes
- **Event-driven architecture** - Custom events, event delegation, multiple listeners
- **Form handling** - Automatic serialization, file uploads, GET/POST/PUT/DELETE
- **Drag and drop** - Native DnD with JSON data transfer
- **Lazy loading** - Intersection Observer with `appear` events
- **Real-time updates** - WebSocket support with auto-reconnect
- **Query parameters** - Hierarchical collection with inheritance
- **Response control** - Server headers override client targets and emit events
- **Zero dependencies** - Pure JavaScript, no external libraries

## Quick Start

Include Slim in your HTML:

```html
<script src="slim.min.js"></script>
```

Add interactive behavior with attributes:

```html
<button s-get="/api/data" s-target="#result">Load Data</button>
<div id="result"></div>
```

## Core Attributes

### HTTP Requests

- `s-get="/path"` - GET request
- `s-post="/path"` - POST request
- `s-put="/path"` - PUT request
- `s-delete="/path"` - DELETE request

Form data becomes query params for GET, FormData body for others. File uploads supported.

### Event Handling

- `s-on="event"` - Listen for an event
- `s-on="event1 | event2"` - Multiple listeners
- `s-on="click on .selector"` - Event delegation

### Targeting

- `s-target="#selector"` - Update matched elements (default: self)
- Server override: `S-Target: selector` header

### Emitting & Delays

- `s-emit="event-name"` - Broadcast custom event
- `s-emit="event after 1.5s"` - Delayed event

### Executing JavaScript

- `s-eval="javascript code"` - Execute JavaScript (with `this` = element)

### Client-Side Templates

- `s-template="#selector"` - Use the innerHTML of the template

### History Management

- `s-push="/path"` - Push URL to browser history on event

### Other Attributes

- `s-confirm="message"` - Confirmation dialog
- `s-query="key=value"` - Add query parameters
- `s-ws="/websocket"` - WebSocket URL

### Drag & Drop

- `s-drag-json="{...}"` - JSON data on dragstart
- `s-drag-effect="copy"` - Drag effect (copy, move, link)
- `s-drop-effect="copy"` - Drop effect (enables dragover)
- `s-drop-class="active"` - Class added during dragover

## Examples

### Basic Request

```html
<button s-get="/api/count">Get Count</button>
```

### Form Submission

```html
<form s-post="/api/users">
  <input name="name" required>
  <button type="submit">Create</button>
</form>
```

### Event Chain

```html
<button s-emit="refresh">Refresh</button>
<div s-on="refresh" s-get="/api/data" s-target="#result"></div>
```

### Lazy Load

```html
<div s-on="appear" s-get="/api/lazy-content"></div>
```

### Query Params

```html
<body s-query="v=1">
  <button s-get="/api/data">
    <!-- Sends ?v=1 -->
  </button>
</body>
```

### WebSocket

```html
<body s-ws="/ws">
  <div s-on="user-joined" s-get="/api/users" s-target="#list"></div>
</body>
```

### Drag & Drop

```html
<div draggable s-drag-json='{"id":"123"}' s-on="dragstart"></div>
<div s-on="drop" s-post="/api/move" s-drop-effect="move"></div>
```

### Delegation

```html
<div s-on="click on .item">
  <button class="item">Item 1</button>
  <button class="item">Item 2</button>
</div>
```

### Confirmation

```html
<button s-confirm="Delete?" s-delete="/api/item"></button>
```

### JavaScript Execution

```html
<button s-eval="console.log('Button clicked!', this)">Log</button>
<button s-eval="this.style.color = 'red'" s-get="/api/data">Update and Log</button>
```

### Client-Side Templates

```html
<template id="card-template">
  <div class="card">
    <h3>New Card</h3>
    <p>Card content here</p>
  </div>
</template>

<button s-template="#card-template" s-target="#container">Add Card</button>
<div id="container"></div>
```

### History Management

```html
<!-- Push history on button click -->
<button s-push="/dashboard">Go to Dashboard</button>

<!-- Push history alongside a request -->
<button s-get="/api/data" s-push="/data-view">Load Data</button>

<!-- Form submission with history push -->
<form s-post="/api/submit" s-push="/success">
  <input name="item" required>
  <button type="submit">Submit</button>
</form>
```

## Default Event Bindings

Elements trigger requests automatically when `s-on` is not specified:

- `<form>` → `submit`
- `<button>` → `click`
- `<input type="text">`, `<select>` → `change` (also `input`)
- Other elements → `appear`

## Request Headers

Every request sent by Slim includes:

- `S-Location` - The URL of the current page (for server context/analytics)

## Server Response Handling

### Response Headers

- `S-Target: selector` - Override update target
- `S-Emit: event-name` - Broadcast event after update
- `S-Push: /path` - Push URL to browser history
- `S-Refresh: true` - Reload page
- `S-Redirect: /path` - Redirect to URL

## Response Content Types

- `text/html` - Sets target's `innerHTML`
- `text/plain` - Sets target's `textContent`
- Other types - Process headers only

## Custom Events Dispatched

Slim dispatches on request elements:

- `slim:ok` - Request succeeded
- `slim:error` - Request failed
- `slim:done` - Request completed

Global events:

- `location:change` - URL pushed / poped from browser history
- `hash:change` - Location hash changed

## Request Data

### GET Requests
- Form data → query parameters
- Query params from `s-query` attributes (hierarchical)
- File inputs skipped

### POST/PUT/DELETE Requests
- Form data → FormData body
- Drag-drop → JSON body (from `s-drag-json`)
- Files included

### Query Parameter Inheritance

Parameters cascade from ancestors:

```html
<body s-query="org=acme">
  <div s-query="team=sales">
    <!-- Requests include: ?org=acme&team=sales -->
  </div>
</body>
```

## Best Practices

1. **Progressive Enhancement** - Add Slim to working HTML
2. **Semantic HTML** - Use correct elements (`<button>`, `<form>`)
3. **Error Handling** - Listen for `slim:error`
5. **Confirmations** - Use `s-confirm` for destructive actions

## Browser Support

Requires:
- ES6+ JavaScript
- Fetch API
- Custom Events
- Intersection Observer
- WebSockets (for `s-ws`)

## License

MIT
