export function handleDragEvents(element: Element, event: Event) {
  if (!(event instanceof DragEvent) || !event.dataTransfer) return;

  if (event.type === "dragstart") {
    const dragJSON = element.getAttribute("s-drag-json");
    const dragEffect = element.getAttribute("s-drag-effect");

    if (dragJSON) {
      event.dataTransfer.setData("application/json", dragJSON);
    }

    if (dragEffect) {
      event.dataTransfer.effectAllowed =
        dragEffect as typeof event.dataTransfer.effectAllowed;
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
