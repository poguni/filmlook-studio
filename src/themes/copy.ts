// 테마별 문구 사전의 키 (design/DESIGN.md 5장). 테마마다 이 형태를 모두 채움
export interface Copy {
  open: string;
  strength: string;
  'drop.hint': string;
  /** 밀착 인화 칸의 접근 이름. {name}에 “V02 비비드 슬라이드”나 “원본”이 들어감 */
  'frame.label': string;
  'error.notJpeg': string;
  'error.decode': string;
  'error.noWebgl2': string;
  'icc.adobeRgb': string;
}
