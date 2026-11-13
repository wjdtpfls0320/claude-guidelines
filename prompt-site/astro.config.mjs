import { defineConfig } from 'astro/config';

export default defineConfig({
  // 보안 헤더(CSP)에서 인라인 스크립트와 스타일을 막을 수 있게 전부 파일로 내보냅니다.
  build: { inlineStylesheets: 'never' },
  vite: {
    build: { assetsInlineLimit: 0 },
    server: { fs: { allow: ['..'] } },
  },
});
