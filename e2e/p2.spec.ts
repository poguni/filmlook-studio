// P2 확장 스모크 테스트: 설정 기억(O-01), 별표(C-05), 100% 확대 보기(E-07)
import { expect, test, type Page } from '@playwright/test';
import { makeTestJpeg } from './fixtures';

async function openTestPhoto(page: Page, name: string, width?: number, height?: number) {
  await page.getByTestId('file-input').setInputFiles({
    name,
    mimeType: 'image/jpeg',
    buffer: await makeTestJpeg(page, width, height),
  });
  await page.waitForFunction((n) => window.__filmlook?.photoName === n, name);
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('마지막 프리셋·강도·입자를 기억하고 비교 위치는 기억하지 않음 (PRD O-01)', async ({
  page,
}) => {
  await openTestPhoto(page, 'remember.jpg');
  await page.getByRole('button', { name: 'M07 모노 그레인 선택' }).click();
  await page.getByRole('slider', { name: '강도' }).fill('40');
  await page.getByRole('slider', { name: '입자' }).fill('70');
  await page.getByRole('button', { name: '크게' }).click();
  await page.getByRole('button', { name: '빨강' }).click();
  await page.getByRole('slider', { name: '원본과 결과 비교 위치' }).fill('60');

  await page.reload();
  await expect(page.getByRole('button', { name: 'M07 모노 그레인 선택' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('slider', { name: '강도' })).toHaveValue('40');
  await expect(page.getByRole('slider', { name: '입자' })).toHaveValue('70');
  await expect(page.getByRole('button', { name: '크게' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '빨강' })).toHaveAttribute('aria-pressed', 'true');
  await openTestPhoto(page, 'remember2.jpg');
  await expect(page.getByRole('slider', { name: '원본과 결과 비교 위치' })).toHaveValue('0');
});

test('고른 칸에 별표를 달고 떼며, 새 사진을 열면 비워짐 (PRD C-05)', async ({ page }) => {
  const star = page.getByRole('button', { name: '별표', exact: true });
  await expect(star).toBeDisabled();
  await openTestPhoto(page, 'star.jpg');

  await page.getByRole('button', { name: 'C04 다큐 크롬 선택' }).click();
  await star.click();
  await expect(star).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'C04 다큐 크롬 선택, 별표' })).toBeVisible();

  await page.getByRole('button', { name: 'V02 비비드 슬라이드 선택' }).click();
  await expect(star).toHaveAttribute('aria-pressed', 'false');
  await star.click();
  await expect(page.locator('.frame-star')).toHaveCount(2);

  // 다시 누르면 뗌
  await star.click();
  await expect(page.locator('.frame-star')).toHaveCount(1);

  await openTestPhoto(page, 'star2.jpg');
  await expect(page.locator('.frame-star')).toHaveCount(0);
});

test('100% 확대: 원본에서 화면 크기만큼 1:1로 잘라 보이고 끌어서 움직임 (PRD E-07)', async ({
  page,
}) => {
  // 미리보기(긴 변 2048px)보다 큰 사진이어야 확대의 차이가 보임
  await openTestPhoto(page, 'zoom.jpg', 3000, 2000);
  const toggle = page.getByRole('button', { name: '100% 확대' });
  const region = () => page.evaluate(() => window.__filmlook!.zoomRegion);

  await expect.poll(() => page.evaluate(() => window.__filmlook!.readRender()!.width)).toBe(2048);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(region).not.toBeNull();
  await expect(page.getByRole('slider', { name: '원본과 결과 비교 위치' })).toHaveCount(0);

  const box = await page.locator('.preview-fit').boundingBox();
  const r = (await region())!;
  // 1:1이므로 잘라 낸 크기 = 사진 상자의 기기 픽셀 크기 (테스트 창은 devicePixelRatio 1)
  expect(r.sw).toBe(Math.round(box!.width));
  expect(r.sx + r.sw / 2).toBeCloseTo(1500, -1);
  expect(r.sy + r.sh / 2).toBeCloseTo(1000, -1);

  // 사진 가운데에서 네 칸이 만나므로 왼쪽 위는 초록, 오른쪽 아래는 파랑 (원본 칸이라 색 변환 없음)
  const corners = await page.evaluate(() => {
    const p = window.__filmlook!.readRender()!;
    const at = (x: number, y: number) => [
      ...p.data.subarray((y * p.width + x) * 4, (y * p.width + x) * 4 + 3),
    ];
    return { width: p.width, tl: at(2, 2), br: at(p.width - 3, p.height - 3) };
  });
  expect(corners.width).toBe(r.sw);
  for (const [got, want] of [
    [corners.tl, [60, 160, 90]],
    [corners.br, [40, 60, 200]],
  ]) {
    got.forEach((v, i) => expect(Math.abs(v - want[i])).toBeLessThanOrEqual(6));
  }

  // 왼쪽으로 100px 끌면 사진의 오른쪽이 보임
  const cx = box!.x + box!.width / 2;
  const cy = box!.y + box!.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx - 60, cy, { steps: 3 });
  await page.mouse.move(cx - 100, cy, { steps: 3 });
  await page.mouse.up();
  // 반올림 때문에 1px 안쪽 차이는 허용
  await expect
    .poll(async () => Math.abs((await region())!.sx - (r.sx + 100)))
    .toBeLessThanOrEqual(1);

  // 방향키로도 움직이고, Esc로 맞춤 보기
  await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => (await region())!.sx).toBeLessThan(r.sx + 100);
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(region).toBeNull();
  await expect.poll(() => page.evaluate(() => window.__filmlook!.readRender()!.width)).toBe(2048);
});

test('Ctrl+휠로 누른 자리를 확대하고, 두 번 누르면 맞춤 보기 (PRD E-07)', async ({ page }) => {
  await openTestPhoto(page, 'wheel.jpg', 3000, 2000);
  const box = (await page.locator('.preview-fit').boundingBox())!;
  // 오른쪽 아래 1/4 지점
  const x = box.x + box.width * 0.75;
  const y = box.y + box.height * 0.75;
  await page.mouse.move(x, y);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -100);
  await page.keyboard.up('Control');
  await expect
    .poll(() => page.evaluate(() => window.__filmlook!.zoomRegion?.sx ?? null))
    .not.toBeNull();
  const r = (await page.evaluate(() => window.__filmlook!.zoomRegion))!;
  // 누른 곳(원본 2250, 1500)이 확대 후에도 같은 화면 위치에 남음
  expect(r.sx + 0.75 * r.sw).toBeCloseTo(2250, -1);
  expect(r.sy + 0.75 * r.sh).toBeCloseTo(1500, -1);

  await page.mouse.dblclick(x, y);
  await expect.poll(() => page.evaluate(() => window.__filmlook!.zoomRegion)).toBeNull();
});
