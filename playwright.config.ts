import { defineConfig, devices } from '@playwright/test';

const PORT = 5174;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}/filmlook-studio/`,
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
    // 헤드리스 Chromium에서 WebGL2를 쓰려면 소프트웨어 GPU(SwiftShader)를 명시적으로 켜야 함
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}/filmlook-studio/`,
    reuseExistingServer: !process.env.CI,
  },
});
