// 빌드할 때 지침.txt와 프롬프트 파일을 읽어 화면과 점검 스크립트에 넘깁니다.
// 지침의 원본은 저장소 루트의 지침.txt 하나입니다. 사이트용 사본을 두지 않습니다.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fieldNames } from '../data/fields.ts';
import { parseFrontmatter } from './frontmatter.ts';
import { fingerprint, parseGuideline, type GuidelineItem } from './guideline-parser.ts';
import { buildPrompt, type Prompt } from './prompt-schema.ts';
import { checkPrompt } from './sync.ts';

// npm 스크립트와 astro는 prompt-site 폴더에서 실행됩니다.
const SITE_ROOT = process.cwd();
export const GUIDELINE_PATH = path.resolve(SITE_ROOT, '..', '지침.txt');
export const PROMPTS_DIR = path.resolve(SITE_ROOT, 'src', 'content', 'prompts');
export const UPDATES_PATH = path.resolve(SITE_ROOT, 'src', 'content', 'updates.json');

export interface LoadedPrompt extends Prompt {
  filePath: string;
  /** 지침이 바뀌어 다시 검토해야 하는 항목. 비어 있으면 공개합니다. */
  staleItems: string[];
}

export interface Guideline {
  text: string;
  items: GuidelineItem[];
  fingerprint: string;
}

export interface UpdateEntry {
  날짜: string;
  지침항목: string[];
  요약: string;
  검토한프롬프트: string[];
  /** 이 기록을 쓸 때의 지침 전체 지문 */
  지침지문전체: string;
}

export function loadGuideline(): Guideline {
  const text = readFileSync(GUIDELINE_PATH, 'utf8').replace(/^﻿/, '').replace(/\r\n?/g, '\n').trim();
  return { text, items: parseGuideline(text), fingerprint: fingerprint(text) };
}

function promptFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return promptFiles(full);
    return entry.name.endsWith('.md') ? [full] : [];
  });
}

export function loadPrompts(guideline: Guideline = loadGuideline()): LoadedPrompt[] {
  const seen = new Map<string, string>();
  return promptFiles(PROMPTS_DIR)
    .sort()
    .map((filePath) => {
      const relative = path.relative(SITE_ROOT, filePath);
      try {
        const prompt = buildPrompt(parseFrontmatter(readFileSync(filePath, 'utf8')), fieldNames);
        const duplicate = seen.get(prompt.id);
        if (duplicate) throw new Error(`id "${prompt.id}"가 ${duplicate}와 겹칩니다.`);
        seen.set(prompt.id, relative);
        return { ...prompt, filePath, staleItems: checkPrompt(prompt, guideline.items).staleItems };
      } catch (error) {
        throw new Error(`${relative}: ${(error as Error).message}`);
      }
    });
}

/** 공개 목록에 올릴 프롬프트. 지침이 바뀐 뒤 검토하지 않은 것은 뺍니다. */
export function loadPublicPrompts(guideline: Guideline = loadGuideline()): LoadedPrompt[] {
  return loadPrompts(guideline).filter((prompt) => prompt.staleItems.length === 0);
}

/** 최신 기록이 먼저 오도록 정렬해서 돌려줍니다. */
export function loadUpdates(): UpdateEntry[] {
  const entries = JSON.parse(readFileSync(UPDATES_PATH, 'utf8')) as UpdateEntry[];
  return [...entries].sort((a, b) => b.날짜.localeCompare(a.날짜));
}

/** 화면에 보여줄 지침 버전. 업데이트 기록의 가장 최근 날짜를 씁니다. */
export function guidelineVersion(updates: UpdateEntry[] = loadUpdates()): string {
  return updates[0]?.날짜 ?? '';
}
