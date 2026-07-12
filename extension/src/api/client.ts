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
}
