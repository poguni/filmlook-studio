// 스마트폰 저장 해상도 상한 (PRD 6.3). 데스크톱은 원본 해상도를 유지
/** 갤럭시 실기기 측정 전 임시값(백만 화소). 측정 후 PRD 6.3 표와 함께 고침 */
export const PHONE_LIMIT_MP = 24;

export function isPhone(): boolean {
  const data = (navigator as Navigator & { userAgentData?: { mobile: boolean } }).userAgentData;
  return data?.mobile ?? /Android|iPhone|iPod/i.test(navigator.userAgent);
}

/**
 * 이 기기의 저장 상한(백만 화소). 상한이 없으면 null
 * 개발 서버에서는 주소 뒤 `?cap=50`처럼 상한을 바꿔 실기기 측정과 테스트에 씀 (`?cap=0`은 상한 없음)
 */
export function saveLimitMp(): number | null {
  if (import.meta.env.DEV) {
    const cap = new URLSearchParams(location.search).get('cap');
    if (cap !== null) return Number(cap) > 0 ? Number(cap) : null;
  }
  return isPhone() ? PHONE_LIMIT_MP : null;
}
