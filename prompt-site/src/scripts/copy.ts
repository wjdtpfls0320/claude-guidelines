// 클립보드 복사. 브라우저가 막으면 대상 글을 선택해 두고 false를 돌려줍니다.

function selectContents(target: HTMLElement): void {
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
    target.focus();
    target.select();
    return;
  }
  const range = document.createRange();
  range.selectNodeContents(target);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  target.focus();
}

export async function copyText(text: string, fallbackTarget: HTMLElement): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    selectContents(fallbackTarget);
    return false;
  }
}

export const MANUAL_COPY_MESSAGE = '자동 복사가 막혀 있어요. 글을 선택해 두었으니 Ctrl+C(⌘+C)로 복사해 주세요.';
