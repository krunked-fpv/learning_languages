import { useLayoutEffect, useRef, useState } from 'react';
import type { HintGlintArc } from './useHintEngine';

export interface StarlightGlintArcProps {
  glintArc: HintGlintArc | null;
  disabled?: boolean;
}

interface ArcCoords {
  x1: number;
  y1: number;
  cx: number;
  cy: number;
  x2: number;
  y2: number;
  key: string;
}

function findTileElement(container: HTMLElement, uid: string): HTMLElement | null {
  const candidates = container.querySelectorAll<HTMLElement>('[data-tile-uid]');
  for (const el of candidates) {
    if (el.getAttribute('data-tile-uid') === uid) {
      return el;
    }
  }
  return null;
}

export function StarlightGlintArc({ glintArc, disabled }: StarlightGlintArcProps) {
  const markerRef = useRef<SVGSVGElement | null>(null);
  const [coords, setCoords] = useState<ArcCoords | null>(null);

  useLayoutEffect(() => {
    if (!glintArc || disabled) {
      setCoords(null);
      return;
    }
    const container = markerRef.current?.parentElement;
    if (!container) {
      setCoords(null);
      return;
    }
    const fromEl = findTileElement(container, glintArc.fromUid);
    const toEl = findTileElement(container, glintArc.toUid);
    if (!fromEl || !toEl) {
      setCoords(null);
      return;
    }
    const containerRect = container.getBoundingClientRect();
    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    if (containerRect.width === 0 || fromRect.width === 0 || toRect.width === 0) {
      setCoords(null);
      return;
    }
    const x1 = fromRect.left - containerRect.left + fromRect.width / 2;
    const y1 = fromRect.top - containerRect.top + fromRect.height / 2;
    const x2 = toRect.left - containerRect.left + toRect.width / 2;
    const y2 = toRect.top - containerRect.top + toRect.height / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lift = Math.min(26, Math.max(12, Math.hypot(dx, dy) * 0.16));
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2 - lift;
    setCoords({ x1, y1, cx, cy, x2, y2, key: glintArc.key });
  }, [glintArc, disabled]);

  if (!glintArc || disabled) return null;

  return (
    <svg
      ref={markerRef}
      className="starlight-glint-arc"
      aria-hidden="true"
      data-testid="starlight-glint-arc"
    >
      <defs>
        <linearGradient id="starlightArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(167, 139, 250, 0.2)" />
          <stop offset="50%" stopColor="rgba(103, 232, 249, 0.92)" />
          <stop offset="100%" stopColor="rgba(253, 224, 71, 0.85)" />
        </linearGradient>
      </defs>
      {coords ? (
        <path
          key={coords.key}
          className="starlight-glint-path"
          d={`M ${coords.x1} ${coords.y1} Q ${coords.cx} ${coords.cy} ${coords.x2} ${coords.y2}`}
          stroke="url(#starlightArcGrad)"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );
}
