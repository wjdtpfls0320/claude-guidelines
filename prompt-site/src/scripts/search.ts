// 검색 페이지. 빌드할 때 Pagefind가 만든 색인(/pagefind/)을 브라우저에서 불러와 찾습니다. 서버로 검색어를 보내지 않습니다.

interface PagefindResultData {
  url: string;
  meta: Record<string, string | undefined>;
}

interface Pagefind {
  search(query: string): Promise<{ results: { data(): Promise<PagefindResultData> }[] }>;
}

const root = document.querySelector<HTMLElement>('[data-search]');
const input = root?.querySelector<HTMLInputElement>('#search-q');
const status = root?.querySelector<HTMLElement>('[data-status]');
const list = root?.querySelector<HTMLUListElement>('[data-results]');
const empty = root?.querySelector<HTMLElement>('[data-empty]');

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

/** 검색어와 두 글자 이상 겹치는 태그를 먼저, 없으면 많이 쓰인 태그를 제안합니다. */
function suggestTags(query: string, tags: string[]): string[] {
  const pieces = new Set<string>();
  const compact = query.replace(/\s+/g, '');
  for (let i = 0; i + 2 <= compact.length; i += 1) pieces.add(compact.slice(i, i + 2).toLowerCase());
  const similar = tags.filter((tag) => [...pieces].some((piece) => tag.toLowerCase().includes(piece)));
  return (similar.length > 0 ? similar : tags).slice(0, 8);
}

function showEmpty(query: string, tags: string[]): void {
  if (!empty) return;
  const title = empty.querySelector('[data-empty-title]');
  if (title) title.textContent = `'${query}'에 맞는 프롬프트가 없어요`;
  const suggestions = empty.querySelector('[data-suggestions]');
  suggestions?.replaceChildren(
    ...suggestTags(query, tags).map((tag) => {
      const item = document.createElement('li');
      const link = element('a', 'badge', `#${tag}`);
      link.href = `/search/?q=${encodeURIComponent(tag)}`;
      item.append(link);
      return item;
    }),
  );
  empty.hidden = false;
}

function resultRow(data: PagefindResultData): HTMLLIElement {
  const row = document.createElement('li');
  const title = element('a', 'title', data.meta.title ?? data.url);
  title.href = data.url;
  const badges = element('ul', 'badges meta', '');
  for (const label of [data.meta.field, data.meta.situation]) {
    if (!label) continue;
    const item = document.createElement('li');
    item.append(element('span', 'badge', label));
    badges.append(item);
  }
  row.append(title, element('p', 'desc', data.meta.description ?? ''), badges);
  return row;
}

async function run(): Promise<void> {
  if (!root || !input || !status || !list || !empty) return;
  const query = new URLSearchParams(window.location.search).get('q')?.trim() ?? '';
  input.value = query;
  if (query === '') {
    input.focus();
    return;
  }

  status.textContent = '검색 색인을 불러오는 중이에요…';
  let pagefind: Pagefind;
  try {
    const path = '/pagefind/pagefind.js';
    pagefind = (await import(/* @vite-ignore */ path)) as Pagefind;
  } catch {
    status.textContent = '검색 색인을 불러오지 못했어요. 잠시 뒤 다시 시도하거나 위의 분야 탭에서 골라 주세요.';
    return;
  }

  try {
    const { results } = await pagefind.search(query);
    const rows = await Promise.all(results.map((result) => result.data()));
    if (rows.length === 0) {
      status.textContent = `'${query}' 검색 결과 0개`;
      showEmpty(query, JSON.parse(root.dataset.tags ?? '[]') as string[]);
      return;
    }
    status.textContent = `'${query}' 검색 결과 ${rows.length}개`;
    list.replaceChildren(...rows.map(resultRow));
    list.hidden = false;
  } catch {
    status.textContent = '검색하는 중에 문제가 생겼어요. 다른 검색어로 다시 시도해 주세요.';
  }
}

void run();
