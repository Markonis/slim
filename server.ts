import { Hono } from '@hono/hono';
import slimJS from "./slim.js" with {type: "text"};

const app = new Hono();
let counter = 0;
const wsClients = new Set<WebSocket>();
const currentServerVersion = "2"

app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html>
<head>
  <title>Test Page</title>
  <script>${slimJS}</script>
</head>
<body s-ws="/ws" s-query="server-version=${currentServerVersion}">
  <h1>Hello World 123</h1>
  <button s-on="click" s-put="/increment" s-target="#result">Click Me!</button>
  <div>Target: <span id="result"></span></div>
  <div>Server target: <span id="server-result"></span></div>
  <h2 s-on="counter-updated" s-get="/counter"></h2>
</body>
</html>`);
});

app.put('/increment', (c) => {
  const requestServerVersion = c.req.query("server-version") ?? "0";
  counter++;
  if (requestServerVersion !== currentServerVersion) {
    c.header("s-refresh", "true");
  } else {
    wsClients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send("counter-updated");
      }
    });
  }
  
  c.header("s-target", "#server-result");
  return c.html(`Counter: ${counter}`);
});

app.get("/counter", (c) => {
  return c.html(`Current counter value is ${counter}`);
});

app.get('/ws', (c) => {
  console.log("Websocket connected!")
  const { response, socket } = Deno.upgradeWebSocket(c.req.raw);
  
  socket.onopen = () => {
    wsClients.add(socket);
  };
  
  socket.onclose = () => {
    wsClients.delete(socket);
  };
  
  return response;
});

Deno.serve({ port: 4000 }, app.fetch);
