// M3 확장 스모크 테스트: 흑백 필터, 입자, EXIF, 저장 해상도 상한 (PRD 10장 M3)
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { readExif } from '../src/io/exif';
import { readJpegInfo } from '../src/io/jpeg';
import { exifWithGps, insertSegment, makeTestJpeg } from './fixtures';

async function openTestPhoto(page: Page, name: string, buffer: Buffer) {
  await page.getByTestId('file-input').setInputFiles({ name, mimeType: 'image/jpeg', buffer });
  await page.waitForFunction((n) => window.__filmlook?.photoName === n, name);
}

/** 렌더 결과(위쪽 줄부터 RGBA)를 그대로 가져옴 */
function render(page: Page): Promise<number[]> {
  return page.evaluate(() => Array.from(window.__filmlook!.readRender()!.data));
}

function maxDiff(a: number[], b: number[]): number {
  let m = 0;
  for (let i = 0; i < a.length; i++) if (i % 4 !== 3) m = Math.max(m, Math.abs(a[i] - b[i]));
  return m;
}

/** 렌더 결과와 원본(미리보기 비트맵)의 채널별 최대 차이 */
function diffFromSource(page: Page): Promise<number> {
  return page.evaluate(() => {
    const a = window.__filmlook!.readRender()!.data;
    const b = window.__filmlook!.readSource()!.data;
    let m = 0;
    for (let i = 0; i < a.length; i++) if (i % 4 !== 3) m = Math.max(m, Math.abs(a[i] - b[i]));
    return m;
  });
}

const frame = (page: Page, name: string) => page.getByRole('button', { name: `${name} 선택` });
const grainSlider = (page: Page) => page.getByRole('slider', { name: '입자', exact: true });

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('흑백 필터는 M07에서만 고를 수 있고, 결과는 회색이며 필터마다 다름 (PRD E-08)', async ({
  page,
}) => {
  await openTestPhoto(page, 'mono.jpg', await makeTestJpeg(page));
  const red = page.getByRole('button', { name: '빨강', exact: true });
  await frame(page, 'V02 비비드 슬라이드').click();
  await expect(red).toBeDisabled();

  await frame(page, 'M07 모노 그레인').click();
  await expect(red).toBeEnabled();
  // 입자를 빼고 색만 비교
  await grainSlider(page).fill('0');
  await expect.poll(async () => (await render(page))[1]).not.toBe(0);
  const none = await render(page);
  for (let i = 0; i < none.length; i += 4) {
    expect(Math.abs(none[i] - none[i + 1])).toBeLessThanOrEqual(1);
    expect(Math.abs(none[i + 1] - none[i + 2])).toBeLessThanOrEqual(1);
  }

  await red.click();
  await expect(red).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.cam-lcd')).toContainText('FLT 빨강');
  // 빨강 필터는 초록 칸(왼쪽 위)을 어둡게 함
  await expect.poll(async () => maxDiff(await render(page), none)).toBeGreaterThan(10);
  const filtered = await render(page);
  expect(filtered[0]).toBeLessThan(none[0]);
});

test('입자: 프리셋을 고르면 기본값으로 바뀌고, 강도 0%면 넣지 않음 (PRD E-05, E-02)', async ({
  page,
}) => {
  await openTestPhoto(page, 'grain.jpg', await makeTestJpeg(page));
  await frame(page, 'M07 모노 그레인').click();
  await expect(grainSlider(page)).toHaveValue('25');
  await frame(page, 'V02 비비드 슬라이드').click();
  await expect(grainSlider(page)).toHaveValue('0');

  const clean = await render(page);
  await grainSlider(page).fill('60');
  await expect.poll(async () => maxDiff(await render(page), clean)).toBeGreaterThan(5);

  // 크게로 바꾸면 무늬가 달라짐
  const small = await render(page);
  await page.getByRole('button', { name: '크게' }).click();
  await expect.poll(async () => maxDiff(await render(page), small)).toBeGreaterThan(5);

  await page.getByRole('slider', { name: '강도' }).fill('0');
  await expect.poll(() => diffFromSource(page)).toBeLessThanOrEqual(1);
});

