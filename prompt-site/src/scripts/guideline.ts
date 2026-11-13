// 지침 페이지: 전체 복사, 주소의 #item-4 같은 항목을 펼쳐서 보여주기.
import { copyText, MANUAL_COPY_MESSAGE } from './copy.ts';

const root = document.querySelector<HTMLElement>('[data-guideline]');
const full = root?.querySelector<HTMLTextAreaElement>('[data-full]');
const status = root?.querySelector<HTMLElement>('[data-status]');

root?.querySelector<HTMLButtonElement>('[data-copy-all]')?.addEventListener('click', async () => {
  if (!full || !status) return;
  const copied = await copyText(full.value, full);
  status.textContent = copied ? '복사했어요. AI 개인 설정에 붙여 넣으세요.' : MANUAL_COPY_MESSAGE;
});

function openTarget(): void {
  const id = decodeURIComponent(window.location.hash.slice(1));
  if (!id) return;
  const target = document.getElementById(id);
  if (target instanceof HTMLDetailsElement) {
    target.open = true;
    target.scrollIntoView({ block: 'start' });
  }
}

window.addEventListener('hashchange', openTarget);
openTarget();
