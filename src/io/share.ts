// 두 단계 공유 (PRD S-04): 저장(렌더링)이 끝난 뒤 사용자가 한 번 더 눌러야 공유 시트가 열림
import { isPhone } from './limits';

/** 스마트폰이고 파일 공유를 지원하면 true. 아니면 바로 내려받음 */
export function canShareFiles(): boolean {
  if (!isPhone() || typeof navigator.canShare !== 'function') return false;
  try {
    return navigator.canShare({ files: [new File([], 'test.jpg', { type: 'image/jpeg' })] });
  } catch {
    return false;
  }
}

/** 공유 시트를 엶. 사용자가 닫으면(AbortError) 조용히 끝냄 */
export async function shareFile(file: File): Promise<void> {
  try {
    await navigator.share({ files: [file] });
  } catch (e) {
    if (!(e instanceof DOMException && e.name === 'AbortError')) throw e;
  }
}
