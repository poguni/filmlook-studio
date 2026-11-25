// 테마 전환 (PRD O-02, design/DESIGN.md 6.3): 지름 44px 견본 버튼 + 세 테마 메뉴
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { THEME_ORDER, THEMES } from '../themes';
import { useTheme, type ThemeName } from '../themes/kit';

interface Props {
  theme: ThemeName;
  onTheme: (theme: ThemeName) => void;
}

/** 테마 견본 원. 색은 각 테마 tokens.css가 전역에 둔 --swatch-<이름> 변수 */
function Swatch({ name }: { name: ThemeName }) {
  return <span className={`theme-swatch theme-swatch-${name}`} aria-hidden="true" />;
}

export function ThemeSwitcher({ theme, onTheme }: Props) {
  const { copy } = useTheme();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  // 메뉴가 열리면 현재 테마 항목에 포커스, 바깥을 누르면 닫힘
  useEffect(() => {
    if (!open) return;
    items.current[THEME_ORDER.indexOf(theme)]?.focus();
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open, theme]);

  const onMenuKey = (e: KeyboardEvent) => {
    const i = items.current.findIndex((el) => el === document.activeElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      root.current?.querySelector<HTMLButtonElement>('.theme-button')?.focus();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = THEME_ORDER.length;
      items.current[(i + (e.key === 'ArrowDown' ? 1 : n - 1)) % n]?.focus();
    }
  };

  return (
    <div className="theme-switcher" ref={root}>
      <button
        type="button"
        className="theme-button"
        aria-label={copy['theme.label']}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Swatch name={theme} />
      </button>
      {open && (
        <div
          className="theme-menu"
          role="menu"
          aria-label={copy['theme.label']}
          onKeyDown={onMenuKey}
        >
          {THEME_ORDER.map((name, i) => (
            <button
              key={name}
              ref={(el) => {
                items.current[i] = el;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={name === theme}
              onClick={() => {
                onTheme(name);
                setOpen(false);
              }}
            >
              <Swatch name={name} />
              <span>{THEMES[name].copy['theme.name']}</span>
              {name === theme && (
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <path
                    d="M3 8.5 L6.5 12 L13 4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
