// M4 마무리 스모크 테스트: 기믹, 원본 보기, 사용자 LUT, 두 단계 공유, 샘플 사진, 앱 정보 (PRD 10장 M4)
import { expect, test, type Page } from '@playwright/test';
import { makeTestJpeg } from './fixtures';

async function openTestPhoto(page: Page, name = 'test.jpg') {
  await page
    .getByTestId('file-input')
    .setInputFiles({ name, mimeType: 'image/jpeg', buffer: await makeTestJpeg(page) });
  await page.waitForFunction((n) => window.__filmlook?.photoName === n, name);
}

/** 렌더 결과와 원본(미리보기 비트맵)의 채널별 최대 차이. swap이면 원본의 R·B를 맞바꿔 비교 */
function diffFromSource(page: Page, swap = false): Promise<number> {
  return page.evaluate((sw) => {
    const a = window.__filmlook!.readRender()!.data;
    const b = window.__filmlook!.readSource()!.data;
    let m = 0;
    for (let i = 0; i < a.length; i += 4) {
      const src = sw ? [b[i + 2], b[i + 1], b[i]] : [b[i], b[i + 1], b[i + 2]];
      for (let k = 0; k < 3; k++) m = Math.max(m, Math.abs(a[i + k] - src[k]));
    }
    return m;
  }, swap);
}

/** 빨강과 파랑을 맞바꾸는 .cube */
function swapCube(size = 5): string {
  const lines = ['TITLE "swap"', `LUT_3D_SIZE ${size}`];
  const s = 1 / (size - 1);
  for (let b = 0; b < size; b++)
    for (let g = 0; g < size; g++)
      for (let r = 0; r < size; r++) lines.push(`${b * s} ${g * s} ${r * s}`);
  return lines.join('\n');
}

const frame = (page: Page, name: string) => page.getByRole('button', { name: `${name} 선택` });

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('격자선 기믹은 화면에만 보이고 렌더 결과는 그대로 (PRD O-04)', async ({ page }) => {
  await openTestPhoto(page);
  await frame(page, 'V02 비비드 슬라이드').click();
  const before = await diffFromSource(page);
  const lever = page.getByRole('button', { name: '뷰파인더 격자선' });
  await expect(lever).toHaveAttribute('aria-pressed', 'false');
  await lever.click();
  await expect(lever).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-gimmick', 'on');
  await expect(page.locator('.cam-grid')).toHaveCSS('opacity', '1');
  expect(await diffFromSource(page)).toBe(before);
});

test('원본 보기: 버튼이나 \\ 키를 누르고 있는 동안만 원본 (PRD E-04)', async ({ page }) => {
  await openTestPhoto(page);
  await frame(page, 'V02 비비드 슬라이드').click();
  await expect.poll(() => diffFromSource(page)).toBeGreaterThan(10);

  const hold = page.getByRole('button', { name: '원본 보기' });
  await hold.hover();
  await page.mouse.down();
  await expect.poll(() => diffFromSource(page)).toBeLessThanOrEqual(1);
  await page.mouse.up();
  await expect.poll(() => diffFromSource(page)).toBeGreaterThan(10);

  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.down('\\');
  await expect.poll(() => diffFromSource(page)).toBeLessThanOrEqual(1);
  await page.keyboard.up('\\');
  await expect.poll(() => diffFromSource(page)).toBeGreaterThan(10);
});

test('.cube를 불러오면 9번째 칸이 되고, 빼면 원본으로 (PRD P-05)', async ({ page }) => {
  await openTestPhoto(page, 'lut.jpg');
  await page
    .getByTestId('lut-input')
    .setInputFiles({ name: 'swap.cube', mimeType: 'text/plain', buffer: Buffer.from(swapCube()) });
  const user = frame(page, 'U01 swap');
  await expect(user).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.frame-thumb')).toHaveCount(9);
  // .cube 값을 그대로 쓰므로 결과는 원본의 빨강·파랑을 맞바꾼 색 (16비트 실수 텍스처 오차 ±1)
  await expect.poll(() => diffFromSource(page, true)).toBeLessThanOrEqual(1);

  await page.locator('body').press('1');
  await page.locator('body').press('9');
  await expect(user).toHaveAttribute('aria-pressed', 'true');

  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: '저장' }).click();
  expect((await downloading).suggestedFilename()).toBe('lut_U01.jpg');

  await page.getByRole('button', { name: '사용자 LUT 빼기' }).click();
  await expect(user).toHaveCount(0);
  await expect(frame(page, '원본')).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('lut-input').setInputFiles({
    name: 'bad.cube',
    mimeType: 'text/plain',
    buffer: Buffer.from('LUT_3D_SIZE 3'),
  });
  await expect(page.getByRole('alert')).toContainText('.cube 파일을 읽을 수 없습니다');
});

test('스마트폰은 저장 후 공유를 한 번 더 눌러 엶, 값을 바꾸면 저장으로 돌아감 (PRD S-04)', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'userAgentData', { get: () => ({ mobile: true }) });
    const shared: string[] = [];
    (window as unknown as { __shared: string[] }).__shared = shared;
    navigator.canShare = () => true;
    navigator.share = async (data?: ShareData) => {
      shared.push(...(data?.files ?? []).map((f) => f.name));
    };
  });
  await page.goto('./');
  await openTestPhoto(page, 'phone.jpg');
  await frame(page, 'C04 다큐 크롬').click();

  await page.getByRole('button', { name: '저장' }).click();
  const shareButton = page.getByRole('button', { name: '공유 · SHARE' });
  await expect(shareButton).toBeVisible();
  await expect(page.locator('.cam-summary')).toContainText('저장 완료 · 공유를 눌러 보내기');

  // 값을 바꾸면 공유 대기가 풀림
  await page.getByRole('slider', { name: '강도' }).fill('50');
  await expect(shareButton).toHaveCount(0);

  await page.getByRole('button', { name: '저장' }).click();
  await page.getByRole('button', { name: '공유 · SHARE' }).click();
  await expect(page.getByRole('button', { name: '저장' })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __shared: string[] }).__shared)).toEqual(
    ['phone_C04.jpg'],
  );
});

test('샘플 사진 목록이 있으면 빈 화면에서 바로 열 수 있음 (PRD F-06)', async ({ page }) => {
  const jpeg = await makeTestJpeg(page);
  await page.route('**/samples/index.json', (r) => r.fulfill({ json: ['sample-1.jpg'] }));
  await page.route('**/samples/sample-1.jpg', (r) =>
    r.fulfill({ body: jpeg, contentType: 'image/jpeg' }),
  );
  await page.goto('./');
  await page.getByRole('button', { name: '샘플 1' }).click();
  await page.waitForFunction(() => window.__filmlook?.photoName === 'sample-1.jpg');
  await expect(page.locator('.frame-thumb')).toHaveCount(8);
});

test('샘플 목록이 비어 있으면 샘플 버튼이 없음', async ({ page }) => {
  await expect(page.getByText('JPEG 사진을 끌어다 놓거나')).toBeVisible();
  await expect(page.getByRole('group', { name: '샘플 사진으로 체험하기' })).toHaveCount(0);
});

test('앱 정보에 비제휴 고지가 있고 Esc로 닫힘 (PRD 5.1, 부록 B)', async ({ page }) => {
  await page.getByRole('button', { name: '앱 정보' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('후지필름(FUJIFILM Corporation)과 관련이 없으며');
  await expect(dialog).toContainText('Ultra HDR');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: '앱 정보' }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: '닫기' }).click();
  await expect(dialog).toBeHidden();
});
