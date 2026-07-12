import type { PageContext, ElementRecord } from '../../shared/types';

export function buildGuideSystemPrompt(): string {
  return `You are an interactive step-by-step guide for a Chrome extension that helps employees navigate corporate web systems.

The user asks HOW TO DO something on the current page. Your job is to return a precise step-by-step guide with CSS selectors so the extension can highlight the exact elements on screen.

RULES:
- Break the task into 2–8 specific, actionable steps
- For each step provide a CSS selector of the element the user needs to interact with
- Selectors must work on real web pages: prefer id, name, aria-label, button text, or role attributes
- If you cannot determine a reliable selector, return an empty string "" for selector
- selectorFallback is a plain text description of what to look for visually (e.g. "blue Submit button in the top right")
- Always respond in the SAME language as the page content
- Be concise — each instruction max 15 words

RESPONSE FORMAT (strict JSON, no markdown):
{
  "query": "the original user question",
  "summary": "one sentence describing what this guide achieves",
  "steps": [
    {
      "stepNumber": 1,
      "instruction": "Click the New Ticket button",
      "selector": "button[data-action='new-ticket'], a.btn-new-ticket, button:contains('New Ticket')",
      "selectorFallback": "green New Ticket button in top right corner",
      "isOptional": false
    }
  ]
}`;
}

export function buildGuidePrompt(query: string, context: PageContext, elementMap: ElementRecord[] = []): string {
  const elementMapSection = elementMap.length > 0
    ? `\n\n## RECORDED ELEMENT MAP (use these selectors first — they are verified on this site)\n${
        elementMap.map((e) => `- "${e.label}": \`${e.selector}\``).join('\n')
      }`
    : '';
  return `## USER QUESTION
"${query}"

## CURRENT PAGE
URL: ${context.url}
Title: ${context.title}${elementMapSection}

### Visible Buttons (${context.buttons.length}):
${context.buttons.map((b) => `- "${b.text}" [id="${b.id}" class="${b.className.slice(0, 60)}"]`).join('\n') || 'none'}

### Forms (${context.forms.length} fields):
${context.forms.map((f) => `- ${f.label || f.name} [type=${f.type} name="${f.name}" id inferred from label]`).join('\n') || 'none'}

### Visible Text (first 1500 chars):
${context.visibleText.slice(0, 1500)}

Based on the page content above, return a JSON step-by-step guide answering the user's question.
Use selectors based on the buttons, forms, and text you see above.`;
}
