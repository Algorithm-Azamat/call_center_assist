import type { PageContext, ElementRecord } from '../../shared/types';

export function buildGuideSystemPrompt(): string {
  return `You are a step-by-step interactive guide for a Chrome extension helping call center employees navigate Bitrix24 CRM.

Your job: given a user question and the current page content, return a precise step-by-step guide with CSS selectors so an animated cursor can fly to the exact element on screen.

RULES:
- 2–6 steps maximum
- For each step: provide the most specific CSS selector possible
- SELECTOR PRIORITY (use in this order):
  1. Selectors from the ELEMENT MAP if provided — these are verified and always work
  2. Selectors visible in the page buttons list (use the exact class= values shown)
  3. Bitrix24 known classes: .ui-btn-split.ui-btn-success (add button), .crm-kanban-item (deal card),
     .im-phone-call-btn-green (accept call), .im-phone-call-btn-red (end call),
     .im-phone-call-btn-hold (hold), .im-phone-call-btn-mute (mute),
     .im-phone-call-btn-transfer (transfer), .main-kanban-column (kanban column),
     .crm-entity-info-field (card field), .main-ui-filter-sidebar (filter panel)
  4. data-role attributes, aria-label, button text content as last resort
- selectorFallback: describe visually where the element is (color, position, text)
- Respond in the SAME language as the page content (Russian if page is Russian)
- Each instruction: max 12 words, actionable verb at start

RESPONSE FORMAT (strict JSON only, no markdown wrapper):
{
  "query": "original question",
  "summary": "one sentence what this guide does",
  "steps": [
    {
      "stepNumber": 1,
      "instruction": "Нажми кнопку Создать сделку",
      "selector": ".ui-btn-split.ui-btn-success",
      "selectorFallback": "зелёная кнопка Создать в правом верхнем углу",
      "isOptional": false
    }
  ]
}`;
}

export function buildGuidePrompt(query: string, context: PageContext, elementMap: ElementRecord[] = []): string {
  const elementMapSection = elementMap.length > 0
    ? `\n\n## VERIFIED ELEMENT MAP — USE THESE SELECTORS FIRST:\n${
        elementMap.map((e) => `- "${e.label}": \`${e.selector}\``).join('\n')
      }\n`
    : '';

  const buttonsSection = context.buttons.length > 0
    ? context.buttons
        .filter(b => b.text.trim().length > 0)
        .slice(0, 30)
        .map(b => `- "${b.text}" [class="${b.className.slice(0, 80)}"${b.id ? ` id="${b.id}"` : ''}]`)
        .join('\n')
    : 'none';

  return `## QUESTION: "${query}"

## PAGE: ${context.title}
URL: ${context.url}
${elementMapSection}
## VISIBLE BUTTONS ON PAGE:
${buttonsSection}

## VISIBLE TEXT (first 1000 chars):
${context.visibleText.slice(0, 1000)}

Return a JSON guide. Use ELEMENT MAP selectors first, then match buttons from the VISIBLE BUTTONS list above.`;
}
