import type { GuideStep } from '../shared/types/guide';

const STYLE_ID = 'aoc-overlay-styles';
const CURSOR_ID = 'aoc-ai-cursor';
const BUBBLE_ID = 'aoc-cursor-bubble';
const RING_ID = 'aoc-cursor-ring';

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
    this.flyToStep(activeStep);
  }

  setActiveStep(activeStep: number): void {
    this.activeStep = activeStep;
    this.flyToStep(activeStep);
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
      // Element not found — show bubble in center
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
    if (step.selector) {
      for (const sel of step.selector.split(',')) {
        try {
          const el = document.querySelector(sel.trim());
          if (el) return el;
        } catch { /* invalid selector */ }
      }
    }

    if (step.selectorFallback) {
      const needle = step.selectorFallback.toLowerCase();
      const candidates = document.querySelectorAll<HTMLElement>(
        'button, a, input[type="submit"], input[type="button"], [role="button"], label, select, textarea, input'
      );
      for (const el of candidates) {
        const elText = (
          el.textContent ?? el.getAttribute('value') ?? el.getAttribute('placeholder') ?? ''
        ).toLowerCase().trim();
        if (elText && (needle.includes(elText.slice(0, 25)) || elText.includes(needle.slice(0, 25)))) {
          return el;
        }
      }
    }

    return null;
  }
}
