// 프롬프트 상세: 빈칸 입력 → 미리보기 갱신 → 복사.
// 입력값은 이 페이지의 메모리에서만 쓰고 어디에도 보내거나 저장하지 않습니다.
import { fillTemplate, splitTemplate, unfilledBlanks } from '../lib/fill-blanks.ts';
import { copyText, MANUAL_COPY_MESSAGE } from './copy.ts';

const root = document.querySelector<HTMLElement>('[data-prompt]');
const preview = root?.querySelector<HTMLElement>('[data-preview]');
const status = root?.querySelector<HTMLElement>('[data-status]');
const copyButton = root?.querySelector<HTMLButtonElement>('[data-copy]');

if (root && preview && status && copyButton) {
  const template = preview.dataset.template ?? '';
  const inputs = [...root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-blank]')];

  const values = (): Record<string, string> =>
    Object.fromEntries(inputs.map((input) => [input.dataset.blank ?? '', input.value]));

  const render = () => {
    const current = values();
    const nodes = splitTemplate(template).map((segment) => {
      if (segment.type === 'text') return document.createTextNode(segment.value);
      const value = current[segment.name]?.trim();
      const element = document.createElement(value ? 'span' : 'mark');
      if (value) element.className = 'filled';
      // 입력값은 textContent로만 넣습니다.
      element.textContent = value || `{${segment.name}}`;
      return element;
    });
    preview.replaceChildren(...nodes);
    status.textContent = '';
  };

  inputs.forEach((input) => input.addEventListener('input', render));
  root.querySelector('form')?.addEventListener('submit', (event) => event.preventDefault());

  copyButton.addEventListener('click', async () => {
    const current = values();
    const copied = await copyText(fillTemplate(template, current), preview);
    if (!copied) {
      status.textContent = MANUAL_COPY_MESSAGE;
      return;
    }
    const left = unfilledBlanks(template, current);
    status.textContent =
      left.length === 0
        ? '복사했어요. AI 채팅에 붙여 넣으세요.'
        : `복사했어요. 빈칸 ${left.length}개가 남아 있어요: ${left.join(', ')}`;
  });
}

document.querySelectorAll<HTMLButtonElement>('[data-followup-copy]').forEach((button) => {
  button.addEventListener('click', async () => {
    const text = button.parentElement?.querySelector<HTMLElement>('[data-followup-text]');
    if (!text) return;
    const copied = await copyText(text.textContent ?? '', text);
    button.textContent = copied ? '복사됨' : 'Ctrl+C로 복사';
    window.setTimeout(() => (button.textContent = '복사'), 2000);
  });
});
