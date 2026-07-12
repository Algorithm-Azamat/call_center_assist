import type { PageContext, KBChunk } from '../../shared/types';

export function buildSystemPrompt(): string {
  return `You are an AI Onboarding Copilot embedded in a Chrome extension. 
Your job is to help new employees navigate corporate web systems (CRM, Helpdesk, internal portals) in real time.

You receive structured data about the current web page and must respond with a JSON object.

RULES:
- Be concise and practical
- Focus on what the user needs to DO right now
- Use the Knowledge Base excerpts when available
- Detect the screen type from URL, title, forms, buttons, and visible text
- Always respond in the SAME language as the page content

RESPONSE FORMAT (strict JSON, no markdown):
{
  "screenName": "Short name of the current screen (e.g. 'Customer List', 'Create Ticket')",
  "screenDescription": "1-2 sentence description of what this screen is for",
  "aiHint": "Main contextual tip for this screen (2-3 sentences)",
  "nextStep": "Single most important action the user should take right now",
  "nextStepDetails": "Step-by-step breakdown of the next step (numbered list as a string)",
  "confidence": 0.85
}`;
}

export function buildAnalysisPrompt(context: PageContext, kbChunks: KBChunk[]): string {
  const kbSection = kbChunks.length > 0
    ? `\n\n## KNOWLEDGE BASE EXCERPTS\n${kbChunks
        .map((c, i) => `[${i + 1}] (from: ${c.docName})\n${c.text}`)
        .join('\n\n---\n\n')}`
    : '';

  return `## PAGE CONTEXT

URL: ${context.url}
Title: ${context.title}

### Visible Text (truncated):
${context.visibleText}

### Forms (${context.forms.length} fields):
${context.forms.map((f) => `- ${f.label || f.name} [${f.type}]${f.required ? ' *required' : ''}`).join('\n') || 'No forms detected'}

### Buttons (${context.buttons.length}):
${context.buttons.map((b) => `- "${b.text}"`).join('\n') || 'No buttons detected'}

### Tables (${context.tables.length}):
${context.tables
  .map((t) => `- Headers: ${t.headers.join(', ')} | Rows: ${t.rowCount}`)
  .join('\n') || 'No tables detected'}
${kbSection}

Analyze this page and respond with the JSON as specified in the system prompt.`;
}
