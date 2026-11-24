// M2 MVP 스모크 테스트: 비교 슬라이더, 썸네일, 단축키, 저장 (PRD 10장 M2)
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { readJpegInfo } from '../src/io/jpeg';
import { H, W, exifOrientation, insertSegment, makeTestJpeg } from './fixtures';

async function openTestPhoto(page: Page, name = 'test.jpg', buffer?: Buffer) {
  await page
    .getByTestId('file-input')
    .setInputFiles({ name, mimeType: 'image/jpeg', buffer: buffer ?? (await makeTestJpeg(page)) });
  await page.waitForFunction((n) => window.__filmlook?.photoName === n, name);
}

/** 렌더 결과의 한 열에서 원본과의 최대 차이 */
function columnDiff(page: Page, x: number): Promise<number> {
  return page.evaluate((col) => {
    const hook = window.__filmlook!;
    const a = hook.readRender()!;
    const b = hook.readSource()!;
    let m = 0;
    for (let y = 0; y < a.height; y++) {
      const i = (y * a.width + col) * 4;
      for (let k = 0; k < 3; k++) m = Math.max(m, Math.abs(a.data[i + k] - b.data[i + k]));
    }
    return m;
  }, x);
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('비교 슬라이더: 기본은 전체가 결과, 50%면 왼쪽만 원본 (PRD E-01)', async ({ page }) => {
  await openTestPhoto(page);
  await page.getByRole('button', { name: 'V02 비비드 슬라이드 선택' }).click();
  const compare = page.getByRole('slider', { name: '원본과 결과 비교 위치' });
  await expect(compare).toHaveValue('0');
  await expect.poll(() => columnDiff(page, 2)).toBeGreaterThan(10);

  await compare.fill('50');
  await expect.poll(() => columnDiff(page, 2)).toBeLessThanOrEqual(1); // 왼쪽 = 원본
  expect(await columnDiff(page, W - 3)).toBeGreaterThan(10); // 오른쪽 = 결과

  // 방향키는 5%씩
  await compare.focus();
  await page.keyboard.press('ArrowRight');
  await expect(compare).toHaveValue('55');
});

test('밀착 인화: 칸마다 썸네일이 그려지고 숫자 키로 고름 (PRD C-01, 8.1)', async ({ page }) => {
  await openTestPhoto(page);
  const thumbs = page.locator('.frame-thumb');
  await expect(thumbs).toHaveCount(3);
  for (const t of await thumbs.all()) await expect(t).not.toHaveJSProperty('width', 300);

  await page.locator('body').press('3');
  await expect(page.getByRole('button', { name: 'C04 다큐 크롬 선택' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('타일 렌더링 결과가 미리보기와 같아 이음매가 없음 (PRD 6.3)', async ({ page }) => {
  await openTestPhoto(page);
  await page.getByRole('button', { name: 'V02 비비드 슬라이드 선택' }).click();
  // 64×48 사진을 16px 타일 12개로 나눠 그린 결과와 한 번에 그린 결과를 비교
  const diff = await page.evaluate(async () => {
    const hook = window.__filmlook!;
    const tiled = (await hook.renderTiled(16))!;
    const whole = hook.readRender()!;
    let m = 0;
    for (let i = 0; i < whole.data.length; i++)
      if (i % 4 !== 3) m = Math.max(m, Math.abs(whole.data[i] - tiled.data[i]));
    return m;
  });
  expect(diff).toBeLessThanOrEqual(1);
});

test('저장: 원본 해상도 JPEG를 원본이름_코드.jpg로 내려받음 (PRD S-01, S-02)', async ({ page }) => {
  // 세로 사진(EXIF 회전 6)이 회전된 크기로 저장되는지도 함께 확인
  await openTestPhoto(
    page,
    'DSC01234.JPG',
    insertSegment(await makeTestJpeg(page), exifOrientation(6)),
  );
  await page.getByRole('button', { name: 'V02 비비드 슬라이드 선택' }).click();

  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: '저장' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('DSC01234_V02.jpg');

  const bytes = new Uint8Array(await readFile((await download.path())!));
  expect(readJpegInfo(bytes)).toMatchObject({ width: H, height: W });
  await expect(page.getByRole('button', { name: '저장' })).toBeEnabled();
});

test('Ctrl+S로도 저장 (PRD 8.1)', async ({ page }) => {
  await openTestPhoto(page, 'shortcut.jpg');
  const downloading = page.waitForEvent('download');
  await page.keyboard.press('Control+s');
  expect((await downloading).suggestedFilename()).toBe('shortcut_ORIG.jpg');
});
