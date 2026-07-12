type EventCallback = (type: string, target: string) => void;

export class EventTracker {
  private callback: EventCallback;
  private clickHandler: (e: MouseEvent) => void;
  private inputHandler: (e: Event) => void;

  constructor(callback: EventCallback) {
    this.callback = callback;

    this.clickHandler = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      const label =
        el.textContent?.trim().slice(0, 50) ||
        el.getAttribute('aria-label') ||
        el.getAttribute('name') ||
        el.tagName.toLowerCase();
      this.callback('click', label);
    };

    this.inputHandler = (e: Event) => {
      const el = e.target as HTMLInputElement;
      const label =
        el.getAttribute('aria-label') ||
        el.getAttribute('name') ||
        el.getAttribute('placeholder') ||
        el.tagName.toLowerCase();
      this.callback('input', label);
    };
  }

  start(): void {
    document.addEventListener('click', this.clickHandler, { capture: true, passive: true });
    document.addEventListener('change', this.inputHandler, { capture: true, passive: true });
  }

  stop(): void {
    document.removeEventListener('click', this.clickHandler, true);
    document.removeEventListener('change', this.inputHandler, true);
  }
}
