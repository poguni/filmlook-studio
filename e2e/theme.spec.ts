// M5 테마 확장 스모크 테스트: 테마 전환·기억, 단축키 T, 테마별 저장 (PRD O-02, O-05, 10장 M5)
import { expect, test, type Page } from '@playwright/test';
import { makeTestJpeg } from './fixtures';

async function openTestPhoto(page: Page, name = 'theme.jpg') {
  await page
    .getByTestId('file-input')
    .setInputFiles({ name, mimeType: 'image/jpeg', buffer: await makeTestJpeg(page) });
  await page.waitForFunction((n) => window.__filmlook?.photoName === n, name);
}

async function pickTheme(page: Page, name: string) {
  await page.getByRole('button', { name: '테마 바꾸기' }).click();
  await page.getByRole('menuitemradio', { name }).click();
}

const html = (page: Page) => page.locator('html');

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('테마를 바꿔도 편집 상태는 그대로, 기믹만 꺼지고 다시 열어도 기억함 (PRD O-02, O-05)', async ({
  page,
}) => {
  await expect(html(page)).toHaveAttribute('data-theme', 'camera');
  await openTestPhoto(page);
  await page.getByRole('button', { name: 'V02 비비드 슬라이드 선택' }).click();
  await page.getByRole('slider', { name: '강도' }).fill('40');
  await page.getByRole('button', { name: '뷰파인더 격자선' }).click();
  await expect(html(page)).toHaveAttribute('data-gimmick', 'on');

  await pickTheme(page, '암실');
  await expect(html(page)).toHaveAttribute('data-theme', 'darkroom');
  await expect(html(page)).toHaveAttribute('data-gimmick', 'off');
  await expect(page.getByRole('button', { name: 'V02 비비드 슬라이드 선택' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('slider', { name: '강도' })).toHaveValue('40');
  await expect(page.getByRole('button', { name: '작업등' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );

  // 메뉴는 현재 테마에 체크 표시, Esc로 닫힘
  await page.getByRole('button', { name: '테마 바꾸기' }).click();
  await expect(page.getByRole('menuitemradio', { name: '암실' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);

  await page.reload();
  await expect(html(page)).toHaveAttribute('data-theme', 'darkroom');
  await expect(page.getByRole('button', { name: '인화하기 · JPEG 저장' })).toBeVisible();
});

test('단축키 T로 다음 테마, 입력 칸에 포커스가 있으면 무시 (PRD 8.1)', async ({ page }) => {
  await page.locator('body').press('t');
  await expect(html(page)).toHaveAttribute('data-theme', 'pastel');
  await page.locator('body').press('t');
  await expect(html(page)).toHaveAttribute('data-theme', 'darkroom');
  await page.locator('body').press('t');
  await expect(html(page)).toHaveAttribute('data-theme', 'camera');

  await page.getByRole('slider', { name: '강도' }).focus();
  await page.keyboard.press('t');
  await expect(html(page)).toHaveAttribute('data-theme', 'camera');
});

test('A 암실: 조절판의 인화 카드로 저장 (design/DESIGN.md 6.5)', async ({ page }) => {
  await pickTheme(page, '암실');
  await openTestPhoto(page, 'dark.jpg');
  await page.getByRole('button', { name: 'C04 다큐 크롬 선택' }).click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: '인화하기', exact: true }).click();
  expect((await downloading).suggestedFilename()).toBe('dark_C04.jpg');
});

test('C 파스텔: 헤더 저장, 오류 문구는 테마 말투로 바뀜 (PRD O-02)', async ({ page }) => {
  await page
    .getByTestId('file-input')
    .setInputFiles({ name: 'note.png', mimeType: 'image/png', buffer: Buffer.from('not a jpeg') });
  await expect(page.getByRole('alert')).toHaveText('JPEG 사진만 열 수 있습니다.');
  await pickTheme(page, '파스텔 사진관');
  await expect(page.getByRole('alert')).toHaveText('JPEG 사진만 열 수 있어요.');

  await openTestPhoto(page, 'soft.jpg');
  await page.getByRole('button', { name: 'M07 모노 그레인 선택' }).click();
  await page.getByRole('button', { name: '딸기 빨강' }).click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: '사진 뽑기 · 저장' }).click();
  expect((await downloading).suggestedFilename()).toBe('soft_M07.jpg');
});
