// 샘플 사진 준비 (PRD F-06): EXIF·GPS를 지워 public/samples/에 넣고 목록(index.json)을 만듦
// 사용법: node scripts/prepare-samples.ts 사진1.jpg 사진2.jpg 사진3.jpg
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readExif } from '../src/io/exif.ts';
import { stripMetadata } from '../src/io/strip.ts';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('사용법: node scripts/prepare-samples.ts 사진1.jpg 사진2.jpg …');
  process.exit(1);
}

const outDir = join(import.meta.dirname, '..', 'public', 'samples');
mkdirSync(outDir, { recursive: true });
const names: string[] = [];
files.forEach((file, i) => {
  const out = stripMetadata(new Uint8Array(readFileSync(file)));
  if (readExif(out)?.hasGps) throw new Error(`GPS가 남았습니다: ${file}`);
  const name = `sample-${i + 1}.jpg`;
  writeFileSync(join(outDir, name), out);
  names.push(name);
  const mb = out.length / 1024 / 1024;
  console.log(`${file} → public/samples/${name} (${mb.toFixed(1)}MB)`);
  // GitHub Pages로 내려받는 크기라, 크면 미리 줄여 달라고 알림
  if (mb > 3)
    console.warn('  3MB가 넘습니다. 긴 변 2400px 정도로 줄인 사진을 쓰면 데모가 빨리 열립니다.');
});
writeFileSync(join(outDir, 'index.json'), JSON.stringify(names, null, 2) + '\n');
console.log(`목록: public/samples/index.json (${names.length}장)`);
