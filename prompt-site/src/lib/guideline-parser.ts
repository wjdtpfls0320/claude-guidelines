// 지침.txt를 항목별로 나누고, 항목마다 내용 지문(해시)을 계산합니다.
import { createHash } from 'node:crypto';

export interface GuidelineItem {
  /** '적용 방법' 또는 '1' ~ '8' 같은 항목 번호 */
  key: string;
  /** 항목 제목 (예: '정확성') */
  title: string;
  /** 적용 범위 (예: '항상'). [적용 방법]은 빈 문자열 */
  scope: string;
  /** 제목 줄을 뺀 본문 */
  body: string;
  /** 제목 줄을 포함한 원문 */
  raw: string;
  fingerprint: string;
}

export const APPLY_KEY = '적용 방법';

const APPLY_HEADER = /^\[적용 방법\]$/;
const NUMBERED_HEADER = /^(\d+)\.\s+(.+?)\s+\[(.+)\]$/;

function normalize(text: string): string {
  return text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
}

/** 줄바꿈 방식이나 앞뒤 공백이 달라도 같은 지문이 나오게 정리한 뒤 해시합니다. */
export function fingerprint(text: string): string {
  const cleaned = normalize(text)
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
  return createHash('sha256').update(cleaned, 'utf8').digest('hex').slice(0, 8);
}

export function parseGuideline(text: string): GuidelineItem[] {
  const lines = normalize(text).split('\n');
  const starts: { index: number; key: string; title: string; scope: string }[] = [];
  let expectedNumber = 1;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (APPLY_HEADER.test(trimmed)) {
      starts.push({ index, key: APPLY_KEY, title: APPLY_KEY, scope: '' });
      return;
    }
    const match = NUMBERED_HEADER.exec(trimmed);
    // 본문 안의 번호 목록을 항목으로 잘못 읽지 않도록, 번호가 순서대로일 때만 항목으로 봅니다.
    if (match && Number(match[1]) === expectedNumber) {
      starts.push({ index, key: match[1], title: match[2], scope: match[3] });
      expectedNumber += 1;
    }
  });

  if (starts.length === 0) {
    throw new Error('지침에서 항목 제목을 찾지 못했습니다. "[적용 방법]" 또는 "1. 제목 [범위]" 형식인지 확인하세요.');
  }
  const preamble = lines.slice(0, starts[0].index).join('\n').trim();
  if (preamble !== '') {
    throw new Error('지침의 첫 항목 제목 앞에 어느 항목에도 속하지 않는 내용이 있습니다.');
  }

  return starts.map((start, i) => {
    const end = i + 1 < starts.length ? starts[i + 1].index : lines.length;
    const raw = lines.slice(start.index, end).join('\n').trim();
    const body = lines.slice(start.index + 1, end).join('\n').trim();
    return { key: start.key, title: start.title, scope: start.scope, body, raw, fingerprint: fingerprint(raw) };
  });
}

/** 화면에 보여줄 항목 이름 (예: '4. 기획서 먼저', '적용 방법') */
export function itemLabel(item: Pick<GuidelineItem, 'key' | 'title'>): string {
  return item.key === APPLY_KEY ? APPLY_KEY : `${item.key}. ${item.title}`;
}

/** 지침 페이지에서 항목으로 바로 가는 주소 조각 (예: 'item-4', 적용 방법은 'item-0') */
export function itemAnchor(key: string): string {
  return key === APPLY_KEY ? 'item-0' : `item-${key}`;
}
