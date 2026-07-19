import type { GuideStep } from '../shared/types/guide';
import { NAV_ITEM_SELECTOR } from './siteMapLearner';

const STYLE_ID = 'aoc-overlay-styles';
const CURSOR_ID = 'aoc-ai-cursor';
const BUBBLE_ID = 'aoc-cursor-bubble';
const RING_ID = 'aoc-cursor-ring';

// Generic verbs/nouns too common to identify a specific button by themselves
const GENERIC_WORDS = new Set([
  'нажми', 'нажмите', 'кнопку', 'кнопка', 'кликни', 'клик', 'выбери', 'выберите',
  'открой', 'откройте', 'создай', 'создать', 'создайте', 'заполни', 'заполните',
  'введи', 'введите', 'перейди', 'перейдите', 'поле', 'меню', 'раздел',
  'click', 'button', 'press', 'open', 'select', 'create', 'field', 'menu',
]);

export class OverlayInjector {
  private cursor: HTMLElement | null = null;
  private bubble: HTMLElement | null = null;
  private ring: HTMLElement | null = null;
  private steps: GuideStep[] = [];
  private activeStep = 0;
  private flightTimer: number | null = null;
  private positionRaf: number | null = null;
  private typingTimer: number | null = null;
  private currentX = -100;
  private currentY = -100;

  // Auto-advance: current step's target for real-click detection
  private activeTargetEl: Element | null = null;
  private activeCoordsPage: { x: number; y: number } | null = null;
  private stepDoneFired = false;
  private clickWatcherAttached = false;
  /** Set by content/index.ts — called when the user clicks the step's target */
  onStepComplete?: (stepNumber: number) => void;

  // The user performed the step themselves — detect a click on/near the target
  private onDocClick = (e: MouseEvent): void => {
    if (this.stepDoneFired || this.steps.length === 0) return;
    const t = e.target as Element | null;
    let hit = false;
    if (t && this.activeTargetEl &&
        (this.activeTargetEl === t || this.activeTargetEl.contains(t) || t.contains(this.activeTargetEl))) {
      hit = true;
    } else if (this.activeCoordsPage) {
      // Vision-located steps: accept clicks within a small radius of the point
      hit = Math.hypot(e.pageX - this.activeCoordsPage.x, e.pageY - this.activeCoordsPage.y) < 60;
    }
    if (hit) {
      this.stepDoneFired = true;
      this.onStepComplete?.(this.activeStep);
    }
  };

