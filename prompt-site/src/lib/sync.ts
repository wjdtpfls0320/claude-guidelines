// 프롬프트에 적힌 지침 지문과 지금 지침의 지문을 비교합니다.
import type { GuidelineItem } from './guideline-parser.ts';
import type { Prompt } from './prompt-schema.ts';

export interface SyncResult {
  /** 지문이 달라졌거나 아직 기록되지 않은 항목 키. 비어 있으면 공개해도 됩니다. */
  staleItems: string[];
}

export function checkPrompt(prompt: Pick<Prompt, 'id' | 'items' | 'fingerprints'>, items: GuidelineItem[]): SyncResult {
  const current = new Map(items.map((item) => [item.key, item.fingerprint]));
  const staleItems: string[] = [];
  for (const key of prompt.items) {
    const now = current.get(key);
    if (now === undefined) {
      throw new Error(`프롬프트 "${prompt.id}"의 지침항목 "${key}"는 지침에 없는 항목입니다.`);
    }
    if (prompt.fingerprints[key] !== now) staleItems.push(key);
  }
  return { staleItems };
}

/** 검토를 마친 프롬프트에 적을 지문 묶음 */
export function currentFingerprints(itemKeys: string[], items: GuidelineItem[]): Record<string, string> {
  const current = new Map(items.map((item) => [item.key, item.fingerprint]));
  const result: Record<string, string> = {};
  for (const key of itemKeys) {
    const now = current.get(key);
    if (now === undefined) throw new Error(`지침에 없는 항목입니다: ${key}`);
    result[key] = now;
  }
  return result;
}
