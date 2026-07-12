type Callback = () => void;

/**
 * Watches for SPA navigation (URL changes, DOM mutations)
 * and calls the callback when significant changes occur.
 */
export class DOMObserver {
  private mutationObserver: MutationObserver | null = null;
  private lastUrl: string = window.location.href;
  private urlCheckInterval: ReturnType<typeof setInterval> | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceMs: number;
  private readonly callback: Callback;

  constructor(callback: Callback, debounceMs = 3000) {
    this.callback = callback;
    this.debounceMs = debounceMs;
  }

  start(): void {
    // 1) MutationObserver for DOM changes (React/Vue/Angular SPAs)
    this.mutationObserver = new MutationObserver(() => {
      this.scheduleCallback();
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // 2) Interval-based URL polling (History API / hash changes)
    this.urlCheckInterval = setInterval(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== this.lastUrl) {
        this.lastUrl = currentUrl;
        this.scheduleCallback();
      }
    }, 1000);

    // 3) popstate (back/forward navigation)
    window.addEventListener('popstate', this.onPopState);

    // Trigger immediate analysis on first load, then use debounce for subsequent changes
    this.callback();
    this.scheduleCallback();
  }

  stop(): void {
    this.mutationObserver?.disconnect();
    this.mutationObserver = null;

    if (this.urlCheckInterval) {
      clearInterval(this.urlCheckInterval);
      this.urlCheckInterval = null;
    }

    window.removeEventListener('popstate', this.onPopState);

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }

  private onPopState = (): void => {
    this.scheduleCallback();
  };

  private scheduleCallback(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.callback();
    }, this.debounceMs);
  }
}
