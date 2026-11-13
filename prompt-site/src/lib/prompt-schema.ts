// 프롬프트 파일 형식 정의와 검사.
//
// 앞부분(--- 사이, 한 줄에 하나):
//   id, 제목, 분야, 상황, 설명, 태그, 지침항목, 지침지문, 검토일
// 본문(## 제목으로 나눔):
//   ## 프롬프트 (필수)         {빈칸}이 들어간 프롬프트 원문
//   ## 빈칸 (선택)             "- 빈칸 이름: 입력 예시"
//   ## 왜 이렇게 썼나 (필수)   목록
//   ## 기대 응답 (필수)        목록
//   ## 실패 신호 (필수)        목록
//   ## 이어서 쓰는 문장 (선택) 목록
import { blankNames } from './fill-blanks.ts';
import type { ParsedFile } from './frontmatter.ts';

export interface Blank {
  name: string;
  hint: string;
}

export interface Prompt {
  id: string;
  title: string;
  /** 분야 이름 (예: '개발') */
  field: string;
  situation: string;
  description: string;
  tags: string[];
  /** 기대는 지침 항목 키 ('적용 방법', '1' ~ '8') */
  items: string[];
  /** 검토할 때의 지침 항목별 지문 */
  fingerprints: Record<string, string>;
  /** 마지막 검토일 (YYYY-MM-DD) */
  reviewed: string;
  template: string;
  blanks: Blank[];
  why: string[];
  expected: string[];
  failure: string[];
  followups: string[];
}

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function text(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`앞부분에 "${key}"가 없거나 비어 있습니다.`);
  }
  return value.trim();
}

function stringList(data: Record<string, unknown>, key: string): string[] {
  const value = data[key];
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`앞부분의 "${key}"는 하나 이상 들어 있는 목록이어야 합니다. 예: ["a", "b"]`);
  }
  return value.map((entry) => String(entry).trim());
}

function splitSections(body: string): Map<string, string> {
  const sections = new Map<string, string>();
  let current: string | null = null;
  let buffer: string[] = [];
  const flush = () => {
    if (current !== null) sections.set(current, buffer.join('\n').trim());
  };
  for (const line of body.replace(/\r\n?/g, '\n').split('\n')) {
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading) {
      flush();
      current = heading[1];
      buffer = [];
    } else if (current !== null) {
      buffer.push(line);
    } else if (line.trim() !== '') {
      throw new Error('본문은 "## 프롬프트" 같은 제목으로 시작해야 합니다.');
    }
  }
  flush();
  return sections;
}

function listSection(sections: Map<string, string>, name: string, required: boolean): string[] {
  const content = sections.get(name);
  if (content === undefined || content === '') {
    if (required) throw new Error(`본문에 "## ${name}" 내용이 없습니다.`);
    return [];
  }
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line) => {
      if (!line.startsWith('- ')) throw new Error(`"## ${name}"의 각 줄은 "- "로 시작해야 합니다: ${line}`);
      return line.slice(2).trim();
    });
}

export function buildPrompt(file: ParsedFile, knownFields: string[]): Prompt {
  const { data, body } = file;

  const id = text(data, 'id');
  if (!ID.test(id)) throw new Error(`id "${id}"는 영어 소문자, 숫자, 하이픈(-)만 쓸 수 있습니다.`);

  const field = text(data, '분야');
  if (!knownFields.includes(field)) {
    throw new Error(`분야 "${field}"는 없는 분야입니다. 쓸 수 있는 분야: ${knownFields.join(', ')}`);
  }

  const reviewed = text(data, '검토일');
  if (!DATE.test(reviewed)) throw new Error(`검토일 "${reviewed}"는 2026-11-13 같은 형식이어야 합니다.`);

  const items = stringList(data, '지침항목');
  const rawFingerprints = data['지침지문'];
  if (typeof rawFingerprints !== 'object' || rawFingerprints === null || Array.isArray(rawFingerprints)) {
    throw new Error('앞부분의 "지침지문"은 {"2": "a1b2c3d4"} 같은 묶음이어야 합니다.');
  }
  const fingerprints: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawFingerprints)) fingerprints[key] = String(value);

  const sections = splitSections(body);
  const template = sections.get('프롬프트') ?? '';
  if (template === '') throw new Error('본문에 "## 프롬프트" 내용이 없습니다.');

  const names = blankNames(template);
  const hints = new Map<string, string>();
  for (const line of listSection(sections, '빈칸', false)) {
    const colon = line.indexOf(':');
    if (colon === -1) throw new Error(`"## 빈칸"의 줄은 "- 빈칸 이름: 입력 예시" 형식이어야 합니다: ${line}`);
    const name = line.slice(0, colon).trim();
    if (!names.includes(name)) throw new Error(`"## 빈칸"의 "${name}"은 프롬프트에 없는 빈칸입니다.`);
    hints.set(name, line.slice(colon + 1).trim());
  }

  return {
    id,
    title: text(data, '제목'),
    field,
    situation: text(data, '상황'),
    description: text(data, '설명'),
    tags: stringList(data, '태그'),
    items,
    fingerprints,
    reviewed,
    template,
    blanks: names.map((name) => ({ name, hint: hints.get(name) ?? '' })),
    why: listSection(sections, '왜 이렇게 썼나', true),
    expected: listSection(sections, '기대 응답', true),
    failure: listSection(sections, '실패 신호', true),
    followups: listSection(sections, '이어서 쓰는 문장', false),
  };
}
