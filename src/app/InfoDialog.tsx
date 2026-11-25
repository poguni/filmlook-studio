// 앱 정보: 비제휴 고지(PRD 5.1, 부록 B), 개인 정보, Ultra HDR 안내(PRD 6.3), 글꼴 라이선스
import { useEffect, useRef } from 'react';
import { useTheme } from '../themes/kit';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function InfoDialog({ open, onClose }: Props) {
  const { copy } = useTheme();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    // Esc로 닫혀도 상태가 맞도록 close 이벤트를 받음
    <dialog ref={ref} className="info" aria-labelledby="info-title" onClose={onClose}>
      <h2 id="info-title">{copy['info.title']}</h2>
      <p>{copy['info.disclaimer']}</p>
      <ul>
        <li>{copy['info.privacy']}</li>
        <li>{copy['info.approx']}</li>
        <li>{copy['info.hdr']}</li>
        <li>{copy['info.fonts']}</li>
      </ul>
      <button type="button" className="info-close" onClick={onClose} autoFocus>
        {copy['info.close']}
      </button>
    </dialog>
  );
}
