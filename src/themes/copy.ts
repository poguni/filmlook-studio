// 테마별 문구 사전의 키 (design/DESIGN.md 5장). 테마마다 이 형태를 모두 채움
export interface Copy {
  open: string;
  save: string;
  /** {n}에 진행률(%)이 들어감 */
  'save.progress': string;
  /** {q}에 저장 품질(%) */
  'save.info': string;
  /** 스마트폰 해상도 상한에 걸릴 때 save.info 자리에 보임. {mp}에 상한 */
  'save.downscaled': string;
  strength: string;
  /** 강도 슬라이더의 접근 이름 (테마와 무관한 기본 이름) */
  'strength.name': string;
  grain: string;
  /** 입자 슬라이더의 접근 이름 */
  'grain.name': string;
  'grain.size': string;
  'grain.small': string;
  'grain.large': string;
  /** 비네팅 (PRD E-06). name은 슬라이더의 접근 이름 */
  vignette: string;
  'vignette.name': string;
  /** 저장 품질 (PRD S-05). option의 {q}에 80·92·100 */
  'quality.title': string;
  'quality.option': string;
  'mono.title': string;
  /** 흑백 프리셋이 아닐 때 보이는 안내 */
  'mono.disabled': string;
  'mono.none': string;
  'mono.yellow': string;
  'mono.red': string;
  'mono.green': string;
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
  /** 두 단계 공유 (PRD S-04) */
  share: string;
  'share.hint': string;
  /** 기믹 토글의 접근 이름과 켜짐·꺼짐 표시 (PRD O-04) */
  'gimmick.label': string;
  'gimmick.on': string;
  'gimmick.off': string;
  /** 누르고 있는 동안 원본 보기 (PRD E-04) */
  'original.hold': string;
  /** 사용자 LUT (PRD P-05) */
  'userLut.add': string;
  'userLut.remove': string;
  'userLut.subtitle': string;
  'error.cube': string;
  /** 샘플 사진 (PRD F-06). {n}에 번호 */
  'samples.title': string;
  'samples.item': string;
  /** 앱 정보 화면 (PRD 5.1, 부록 B) */
  'info.open': string;
  'info.title': string;
  'info.disclaimer': string;
  'info.privacy': string;
  'info.approx': string;
  'info.hdr': string;
  'info.fonts': string;
  'info.close': string;
  /** 테마 전환 버튼의 접근 이름과 이 테마의 이름 (PRD O-02) */
  'theme.label': string;
  'theme.name': string;
  /** 밀착 인화 칸의 프레임 번호 표기. {no}에 00~09 */
  'frame.no': string;
  /** 조절판 저장 카드의 버튼 (헤더 저장과 같은 동작) */
  'save.card': string;
  /** 별표 토글 (PRD C-05). 고른 칸에 별표를 달거나 뗌 */
  'star.toggle': string;
  /** 별표가 달린 칸의 접근 이름. {label}에 frame.label 결과 */
  'frame.starred': string;
  /** 100% 확대 보기 토글과, 원본 해상도를 불러오는 동안의 문구 (PRD E-07) */
  'zoom.toggle': string;
  'zoom.loading': string;
}

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}
