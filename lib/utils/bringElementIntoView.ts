/**
 * Utility to smoothly scroll an element into view
 * Used for modals to ensure they're visible when opened
 */
export function bringElementIntoView(el: HTMLElement | null): void {
  if (!el) return;

  requestAnimationFrame(() => {
    el.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  });
}
