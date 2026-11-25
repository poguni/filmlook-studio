// 61MP 저장 확인 (PRD 10장 M3 완료 기준, 9장 메모리). 헤드리스 소프트웨어 GPU라 시간은 실제 데스크톱보다 김
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { readJpegInfo } from '../src/io/jpeg';
import { makeTestJpeg } from './fixtures';

// 소니 a7R V 크기
const W61 = 9504;
const H61 = 6336;

test('61MP 사진을 원본 해상도로 오류 없이 저장', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('./');
  const buffer = await makeTestJpeg(page, W61, H61);
  await page
    .getByTestId('file-input')
    .setInputFiles({ name: 'a7rv.jpg', mimeType: 'image/jpeg', buffer });
  await page.waitForFunction(() => window.__filmlook?.photoName === 'a7rv.jpg');
  await page.getByRole('button', { name: 'N05 네거 스냅 선택' }).click();

  const started = Date.now();
  const downloading = page.waitForEvent('download', { timeout: 200_000 });
  await page.getByRole('button', { name: '저장' }).click();
  const download = await downloading;
  const seconds = (Date.now() - started) / 1000;

  const bytes = new Uint8Array(await readFile((await download.path())!));
  expect(readJpegInfo(bytes)).toMatchObject({ width: W61, height: H61 });
  await expect(page.getByRole('alert')).toHaveCount(0);
  console.log(`61MP 저장 ${seconds.toFixed(1)}초 (헤드리스 SwiftShader)`);
});
