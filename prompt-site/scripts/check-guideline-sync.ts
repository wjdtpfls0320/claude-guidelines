// 지침.txt가 바뀌었을 때 다시 검토해야 하는 프롬프트를 찾아 알려줍니다.
//
//   node scripts/check-guideline-sync.ts              점검만 (빌드할 때 자동 실행)
//   node scripts/check-guideline-sync.ts --update id… 검토를 마친 프롬프트에 지금 지문과 오늘 날짜를 적음
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { setFrontmatterField } from '../src/lib/frontmatter.ts';
import { itemLabel } from '../src/lib/guideline-parser.ts';
import { loadGuideline, loadPrompts, loadUpdates } from '../src/lib/prompt-loader.ts';
import { currentFingerprints } from '../src/lib/sync.ts';

function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function report(): void {
  const guideline = loadGuideline();
  const prompts = loadPrompts(guideline);
  const labels = new Map(guideline.items.map((item) => [item.key, itemLabel(item)]));

  console.log('지침 항목별 지문');
  for (const item of guideline.items) console.log(`  ${item.fingerprint}  ${itemLabel(item)}`);

  const stale = prompts.filter((prompt) => prompt.staleItems.length > 0);
  console.log(`\n프롬프트 ${prompts.length}개 중 공개 ${prompts.length - stale.length}개, 검토 필요 ${stale.length}개`);
  if (stale.length > 0) {
    console.log('\n검토 필요 (공개 목록에서 빠집니다)');
    for (const prompt of stale) {
      const changed = prompt.staleItems.map((key) => labels.get(key)).join(', ');
      console.log(`  ${prompt.id}  ← 바뀐 지침 항목: ${changed}`);
    }
    console.log('\n검토를 마쳤으면: npm run check:sync -- --update <id> [id…]');
  }

  const latest = loadUpdates()[0];
  if (!latest || latest.지침지문전체 !== guideline.fingerprint) {
    console.log(
      `\n알림: 지침이 마지막 업데이트 기록 이후에 바뀌었습니다. src/content/updates.json에 기록을 추가하세요. (지금 지침 전체 지문: ${guideline.fingerprint})`,
    );
  }
}

function update(ids: string[]): void {
  if (ids.length === 0) throw new Error('--update 뒤에 검토를 마친 프롬프트 id를 적어주세요.');
  const guideline = loadGuideline();
  const prompts = loadPrompts(guideline);
  for (const id of ids) {
    const prompt = prompts.find((candidate) => candidate.id === id);
    if (!prompt) throw new Error(`id가 "${id}"인 프롬프트가 없습니다.`);
    let content = readFileSync(prompt.filePath, 'utf8');
    content = setFrontmatterField(content, '지침지문', currentFingerprints(prompt.items, guideline.items));
    content = setFrontmatterField(content, '검토일', today());
    writeFileSync(prompt.filePath, content, 'utf8');
    console.log(`갱신: ${path.relative(process.cwd(), prompt.filePath)}`);
  }
}

try {
  const args = process.argv.slice(2);
  if (args[0] === '--update') update(args.slice(1));
  else if (args.length === 0) report();
  else throw new Error(`모르는 옵션입니다: ${args[0]}`);
} catch (error) {
  console.error(`오류: ${(error as Error).message}`);
  process.exit(1);
}
