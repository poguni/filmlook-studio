import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './themes/camera';
import { registerServiceWorker } from './pwa/register';

const root = document.getElementById('root');
if (!root) throw new Error('#root 요소가 없습니다');

// 튜닝 화면(PRD 7장)은 개발 서버의 /tuning에서만. 배포 빌드에서는 이 분기가 통째로 빠짐
const Tuning =
  import.meta.env.DEV && location.pathname.endsWith('/tuning')
    ? lazy(() => import('./tuning/Tuning').then((m) => ({ default: m.Tuning })))
    : null;

registerServiceWorker();

createRoot(root).render(
  <StrictMode>
    {Tuning ? (
      <Suspense>
        <Tuning />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
