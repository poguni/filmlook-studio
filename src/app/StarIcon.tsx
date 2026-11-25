// 별표 아이콘 (PRD C-05). 색은 currentColor로 테마 토큰을 따름
export function StarIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M10 1.8 L12.5 7.2 L18.3 7.8 L13.9 11.7 L15.2 17.5 L10 14.5 L4.8 17.5 L6.1 11.7 L1.7 7.8 L7.5 7.2 Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
