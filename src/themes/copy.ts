// 테마별 문구 사전의 키 (design/DESIGN.md 5장). 테마마다 이 형태를 모두 채움
export interface Copy {
  open: string;
  save: string;
  /** {n}에 진행률(%)이 들어감 */
  'save.progress': string;
  'save.info': string;
  strength: string;
  /** 강도 슬라이더의 접근 이름 (테마와 무관한 기본 이름) */
  'strength.name': string;
  'compare.label': string;
  'compare.left': string;
  /** {code}·{strength}·{name}을 쓸 수 있음 */
  'compare.right': string;
  'compare.hint': string;
  'sheet.label': string;
  'drop.hint': string;
  /** 밀착 인화 칸의 접근 이름. {name}에 “V02 비비드 슬라이드”나 “원본”이 들어감 */
  'frame.label': string;
  'error.notJpeg': string;
  'error.decode': string;
  'error.save': string;
  'error.noWebgl2': string;
  'icc.adobeRgb': string;
}

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}
