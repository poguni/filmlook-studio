// M1 엔진 스모크 테스트 (PRD 10장 M1 완료 기준)
import { expect, test, type Page } from '@playwright/test';
import {
  H,
  W,
  adobeRgbIcc,
  exifOrientation,
  iccSegment,
  insertSegment,
  makeTestJpeg,
} from './fixtures';

async function openPhoto(page: Page, name: string, buffer: Buffer, mimeType = 'image/jpeg') {
  await page.getByTestId('file-input').setInputFiles({ name, mimeType, buffer });
}

async function waitPhoto(page: Page, name: string) {
  await page.waitForFunction((n) => window.__filmlook?.photoName === n, name);
}

/** 렌더 결과와 원본(미리보기 비트맵)의 채널별 최대 차이 */
function maxDiff(page: Page): Promise<number> {
  return page.evaluate(() => {
    const hook = window.__filmlook!;
    const a = hook.readRender()!;
    const b = hook.readSource()!;
    if (a.width !== b.width || a.height !== b.height) throw new Error('크기가 다름');
    let m = 0;
    for (let i = 0; i < a.data.length; i++)
      if (i % 4 !== 3) m = Math.max(m, Math.abs(a.data[i] - b.data[i]));
    return m;
  });
}

/** 원본(미리보기 비트맵)에서 한 픽셀의 RGB */
function sourcePixel(page: Page, x: number, y: number): Promise<number[]> {
  return page.evaluate(
    ([px, py]) => {
      const s = window.__filmlook!.readSource()!;
      const i = (py * s.width + px) * 4;
      return [s.data[i], s.data[i + 1], s.data[i + 2]];
    },
    [x, y],
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('색감 사진관 · FilmLook Studio');
  await expect(page.getByRole('alert')).toHaveCount(0); // WebGL2 사용 가능
});

test('V02를 적용하면 색이 바뀌고, 강도 0%면 원본과 채널별 ±1 이내 (PRD 9장)', async ({ page }) => {
  await openPhoto(page, 'test.jpg', await makeTestJpeg(page));
  await waitPhoto(page, 'test.jpg');

  // 기본 선택은 원본
  await expect(page.getByRole('button', { name: '원본 선택' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(await maxDiff(page)).toBeLessThanOrEqual(1);

  await page.getByRole('button', { name: 'V02 비비드 슬라이드 선택' }).click();
  await expect.poll(() => maxDiff(page)).toBeGreaterThan(10);

  await page.getByRole('slider', { name: '강도' }).fill('0');
  await expect.poll(() => maxDiff(page)).toBeLessThanOrEqual(1);
});

test('JPEG가 아닌 파일은 거부하고 안내 (PRD F-03)', async ({ page }) => {
  await openPhoto(
    page,
    'note.png',
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    'image/png',
  );
  await expect(page.getByRole('alert')).toHaveText('JPEG 사진만 열 수 있습니다.');
});

test('EXIF 회전 정보를 반영해 세로로 표시 (PRD F-02)', async ({ page }) => {
  const rotated = insertSegment(await makeTestJpeg(page), exifOrientation(6));
  await openPhoto(page, 'rotated.jpg', rotated);
  await waitPhoto(page, 'rotated.jpg');
  const size = await page.evaluate(() => {
    const p = window.__filmlook!.readRender()!;
    return [p.width, p.height];
  });
  expect(size).toEqual([H, W]);
});

test('Adobe RGB 사진은 브라우저가 디코딩할 때 sRGB로 변환함 (PRD F-05 확인)', async ({ page }) => {
  const plain = await makeTestJpeg(page);
  await openPhoto(page, 'plain.jpg', plain);
  await waitPhoto(page, 'plain.jpg');
  const before = await sourcePixel(page, 8, 8); // 초록 칸

  await openPhoto(page, 'adobe.jpg', insertSegment(plain, iccSegment(adobeRgbIcc())));
  await waitPhoto(page, 'adobe.jpg');
  const after = await sourcePixel(page, 8, 8);
  await expect(page.getByText('Adobe RGB 사진입니다')).toBeVisible();

  // 같은 숫자라도 Adobe RGB로 해석하면 더 넓은 색이므로, sRGB로 변환하면 초록이 더 진해짐
  console.log('Adobe RGB 변환 전후', before, after);
  expect(after[1] - after[0]).toBeGreaterThan(before[1] - before[0] + 5);
});
