import { Hono } from "@hono/hono";
import slimJS from "../dist/slim.min.js" with { type: "text" };

const app = new Hono();

type TodoItem = {
  id: string;
  label: string;
  done: boolean;
};

const EVENTS = {
  itemsUpdated: "items:updated",
} as const;

const items: TodoItem[] = [
  {
    id: crypto.randomUUID(),
    label: "Render everything on the server",
    done: false,
  },
  {
    id: crypto.randomUUID(),
    label: "Write declarative client-side code",
    done: false,
  },
  {
    id: crypto.randomUUID(),
    label: "Profit",
    done: false,
  },
];

app.get("/", (c) => {
  return c.html(
    `<!DOCTYPE html>
      <html>
      <head>
        <title>Todo</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css">
        <script>${slimJS}</script>
      </head>
      <body data-bs-theme="dark">
        <div class="container p-4">

          <header class="text-center">
            <h1>Todo</h1>
            <p class="text-muted">${new Date().toLocaleDateString()}</p>
          </header>

          <form
            s-get="/items"
            s-on="appear | change | ${EVENTS.itemsUpdated}"
            s-target="#items"
            class="mb-2"
          >
            <select class="form-select" name="all">
              <option selected value="false">Pending Tasks</option>
              <option value="true">All Tasks</option>
            </select>
          </form>

          <div class="card">
            <div 
              id="items" 
              class="card-body d-flex flex-column gap-2">
            </div>
          </div>

        </div>
      </body>
    </html>
  `,
  );
});

const newItemForm = `
  <form
    class="d-flex gap-2 align-items-center"
    s-post="/items"
  >
    <input 
      type="text"
      name="label"
      placeholder="New task"
      class="form-control"
    >
    <button type="submit" class="btn btn-primary">Add</button>
  </form>
`;

app.get("/items", (c) => {
  const includeDone = c.req.query("all") === "true";
  const itemViews = items
    .filter((it) => !it.done || includeDone)
    .map(itemView).join("");
  return c.html(`${itemViews}${newItemForm}`);
});

function itemView(item: TodoItem) {
  return `
    <form
      class="d-flex gap-2 align-items-center"
      s-put="/items/${item.id}"
      s-on="change"
    >
      <input 
        type="text"
        name="label"
        placeholder="Task"
        value="${item.label}"
        class="form-control"
      >
      <div class="form-check">
        <input class="form-check-input" type="checkbox" name="done" ${
    item.done ? "checked" : ""
  }>
      </div>
    </form>
  `;
}

app.post("/items", async (c) => {
  const data = await c.req.formData();
  const label = data.get("label")?.toString();
  if (label) {
    items.push({
      id: crypto.randomUUID(),
      label,
      done: false,
    });
    c.header("S-Emit", EVENTS.itemsUpdated);
    return c.body(null, 201);
  }
  return c.body(null, 204);
});

app.put("/items/:id", async (c) => {
  const id = c.req.param("id");
  const data = await c.req.formData();

  const item = items.find((it) => it.id === id);
  if (item) {
    item.label = data.get("label")?.toString() ?? "";
    item.done = data.get("done") === "on";
    c.header("S-Emit", EVENTS.itemsUpdated);
  }

  return c.body(null, 204);
});

Deno.serve({ port: 4000 }, app.fetch);
