// 오프라인용 서비스 워커 (PRD O-03). 앱 파일만 보관하고, 사진은 기기 안의 파일이라 여기를 거치지 않음
// vite.config.ts의 pwa 플러그인이 sw.js로 따로 빌드하고 __PRECACHE__ 자리에 앱 파일 목록을 넣음
declare const __PRECACHE__: string[];
declare const __VERSION__: string;

// 이 파일은 DOM 타입으로 검사하므로 서비스 워커에서 쓰는 만큼만 적음
interface SwEvent extends Event {
  waitUntil(p: Promise<unknown>): void;
}
interface SwFetchEvent extends SwEvent {
  request: Request;
  respondWith(r: Promise<Response>): void;
}
interface SwMessageEvent extends SwEvent {
  data: unknown;
}
interface SwScope {
  addEventListener(type: 'install' | 'activate', fn: (e: SwEvent) => void): void;
  addEventListener(type: 'fetch', fn: (e: SwFetchEvent) => void): void;
  addEventListener(type: 'message', fn: (e: SwMessageEvent) => void): void;
  skipWaiting(): Promise<void>;
  clients: { claim(): Promise<void> };
  registration: { scope: string };
}
const sw = self as unknown as SwScope;

/** 배포마다 바뀌는 앱 파일 */
const APP_CACHE = `filmlook-app-${__VERSION__}`;
/** 처음 쓸 때 받아 두는 글꼴·샘플 (해시 이름이라 배포가 바뀌어도 그대로 씀) */
const RUNTIME_CACHE = 'filmlook-runtime';
const scope = new URL(sw.registration.scope);
// 모듈 스크립트 요청에는 Origin 머리글이 붙어, 서버가 Vary: Origin을 주면 보관본과 맞지 않게 됨
const MATCH = { ignoreVary: true };

sw.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(APP_CACHE)
      .then((c) => c.addAll(__PRECACHE__.map((p) => new URL(p, scope).href)))
      .then(() => sw.skipWaiting()),
  );
});

sw.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('filmlook-app-') && k !== APP_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => sw.clients.claim()),
  );
});

async function remember(req: Request, res: Response): Promise<Response> {
  if (res.ok && res.type === 'basic') {
    const copy = res.clone();
    void caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
  }
  return res;
}

sw.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== scope.origin || !url.href.startsWith(scope.href))
    return;
  // 해시가 붙은 파일은 내용이 바뀌지 않으므로 보관본 먼저
  if (url.pathname.startsWith(`${scope.pathname}assets/`)) {
    e.respondWith(
      caches.match(req, MATCH).then((hit) => hit ?? fetch(req).then((r) => remember(req, r))),
    );
    return;
  }
  // 첫 화면·목록 같은 나머지는 새 배포를 바로 받도록 네트워크 먼저, 오프라인이면 보관본
  e.respondWith(
    fetch(req)
      .then((r) => remember(req, r))
      .catch(async () => {
        const hit = await caches.match(req, { ...MATCH, ignoreSearch: true });
        if (hit) return hit;
        if (req.mode === 'navigate') {
          const shell = await caches.match(new URL('./', scope).href, MATCH);
          if (shell) return shell;
        }
        return Response.error();
      }),
  );
});

// 서비스 워커가 생기기 전에 받은 글꼴 등을 페이지가 알려 주면 보관해 둠
sw.addEventListener('message', (e) => {
  const urls = Array.isArray(e.data) ? e.data.filter((u) => typeof u === 'string') : [];
  e.waitUntil(
    caches.open(RUNTIME_CACHE).then((c) =>
      Promise.all(
        urls
          .filter((u: string) => u.startsWith(scope.href))
          .map(async (u: string) => {
            if (!(await c.match(u, MATCH))) await c.add(u).catch(() => undefined);
          }),
      ),
    ),
  );
});

// 전역 타입과 섞이지 않게 모듈로 둠
export {};