test('입자를 넣어도 타일 이음매가 없음 (PRD 6.3)', async ({ page }) => {
  await openTestPhoto(page, 'seam.jpg', await makeTestJpeg(page));
  await frame(page, 'C04 다큐 크롬').click();
  await grainSlider(page).fill('80');
  for (const size of ['작게', '크게']) {
    await page.getByRole('button', { name: size }).click();
    await expect(page.getByRole('button', { name: size })).toHaveAttribute('aria-pressed', 'true');
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
  }
});

test('저장: EXIF·GPS를 남기고 회전은 정방향, 썸네일은 지움 (PRD S-03)', async ({ page }) => {
  const source = insertSegment(await makeTestJpeg(page), exifWithGps(6, 64, 48));
  await openTestPhoto(page, 'DSC09999.JPG', source);
  await expect(page.locator('.cam-summary')).toContainText('JPEG 92% · GPS 유지');

  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: '저장' }).click();
  const bytes = new Uint8Array(await readFile((await (await downloading).path())!));
  expect(readJpegInfo(bytes)).toMatchObject({ width: 48, height: 64 });
  expect(readExif(bytes)).toEqual({
    orientation: 1,
    pixelX: 48,
    pixelY: 64,
    hasGps: true,
    hasIfd1: false,
  });
});

test('저장 해상도 상한을 넘으면 안내하고 비율을 지켜 줄여 저장 (PRD S-01, 6.3)', async ({
  page,
}) => {
  // 개발 서버의 ?cap= 으로 상한을 0.05MP로 낮춤. 400×300 세로 사진(회전 6) = 0.12MP
  await page.goto('./?cap=0.05');
  const source = insertSegment(await makeTestJpeg(page, 400, 300), exifWithGps(6, 400, 300));
  await openTestPhoto(page, 'big.jpg', source);
  await expect(page.locator('.cam-summary')).toContainText('이 기기에서는 0.05MP로 저장');

  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: '저장' }).click();
  const bytes = new Uint8Array(await readFile((await (await downloading).path())!));
  const { width, height } = readJpegInfo(bytes);
  expect(width * height).toBeLessThanOrEqual(50_000);
  expect(width / height).toBeCloseTo(300 / 400, 1);
  expect(readExif(bytes)).toMatchObject({ orientation: 1, pixelX: width, pixelY: height });
});

test('세로 사진(회전 6)을 여러 타일로 저장해도 조각이 뒤섞이지 않음 (PRD F-02, 6.3)', async ({
  page,
}) => {
  test.setTimeout(120_000);
  // 3000×2000 사진을 세로(회전 6)로 표시하면 2000×3000, 타일 2048px로 2조각 이상
  const source = insertSegment(await makeTestJpeg(page, 3000, 2000), exifWithGps(6, 3000, 2000));
  await openTestPhoto(page, 'portrait.jpg', source);
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: '저장' }).click();
  const saved = await readFile((await (await downloading).path())!);

  // 원본(회전 반영 디코딩)과 저장본을 같은 지점들에서 비교. 원본 칸이라 색은 같아야 함
  const diff = await page.evaluate(
    async ([a, b]) => {
      const pixels = async (b64: string) => {
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const bmp = await createImageBitmap(new Blob([bytes]), { imageOrientation: 'from-image' });
        const c = new OffscreenCanvas(bmp.width, bmp.height);
        const ctx = c.getContext('2d')!;
        ctx.drawImage(bmp, 0, 0);
        return { w: bmp.width, h: bmp.height, ctx };
      };
      const src = await pixels(a);
      const out = await pixels(b);
      if (src.w !== out.w || src.h !== out.h) return 999;
      let m = 0;
      for (let y = 100; y < src.h; y += 400) {
        for (let x = 100; x < src.w; x += 400) {
          const p = src.ctx.getImageData(x, y, 1, 1).data;
          const q = out.ctx.getImageData(x, y, 1, 1).data;
          for (let k = 0; k < 3; k++) m = Math.max(m, Math.abs(p[k] - q[k]));
        }
      }
      return m;
    },
    [source.toString('base64'), saved.toString('base64')],
  );
  expect(diff).toBeLessThanOrEqual(12);
});
