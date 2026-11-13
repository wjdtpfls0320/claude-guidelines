// 프롬프트 안의 {빈칸}을 찾고 채웁니다. 브라우저와 빌드 양쪽에서 씁니다.
// 화면에 넣을 때는 이 결과를 textContent로만 넣습니다(innerHTML 금지).

export type Segment = { type: 'text'; value: string } | { type: 'blank'; name: string };

const BLANK = /\{([^{}\n]+)\}/g;

export function splitTemplate(template: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  for (const match of template.matchAll(BLANK)) {
    const index = match.index ?? 0;
    if (index > last) segments.push({ type: 'text', value: template.slice(last, index) });
    segments.push({ type: 'blank', name: match[1].trim() });
    last = index + match[0].length;
  }
  if (last < template.length) segments.push({ type: 'text', value: template.slice(last) });
  return segments;
}

/** 빈칸 이름을 처음 나온 순서대로, 중복 없이 돌려줍니다. */
export function blankNames(template: string): string[] {
  const names: string[] = [];
  for (const segment of splitTemplate(template)) {
    if (segment.type === 'blank' && !names.includes(segment.name)) names.push(segment.name);
  }
  return names;
}

function isFilled(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== '';
}

/** 채우지 않은 빈칸은 {이름} 그대로 둡니다. */
export function fillTemplate(template: string, values: Record<string, string>): string {
  return splitTemplate(template)
    .map((segment) => {
      if (segment.type === 'text') return segment.value;
      const value = values[segment.name];
      return isFilled(value) ? value.trim() : `{${segment.name}}`;
    })
    .join('');
}

export function unfilledBlanks(template: string, values: Record<string, string>): string[] {
  return blankNames(template).filter((name) => !isFilled(values[name]));
}
