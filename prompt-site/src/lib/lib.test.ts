import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blankNames, fillTemplate, splitTemplate, unfilledBlanks } from './fill-blanks.ts';
import { parseFrontmatter, setFrontmatterField } from './frontmatter.ts';
import { fingerprint, itemAnchor, itemLabel, parseGuideline } from './guideline-parser.ts';
import { buildPrompt } from './prompt-schema.ts';
import { checkPrompt, currentFingerprints } from './sync.ts';

const GUIDELINE = `[적용 방법]
각 항목 제목 옆에 적용 범위를 적어뒀어.

1. 정확성 [항상]
틀린 점이 있으면 정정해줘.

2. 질문 기준 [항상]
큰 결정은 먼저 물어봐줘.
- 목록 한 줄
1. 본문 안의 번호 줄 [이건 항목이 아님]
`;

test('지침을 항목별로 나눈다', () => {
  const items = parseGuideline(GUIDELINE);
  assert.deepEqual(items.map((item) => item.key), ['적용 방법', '1', '2']);
  assert.equal(items[1].title, '정확성');
  assert.equal(items[1].scope, '항상');
  assert.equal(items[1].body, '틀린 점이 있으면 정정해줘.');
  assert.ok(items[2].body.includes('본문 안의 번호 줄'), '순서에 맞지 않는 번호 줄은 본문으로 남는다');
  assert.equal(itemLabel(items[0]), '적용 방법');
  assert.equal(itemLabel(items[2]), '2. 질문 기준');
  assert.equal(itemAnchor('적용 방법'), 'item-0');
  assert.equal(itemAnchor('4'), 'item-4');
});

test('한 항목만 고치면 그 항목의 지문만 바뀐다', () => {
  const before = parseGuideline(GUIDELINE);
  const after = parseGuideline(GUIDELINE.replace('정정해줘', '바로 정정해줘'));
  assert.equal(before[0].fingerprint, after[0].fingerprint);
  assert.notEqual(before[1].fingerprint, after[1].fingerprint);
  assert.equal(before[2].fingerprint, after[2].fingerprint);
});

test('줄바꿈 방식과 줄 끝 공백은 지문에 영향을 주지 않는다', () => {
  assert.equal(fingerprint('가\n나'), fingerprint('가  \r\n나\r\n'));
  assert.notEqual(fingerprint('가\n나'), fingerprint('가\n다'));
});

test('항목 제목이 없거나 제목 앞에 내용이 있으면 오류', () => {
  assert.throws(() => parseGuideline('그냥 글'));
  assert.throws(() => parseGuideline(`머리말\n${GUIDELINE}`));
});

const FILE = `---
id: dev-sample
제목: 예시 프롬프트
분야: 개발
상황: 새 기능을 만들 때
설명: 테스트용 설명
태그: ["기획서", "새 기능"]
지침항목: ["2", "적용 방법"]
지침지문: {"2": "aaaaaaaa"}
검토일: 2026-11-13
---

## 프롬프트
{만들 것}을 만들고 싶어. 쓰는 사람은 {누가}야. {만들 것}부터 시작하자.

## 빈칸
- 만들 것: 예) 동네 요가원 예약 앱

## 왜 이렇게 썼나
- 이유 하나

## 기대 응답
- 기획서를 먼저 씁니다.

## 실패 신호
- 바로 코드를 씁니다.
`;

test('프롬프트 파일을 읽는다', () => {
  const prompt = buildPrompt(parseFrontmatter(FILE), ['개발']);
  assert.equal(prompt.id, 'dev-sample');
  assert.deepEqual(prompt.tags, ['기획서', '새 기능']);
  assert.deepEqual(prompt.items, ['2', '적용 방법']);
  assert.deepEqual(prompt.blanks, [
    { name: '만들 것', hint: '예) 동네 요가원 예약 앱' },
    { name: '누가', hint: '' },
  ]);
  assert.deepEqual(prompt.expected, ['기획서를 먼저 씁니다.']);
  assert.deepEqual(prompt.followups, []);
});

test('형식이 틀린 프롬프트 파일은 오류', () => {
  const build = (text: string) => buildPrompt(parseFrontmatter(text), ['개발']);
  assert.throws(() => build(FILE.replace('분야: 개발', '분야: 요리')), /없는 분야/);
  assert.throws(() => build(FILE.replace('id: dev-sample', 'id: Dev Sample')), /id/);
  assert.throws(() => build(FILE.replace('검토일: 2026-11-13', '검토일: 11월 13일')), /검토일/);
  assert.throws(() => build(FILE.replace('- 만들 것:', '- 없는 칸:')), /프롬프트에 없는 빈칸/);
  assert.throws(() => build(FILE.replace('## 실패 신호\n- 바로 코드를 씁니다.\n', '')), /실패 신호/);
  assert.throws(() => build(FILE.replace('태그: ["기획서", "새 기능"]', '태그: [기획서')), /태그/);
});

test('앞부분의 한 줄만 바꾼다', () => {
  const changed = setFrontmatterField(FILE, '지침지문', { '2': 'bbbbbbbb' });
  const { data, body } = parseFrontmatter(changed);
  assert.deepEqual(data['지침지문'], { '2': 'bbbbbbbb' });
  assert.equal(data['제목'], '예시 프롬프트');
  assert.equal(body, parseFrontmatter(FILE).body);
  const quoted = parseFrontmatter(FILE.replace('설명: 테스트용 설명', '설명: "왜 지금인가"를 확인합니다.'));
  assert.equal(quoted.data['설명'], '"왜 지금인가"를 확인합니다.', '따옴표로 시작하는 글은 글자 그대로 읽는다');
  const added = setFrontmatterField(FILE, '새키', '값');
  assert.equal(parseFrontmatter(added).data['새키'], '값');
});

test('지문이 다르거나 없는 항목은 검토 필요로 나온다', () => {
  const items = parseGuideline(GUIDELINE);
  const prompt = { id: 'p', items: ['1', '2'], fingerprints: { '1': items[1].fingerprint, '2': 'old' } };
  assert.deepEqual(checkPrompt(prompt, items).staleItems, ['2']);
  assert.deepEqual(checkPrompt({ ...prompt, fingerprints: {} }, items).staleItems, ['1', '2']);
  const stamped = { ...prompt, fingerprints: currentFingerprints(prompt.items, items) };
  assert.deepEqual(checkPrompt(stamped, items).staleItems, []);
  assert.throws(() => checkPrompt({ ...prompt, items: ['99'] }, items), /지침에 없는 항목/);
});

test('빈칸을 채운다', () => {
  const template = '{만들 것}을 만들고 싶어. 쓰는 사람은 {누가}야. {만들 것}!';
  assert.deepEqual(blankNames(template), ['만들 것', '누가']);
  assert.equal(fillTemplate(template, { '만들 것': ' 가계부 ', 누가: '' }), '가계부을 만들고 싶어. 쓰는 사람은 {누가}야. 가계부!');
  assert.deepEqual(unfilledBlanks(template, { '만들 것': '가계부' }), ['누가']);
  assert.equal(fillTemplate('빈칸 없음', {}), '빈칸 없음');
});

test('입력값은 글자 그대로 들어간다', () => {
  const filled = fillTemplate('{내용}', { 내용: '<img src=x onerror=alert(1)> {누가}' });
  assert.equal(filled, '<img src=x onerror=alert(1)> {누가}');
  assert.deepEqual(splitTemplate('앞 {칸} 뒤'), [
    { type: 'text', value: '앞 ' },
    { type: 'blank', name: '칸' },
    { type: 'text', value: ' 뒤' },
  ]);
});
