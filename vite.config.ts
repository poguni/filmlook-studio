import { createHash } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * 오프라인 PWA (PRD O-03): src/pwa/sw.ts를 sw.js로 빌드하고, 미리 보관할 앱 파일 목록을 넣음.
 * 글꼴(1,000개가 넘는 한글 조각 파일)과 샘플 사진은 목록에서 빼고 처음 쓸 때 보관함
 */
function pwa(): Plugin {
  let swRef = '';
  return {
    name: 'filmlook-pwa',
    apply: 'build',
    buildStart() {
      swRef = this.emitFile({ type: 'chunk', id: 'src/pwa/sw.ts', fileName: 'sw.js' });
    },
    generateBundle(_, bundle) {
      const swName = this.getFileName(swRef);
      const publicFiles = readdirSync('public', { recursive: true, withFileTypes: true })
        .filter((d) => d.isFile() && !d.parentPath.replaceAll('\\', '/').includes('public/samples'))
        .map((d) => `${d.parentPath.replaceAll('\\', '/').replace(/^public\/?/, '')}/${d.name}`)
        .map((p) => p.replace(/^\//, ''));
      const files = Object.keys(bundle)
        .filter((f) => f !== swName && !/\.(woff2?)$/.test(f))
        .concat(publicFiles)
        .sort();
      const precache = ['./', ...files.filter((f) => f !== 'index.html')];
      const version = createHash('sha256').update(precache.join('\n')).digest('hex').slice(0, 12);
      const sw = bundle[swName];
      if (sw?.type !== 'chunk') throw new Error('sw.js를 만들지 못했습니다');
      sw.code = sw.code
        .replaceAll('__PRECACHE__', JSON.stringify(precache))
        .replaceAll('__VERSION__', JSON.stringify(version));
    },
  };
}

export default defineConfig({
  // GitHub Pages 저장소 경로
  base: '/filmlook-studio/',
  plugins: [react(), pwa()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
