/**
 * Builds a reasonably stable CSS selector for a live DOM element.
 * Used by capture mode (manual recording) and the site-map learner.
 */
export function buildSelector(el: Element): string {
  if (el.id) return `#${CSS.escape(el.id)}`;

  // Try a stable data attribute
  for (const attr of ['data-id', 'data-name', 'name', 'aria-label']) {
    const val = el.getAttribute(attr);
    if (val) return `${el.tagName.toLowerCase()}[${attr}="${CSS.escape(val)}"]`;
  }

  // Class-based: pick ui-btn / crm- / first stable-looking class
  const classes = Array.from(el.classList).filter(
    (c) => c.match(/^(ui-btn|crm-|b24-|bx-)/)
  );
  if (classes.length > 0) {
    return `${el.tagName.toLowerCase()}.${classes.slice(0, 2).map(CSS.escape).join('.')}`;
  }

  // nth-child fallback
  const parent = el.parentElement;
  if (parent) {
    const idx = Array.from(parent.children).indexOf(el) + 1;
    const parentSel = buildSelector(parent);
    return `${parentSel} > ${el.tagName.toLowerCase()}:nth-child(${idx})`;
  }

  return el.tagName.toLowerCase();
}
