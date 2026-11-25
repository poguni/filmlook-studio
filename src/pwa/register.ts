// 배포 빌드에서만 서비스 워커를 등록 (PRD O-03). 개발 서버에서는 화면 갱신(HMR)을 방해하지 않게 쓰지 않음
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        // 서비스 워커가 생기기 전에 받은 파일(첫 화면의 글꼴 등)도 오프라인용으로 보관하게 알려 줌
        const urls = performance
          .getEntriesByType('resource')
          .map((e) => e.name)
          .filter((u) => u.startsWith(location.origin));
        reg.active?.postMessage(urls);
      })
      .catch(() => {
        // 등록하지 못해도 온라인에서는 그대로 쓸 수 있음
      });
  });
}
