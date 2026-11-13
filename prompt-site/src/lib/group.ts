// 한 분야의 프롬프트를 상황별로 묶습니다.
import type { Field } from '../data/fields.ts';
import type { Prompt } from './prompt-schema.ts';

export interface SituationGroup<T> {
  situation: string;
  prompts: T[];
}

export function groupBySituation<T extends Pick<Prompt, 'field' | 'situation'>>(
  field: Pick<Field, 'name' | 'situations'>,
  prompts: T[],
): SituationGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const prompt of prompts) {
    if (prompt.field !== field.name) continue;
    groups.set(prompt.situation, [...(groups.get(prompt.situation) ?? []), prompt]);
  }
  const rank = (situation: string) => {
    const index = field.situations.indexOf(situation);
    return index === -1 ? field.situations.length : index;
  };
  return [...groups.entries()]
    .map(([situation, list]) => ({ situation, prompts: list }))
    .sort((a, b) => rank(a.situation) - rank(b.situation));
}
