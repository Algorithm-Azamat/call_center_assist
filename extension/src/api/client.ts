import type { ExtensionSettings } from '../shared/types';
import type { AIResponse } from '../shared/types';
import type { KBChunk, PageContext } from '../shared/types';
import type { GuideResponse } from '../shared/types/guide';
import type { ElementRecord } from '../shared/types';
import { buildSystemPrompt, buildAnalysisPrompt } from './prompts';
import { buildGuideSystemPrompt, buildGuidePrompt } from './prompts/guidePrompt';

export class AIClient {
  private settings: ExtensionSettings;

  constructor(settings: ExtensionSettings) {
    this.settings = settings;
  }

  updateSettings(settings: ExtensionSettings): void {
    this.settings = settings;
  }

  async analyzePageContext(context: PageContext, kbChunks: KBChunk[]): Promise<AIResponse> {
    if (!this.settings.openaiApiKey) {
      throw new Error('OpenAI API key not configured. Please add your API key in Settings.');
    }

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildAnalysisPrompt(context, kbChunks);

    const response = await fetch(`${this.settings.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.settings.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: this.settings.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: this.settings.maxTokens,
        temperature: this.settings.temperature,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(err?.error?.message ?? `API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) throw new Error('Empty response from AI');

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error('AI вернул некорректный ответ. Попробуй ещё раз или уменьши Max Tokens в настройках.');
    }

    // Attach the best KB chunk if found
    const relevantInstruction = kbChunks.length > 0 ? kbChunks[0] : undefined;

    return {
      screenName: (parsed.screenName as string) ?? 'Unknown Screen',
      screenDescription: (parsed.screenDescription as string) ?? '',
      aiHint: (parsed.aiHint as string) ?? '',
      nextStep: (parsed.nextStep as string) ?? '',
      nextStepDetails: (parsed.nextStepDetails as string) ?? '',
      confidence: (parsed.confidence as number) ?? 0.5,
      relevantInstruction,
      timestamp: Date.now(),
    };
  }

  async askGuide(query: string, context: PageContext, elementMap: ElementRecord[] = []): Promise<GuideResponse> {
    if (!this.settings.openaiApiKey) {
      throw new Error('OpenAI API key not configured. Please add your API key in Settings.');
    }

    const response = await fetch(`${this.settings.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.settings.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: this.settings.model,
        messages: [
          { role: 'system', content: buildGuideSystemPrompt() },
          { role: 'user', content: buildGuidePrompt(query, context, elementMap) },
        ],
        max_tokens: 1200,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(err?.error?.message ?? `API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from AI');

    const parsed = JSON.parse(content);
    return {
      query: parsed.query ?? query,
      summary: parsed.summary ?? '',
      steps: (parsed.steps ?? []).map((s: Partial<GuideResponse['steps'][0]>, idx: number) => ({
        stepNumber: s.stepNumber ?? idx + 1,
        instruction: s.instruction ?? '',
        selector: s.selector ?? '',
        selectorFallback: s.selectorFallback ?? '',
        isOptional: s.isOptional ?? false,
      })),
    };
  }

  async createEmbedding(text: string): Promise<number[]> {
    if (!this.settings.openaiApiKey) {
      throw new Error('OpenAI API key not configured.');
    }

    const response = await fetch(`${this.settings.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.settings.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: this.settings.embeddingModel,
        input: text,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(err?.error?.message ?? `Embedding API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data?.[0]?.embedding ?? [];
  }

  // ─── Computer Use — точные пиксельные координаты как в Clicky ─────────────
  // Принимает base64-скриншот вкладки (из chrome.tabs.captureVisibleTab),
  // возвращает {x, y} в координатах страницы или null.
  async locateByVision(
    screenshotDataUrl: string,   // data:image/jpeg;base64,...
    instruction: string,          // текст шага
    viewportWidth: number,
    viewportHeight: number
  ): Promise<{ x: number; y: number } | null> {
    if (!this.settings.anthropicApiKey) return null;

    // Pick best Computer Use resolution matching viewport aspect ratio
    const RESOLUTIONS = [
      { w: 1024, h: 768 },
      { w: 1280, h: 800 },
      { w: 1366, h: 768 },
    ];
    const ratio = viewportWidth / Math.max(viewportHeight, 1);
    const best = RESOLUTIONS.reduce((a, b) =>
      Math.abs(a.w / a.h - ratio) <= Math.abs(b.w / b.h - ratio) ? a : b
    );

    // Resize screenshot to Computer Use resolution via canvas
    const resizedBase64 = await this.resizeScreenshot(screenshotDataUrl, best.w, best.h);
    if (!resizedBase64) return null;

    const userPrompt = `The user needs to: "${instruction}"

Look at the screenshot. Find the specific UI element (button, link, field, icon) the user should interact with for this step. Click on it.

If there is no specific element to click (e.g. a conceptual step), respond with text "no element".`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.settings.anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'computer-use-2025-11-24',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 256,
        tools: [{
          type: 'computer_20251124',
          name: 'computer',
          display_width_px: best.w,
          display_height_px: best.h,
        }],
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: resizedBase64 },
            },
            { type: 'text', text: userPrompt },
          ],
        }],
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const toolUse = (data.content as Array<{ type: string; input?: { coordinate?: number[] } }>)
      ?.find(b => b.type === 'tool_use');

    const coord = toolUse?.input?.coordinate;
    if (!Array.isArray(coord) || coord.length < 2) return null;

    // Clamp to declared resolution
    const cx = Math.max(0, Math.min(coord[0], best.w));
    const cy = Math.max(0, Math.min(coord[1], best.h));

    // Scale back to actual viewport coordinates
    return {
      x: (cx / best.w) * viewportWidth,
      y: (cy / best.h) * viewportHeight,
    };
  }

  private resizeScreenshot(dataUrl: string, targetW: number, targetH: number): Promise<string | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(null); return; }
          ctx.drawImage(img, 0, 0, targetW, targetH);
          // Strip the data:image/jpeg;base64, prefix
          const full = canvas.toDataURL('image/jpeg', 0.85);
          resolve(full.split(',')[1] ?? null);
        } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  }
}
