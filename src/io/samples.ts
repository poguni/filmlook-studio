// 체험용 샘플 사진 (PRD F-06). public/samples/index.json에 파일 이름 목록이 있음
// (scripts/prepare-samples.mjs가 EXIF·GPS를 지우고 목록을 만듦)
const base = `${import.meta.env.BASE_URL}samples/`;

export async function listSamples(): Promise<string[]> {
  try {
    const res = await fetch(`${base}index.json`);
    if (!res.ok) return [];
    const list: unknown = await res.json();
    return Array.isArray(list) ? list.filter((n): n is string => typeof n === 'string') : [];
  } catch {
    return [];
  }
}

export async function fetchSample(name: string): Promise<File> {
  const res = await fetch(base + encodeURIComponent(name));
  if (!res.ok) throw new Error(`샘플을 불러오지 못했습니다: ${name}`);
  return new File([await res.blob()], name, { type: 'image/jpeg' });
}
