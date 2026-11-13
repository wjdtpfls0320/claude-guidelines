// 프롬프트 파일 앞부분(--- 사이)을 읽고 고칩니다.
// 한 줄에 "키: 값" 하나만 씁니다. 값이 [ 나 { 로 시작하면 JSON으로 읽고, 아니면 글자 그대로 읽습니다.

export interface ParsedFile {
  data: Record<string, unknown>;
  body: string;
}

const FENCE = '---';

function splitFile(text: string): { head: string[]; body: string } {
  const lines = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  if (lines[0]?.trim() !== FENCE) {
    throw new Error('파일이 "---"로 시작하지 않습니다.');
  }
  const close = lines.findIndex((line, i) => i > 0 && line.trim() === FENCE);
  if (close === -1) {
    throw new Error('앞부분을 닫는 "---"가 없습니다.');
  }
  return { head: lines.slice(1, close), body: lines.slice(close + 1).join('\n') };
}

function parseValue(key: string, value: string): unknown {
  if (/^[\[{]/.test(value)) {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error(`"${key}" 값을 읽지 못했습니다. 목록은 ["a", "b"], 묶음은 {"a": "b"} 형식으로 한 줄에 쓰세요.`);
    }
  }
  return value;
}

export function parseFrontmatter(text: string): ParsedFile {
  const { head, body } = splitFile(text);
  const data: Record<string, unknown> = {};
  for (const line of head) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    const colon = line.indexOf(':');
    if (colon === -1) {
      throw new Error(`앞부분의 "${line}" 줄이 "키: 값" 형식이 아닙니다.`);
    }
    const key = line.slice(0, colon).trim();
    data[key] = parseValue(key, line.slice(colon + 1).trim());
  }
  return { data, body };
}

/** 앞부분의 한 줄만 바꾼 파일 내용을 돌려줍니다. 없는 키면 앞부분 끝에 추가합니다. */
export function setFrontmatterField(text: string, key: string, value: unknown): string {
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r\n|\n/);
  const close = lines.findIndex((line, i) => i > 0 && line.trim() === FENCE);
  if (lines[0]?.trim() !== FENCE || close === -1) {
    throw new Error('앞부분("---" 사이)을 찾지 못했습니다.');
  }
  const written = `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`;
  const at = lines.findIndex((line, i) => i > 0 && i < close && line.slice(0, line.indexOf(':')).trim() === key);
  if (at === -1) {
    lines.splice(close, 0, written);
  } else {
    lines[at] = written;
  }
  return lines.join(newline);
}