  private injectStyles(): void {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${CURSOR_ID} {
        position: absolute;
        z-index: 2147483647;
        width: 32px;
        height: 32px;
        pointer-events: none;
        transform-origin: 4px 2px;
        will-change: left, top, transform;
        filter: drop-shadow(0 0 8px rgba(99,102,241,0.6)) drop-shadow(0 2px 4px rgba(0,0,0,0.4));
      }
      #${RING_ID} {
        position: absolute;
        z-index: 2147483644;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: 2.5px solid #6366f1;
        pointer-events: none;
        opacity: 0;
        will-change: left, top, opacity;
      }
      #${RING_ID}[data-visible="true"] {
        opacity: 1;
        animation: aoc-ring-expand 1.2s ease-out infinite;
      }
      @keyframes aoc-ring-expand {
        0%   { transform: scale(0.8); opacity: 0.8; }
        100% { transform: scale(2);   opacity: 0; }
      }
      #${BUBBLE_ID} {
        position: absolute;
        z-index: 2147483646;
        background: #1e1b4b;
        color: #e0e7ff;
        font-size: 13px;
        font-family: system-ui, -apple-system, sans-serif;
        line-height: 1.5;
        padding: 8px 14px;
        border-radius: 10px;
        max-width: 260px;
        pointer-events: none;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        opacity: 0;
        transform: scale(0.7);
        transition: opacity 0.2s, transform 0.25s cubic-bezier(.175,.885,.32,1.275);
        will-change: left, top, opacity, transform;
        white-space: normal;
        word-break: break-word;
      }
      #${BUBBLE_ID}[data-visible="true"] {
        opacity: 1;
        transform: scale(1);
      }
      @keyframes aoc-cursor-idle {
        0%, 100% { transform: rotate(var(--rot, -30deg)) scale(var(--sc, 1)) translateY(0); }
        50%      { transform: rotate(var(--rot, -30deg)) scale(var(--sc, 1)) translateY(-3px); }
      }
      #${CURSOR_ID}[data-idle="true"] {
        animation: aoc-cursor-idle 1s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
  }

  private createElements(): void {
    if (this.cursor) return;

    this.cursor = document.createElement('div');
    this.cursor.id = CURSOR_ID;
    this.cursor.innerHTML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 1L4 17.5L8.5 13.5L12 21L15 19.5L11.5 12.5L17 12L4 1Z"
        fill="#6366f1" stroke="#312e81" stroke-width="1.2" stroke-linejoin="round"/>
    </svg>`;
    document.body.appendChild(this.cursor);

    this.ring = document.createElement('div');
    this.ring.id = RING_ID;
    document.body.appendChild(this.ring);

    this.bubble = document.createElement('div');
    this.bubble.id = BUBBLE_ID;
    document.body.appendChild(this.bubble);
  }

  showSteps(steps: GuideStep[], activeStep: number): void {
    this.clearOverlays();
    this.injectStyles();
    this.createElements();
    this.steps = steps;
    this.activeStep = activeStep;
    if (!this.clickWatcherAttached) {
      document.addEventListener('click', this.onDocClick, true);
      this.clickWatcherAttached = true;
    }
    this.flyToStep(activeStep);
  }

  setActiveStep(activeStep: number): void {
    this.activeStep = activeStep;
    this.flyToStep(activeStep);
  }

  // Called when vision locate returns exact coordinates
  flyToPageCoords(x: number, y: number, instruction: string): void {
    if (!this.cursor || !this.bubble || !this.ring) return;
    this.cursor.setAttribute('data-idle', 'false');
    this.bubble.setAttribute('data-visible', 'false');
    this.ring.setAttribute('data-visible', 'false');

    // x,y are viewport coords from vision — add scroll offset for page coords
    const pageX = x + window.scrollX;
    const pageY = y + window.scrollY;

    // Auto-advance target: element under the located point (overlays are
    // pointer-events:none, so elementFromPoint sees the real element)
    this.activeTargetEl = document.elementFromPoint(x, y);
    this.activeCoordsPage = { x: pageX, y: pageY };
    this.stepDoneFired = false;

    this.animateBezierFlight(pageX, pageY, () => {
      if (!this.cursor || !this.bubble || !this.ring) return;
      this.cursor.style.setProperty('--rot', '-30deg');
      this.cursor.setAttribute('data-idle', 'true');

      this.ring.style.left = `${pageX - 22}px`;
      this.ring.style.top = `${pageY - 22}px`;
      this.ring.setAttribute('data-visible', 'true');

      this.bubble.style.left = `${Math.min(pageX, window.innerWidth + window.scrollX - 280)}px`;
      this.bubble.style.top = `${pageY + 20}px`;
      this.streamBubbleText(instruction);
    });
  }

  getStep(stepNumber: number): GuideStep | undefined {
    return this.steps.find(s => s.stepNumber === stepNumber);
  }

  clearOverlays(): void {
    if (this.flightTimer !== null) cancelAnimationFrame(this.flightTimer);
    if (this.positionRaf !== null) cancelAnimationFrame(this.positionRaf);
    if (this.typingTimer !== null) { clearTimeout(this.typingTimer); this.typingTimer = null; }
    this.flightTimer = null;
    this.positionRaf = null;
    this.cursor?.remove();
    this.bubble?.remove();
    this.ring?.remove();
    this.cursor = null;
    this.bubble = null;
    this.ring = null;
    this.steps = [];
    if (this.clickWatcherAttached) {
      document.removeEventListener('click', this.onDocClick, true);
      this.clickWatcherAttached = false;
    }
    this.activeTargetEl = null;
    this.activeCoordsPage = null;
    this.stepDoneFired = false;
  }

  private flyToStep(stepNum: number): void {
    const step = this.steps.find((s) => s.stepNumber === stepNum);
    if (!step || !this.cursor || !this.bubble || !this.ring) return;

    // Hide bubble during flight
    this.bubble.setAttribute('data-visible', 'false');
    this.ring.setAttribute('data-visible', 'false');
    this.cursor.setAttribute('data-idle', 'false');

    const el = this.findElement(step);
    if (!el) {
      // Element not found — show bubble in center; no click target to watch
      this.activeTargetEl = null;
      this.activeCoordsPage = null;
      this.stepDoneFired = false;
      this.showBubbleCentered(`${step.stepNumber}. ${step.instruction}`);
      return;
    }

    // Scroll into view if needed
    const rect = el.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Target: center of element
    const targetX = rect.left + window.scrollX + rect.width / 2;
    const targetY = rect.top + window.scrollY + rect.height / 2;

    // Auto-advance target for real-click detection
    this.activeTargetEl = el;
    this.activeCoordsPage = { x: targetX, y: targetY };
    this.stepDoneFired = false;

    this.animateBezierFlight(targetX, targetY, () => {
      this.onArrival(step, targetX, targetY, rect);
    });
  }

  // Quadratic bezier arc flight — same algorithm as Clicky
  private animateBezierFlight(destX: number, destY: number, onComplete: () => void): void {
    if (this.flightTimer !== null) cancelAnimationFrame(this.flightTimer);

    const startX = this.currentX;
    const startY = this.currentY;
    const dx = destX - startX;
    const dy = destY - startY;
    const distance = Math.hypot(dx, dy);

    // Duration scales with distance: 0.4s–1.2s
    const durationMs = Math.min(Math.max(distance / 1.2, 400), 1200);

    // Control point: midpoint offset upward for arc
    const midX = (startX + destX) / 2;
    const midY = (startY + destY) / 2;
    const arcHeight = Math.min(distance * 0.25, 100);
    const cpX = midX;
    const cpY = midY - arcHeight;

    const startTime = performance.now();

    const tick = () => {
      const elapsed = performance.now() - startTime;
      const linear = Math.min(elapsed / durationMs, 1);

      // Smoothstep easing: 3t² - 2t³
      const t = linear * linear * (3 - 2 * linear);
      const omt = 1 - t;

      // Quadratic bezier: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
      const x = omt * omt * startX + 2 * omt * t * cpX + t * t * destX;
      const y = omt * omt * startY + 2 * omt * t * cpY + t * t * destY;

      // Tangent for rotation: B'(t) = 2(1-t)(P1-P0) + 2t(P2-P1)
      const tx = 2 * omt * (cpX - startX) + 2 * t * (destX - cpX);
      const ty = 2 * omt * (cpY - startY) + 2 * t * (destY - cpY);
      const angle = Math.atan2(ty, tx) * (180 / Math.PI) + 90;

      // Scale pulse: sin curve peaks at midpoint
      const scale = 1 + Math.sin(linear * Math.PI) * 0.3;

      this.setCursorPos(x, y, angle, scale);

      if (linear < 1) {
        this.flightTimer = requestAnimationFrame(tick);
      } else {
        this.flightTimer = null;
        onComplete();
      }
    };

    this.flightTimer = requestAnimationFrame(tick);
  }

  private onArrival(step: GuideStep, x: number, y: number, rect: DOMRect): void {
    if (!this.cursor || !this.bubble || !this.ring) return;

    // Set idle bounce
    this.cursor.style.setProperty('--rot', '-30deg');
    this.cursor.style.setProperty('--sc', '1');
    this.cursor.setAttribute('data-idle', 'true');

    // Show ring at target
    this.ring.style.left = `${x - 22}px`;
    this.ring.style.top = `${y - 22}px`;
    this.ring.setAttribute('data-visible', 'true');

    // Stream bubble text character by character
    const text = `${step.stepNumber}. ${step.instruction}`;
    const tooltipLeft = Math.min(
      rect.left + window.scrollX,
      window.innerWidth + window.scrollX - 270
    );
    this.bubble.style.left = `${tooltipLeft}px`;
    this.bubble.style.top = `${rect.bottom + window.scrollY + 16}px`;
    this.streamBubbleText(text);
  }

  private streamBubbleText(text: string): void {
    if (!this.bubble) return;
    // Cancel any in-flight typing chain before starting a new one
    if (this.typingTimer !== null) { clearTimeout(this.typingTimer); this.typingTimer = null; }
    this.bubble.textContent = '';
    this.bubble.setAttribute('data-visible', 'true');
    let i = 0;
    const type = () => {
      this.typingTimer = null;
      if (!this.bubble || i >= text.length) return;
      this.bubble.textContent += text[i];
      i++;
      this.typingTimer = setTimeout(type, 25 + Math.random() * 20) as unknown as number;
    };
    type();
  }

  private showBubbleCentered(text: string): void {
    if (!this.bubble || !this.cursor) return;
    const cx = window.scrollX + window.innerWidth / 2;
    const cy = window.scrollY + window.innerHeight / 2;
    this.setCursorPos(cx, cy, -30, 1);
    this.cursor.setAttribute('data-idle', 'true');
    this.bubble.style.left = `${cx - 130}px`;
    this.bubble.style.top = `${cy + 30}px`;
    this.streamBubbleText(text);
  }

  private setCursorPos(x: number, y: number, angle: number, scale: number): void {
    this.currentX = x;
    this.currentY = y;
    if (this.cursor) {
      this.cursor.style.left = `${x}px`;
      this.cursor.style.top = `${y}px`;
      this.cursor.style.transform = `rotate(${angle}deg) scale(${scale})`;
    }
  }

  private findElement(step: GuideStep): Element | null {
    // 1. Try each comma-separated CSS selector, only if element is visible.
    // No retry without the visibility check: hidden Bitrix24 template nodes
    // have zero-size rects and send the cursor to a meaningless spot.
    // (Scrolled-off-screen elements still have nonzero rects, so they pass.)
    if (step.selector) {
      for (const sel of step.selector.split(',')) {
        try {
          const el = document.querySelector(sel.trim());
          if (el && this.isVisible(el)) return el;
        } catch { /* invalid selector */ }
      }
    }

    // 2. Text search using selectorFallback, then instruction words
    const searchText = (step.selectorFallback || step.instruction).toLowerCase();
    const found = this.findByText(searchText);
    if (found) return found;

    // 3. Try individual keywords from instruction — skip generic verbs that
    // match unrelated buttons (e.g. «Создать» hijacking «Создать сделку»)
    const words = step.instruction.toLowerCase().split(/\s+/)
      .filter(w => w.length > 3 && !GENERIC_WORDS.has(w));
    for (const word of words) {
      const el = this.findByText(word);
      if (el) return el;
    }

    return null;
  }

  private findByText(needle: string): Element | null {
    // Buttons + structurally-discovered navigation ("open section X" steps)
    const candidates = document.querySelectorAll<HTMLElement>(
      `button, a.ui-btn, [role="button"], input[type="submit"], input[type="button"], .ui-btn, ${NAV_ITEM_SELECTOR}`
    );
    // Exact match first
    for (const el of candidates) {
      if (this.getElementText(el) === needle) return el;
    }
    // Partial match
    const short = needle.slice(0, 20);
    for (const el of candidates) {
      const t = this.getElementText(el);
      if (t && (t.includes(short) || short.includes(t.slice(0, 20)))) return el;
    }
    return null;
  }

  private getElementText(el: HTMLElement): string {
    return (
      el.textContent?.trim().toLowerCase() ||
      el.getAttribute('aria-label')?.toLowerCase() ||
      el.getAttribute('title')?.toLowerCase() ||
      el.getAttribute('value')?.toLowerCase() ||
      ''
    );
  }

  private isVisible(el: Element): boolean {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
}
