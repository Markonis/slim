# Slim

A lightweight, declarative frontend framework that brings server-driven interactivity to HTML with minimal JavaScript. Slim lets you build dynamic web applications using simple HTML attributes.

## Features

- **Declarative HTML attributes** - Define behavior directly in your markup
- **HTTP method support** - GET, POST, PUT, DELETE requests via attributes
- **Event-driven architecture** - Custom events for component communication
- **Real-time updates** - WebSocket support for live data
- **Intersection Observer** - Lazy loading with `appear` events
- **Form handling** - Automatic form serialization and submission
- **Target selectors** - Update specific elements with responses
- **Query parameter inheritance** - Hierarchical parameter collection
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

- `s-get="/path"` - Make GET request
- `s-post="/path"` - Make POST request  
- `s-put="/path"` - Make PUT request
- `s-delete="/path"` - Make DELETE request

### Event Handling

- `s-on="event"` - Listen for specific events
- `s-on="event | other-event"` - Listen for multiple events
- `s-on="event on .selector"` - Global event delegation

### Targeting

- `s-target="#selector"` - Update elements matching selector
- Server can override with `S-Target` header

### Other Attributes

- `s-emit="event-name"` - Broadcast custom event
- `s-confirm="message"` - Show confirmation dialog
- `s-query="key=value"` - Add query parameters
- `s-ws="/websocket"` - WebSocket connection URL

## Examples

### Basic Button Click

```html
<button s-get="/api/counter" s-target="#count">
  Get Count
</button>
<span id="count">0</span>
```

### Form Submission

```html
<form s-post="/api/users" s-target="#message">
  <input name="name" placeholder="Name" required>
  <input name="email" placeholder="Email" required>
  <button type="submit">Create User</button>
</form>
<div id="message"></div>
```

### Event Chaining

```html
<button s-emit="data-updated">Refresh Data</button>
<div s-on="data-updated" s-get="/api/fresh-data" s-target="#content">
  <div id="content">Loading...</div>
</div>
```

### Lazy Loading

```html
<div s-on="appear" s-get="/api/lazy-content">
  Content loads when scrolled into view
</div>
```

### Query Parameters

```html
<body s-query="version=1">
  <div s-query="user=123">
    <button s-get="/api/data" s-target="#result">
      <!-- Request will include: ?version=1&user=123 -->
    </button>
  </div>
</body>
```

### WebSocket Integration

Every WebSocket message is treated as a global event

```html
<body s-ws="/ws">
  <div s-on="user-joined" s-get="/api/users" s-target="#user-list">
    <ul id="user-list"></ul>
  </div>
</body>
```


## Default Event Bindings

Elements have default events when `s-on` is not specified:

- `<form>` → `submit`
- `<button>` → `click` 
- `<input>`, `<select>` → `change`
- Other elements → `appear`

## Server Response Headers

Slim recognizes special response headers:

- `S-Target: selector` - Override client-side target (optional, the default target is the element itself)
- `S-Emit: event-name` - Broadcast event after processing
- `S-Refresh: true` - Force page reload

## Content Types

- `text/html` - Updates target element's `innerHTML`
- `text/plain` - Updates target element's `textContent`
- Other types - Only processes headers

## Custom Events

Slim dispatches events on elements:

- `slim:ok` - Request succeeded
- `slim:error` - Request failed  
- `slim:done` - Request completed (always)

## Event Delegation

Use selectors for global event handling:

```html
<!-- Listen for clicks on any .delete-btn -->
<div s-on="click on .delete-btn" s-delete="/api/items" s-target="#list">
  <ul id="list">
    <li>Item 1 <button class="delete-btn">×</button></li>
    <li>Item 2 <button class="delete-btn">×</button></li>
  </ul>
</div>
```

## Form Handling

Forms automatically serialize all inputs:

```html
<form s-put="/api/profile" s-target="#status">
  <input name="name" value="John">
  <input name="email" value="john@example.com">
  <input type="file" name="avatar">
  <button type="submit">Update Profile</button>
</form>
```

For GET requests, form data becomes query parameters. For other methods, data is sent as FormData.

## Best Practices

1. **Progressive Enhancement** - Start with working HTML forms, add Slim attributes
2. **Semantic HTML** - Use appropriate elements (`<button>`, `<form>`, etc.)
3. **Error Handling** - Listen for `slim:error` events
4. **Loading States** - Use `slim:done` to hide spinners
5. **Confirmation** - Use `s-confirm` for destructive actions

## Browser Support

Slim works in all modern browsers that support:
- ES6+ JavaScript
- Fetch API
- Custom Events
- Intersection Observer
- WebSockets (optional)

## License

MIT
