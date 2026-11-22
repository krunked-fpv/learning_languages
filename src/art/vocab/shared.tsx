import type { ReactNode } from 'react';

export const INK = '#1E293B';

export type SceneRenderer = (uid: string) => ReactNode;

export function Sparkle({
  cx,
  cy,
  r = 5,
  fill = '#FACC15',
}: {
  cx: number;
  cy: number;
  r?: number;
  fill?: string;
}) {
  const ir = r * 0.34;
  return (
    <path
      d={`M${cx} ${cy - r} L${cx + ir} ${cy - ir} L${cx + r} ${cy} L${cx + ir} ${cy + ir} L${cx} ${cy + r} L${cx - ir} ${cy + ir} L${cx - r} ${cy} L${cx - ir} ${cy - ir} Z`}
      fill={fill}
      stroke={INK}
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  );
}

export function HeartMotif({
  cx,
  cy,
  scale = 1,
  fill = '#FB7185',
}: {
  cx: number;
  cy: number;
  scale?: number;
  fill?: string;
}) {
  return (
    <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
      <path
        d="M0 9C0 9 -10 2.5 -10 -3.5C-10 -6.8 -7.3 -9 -4.3 -9C-2.2 -9 -0.7 -7.8 0 -6.2C0.7 -7.8 2.2 -9 4.3 -9C7.3 -9 10 -6.8 10 -3.5C10 2.5 0 9 0 9Z"
        fill={fill}
        stroke={INK}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M-6.5 -4.2C-6.2 -5.8 -4.8 -6.6 -3.5 -6.2"
        stroke="#FFFFFF"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.7"
      />
    </g>
  );
}

export function GroundShadow({
  cx = 60,
  cy = 98,
  rx = 30,
  ry = 6,
}: {
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;
}) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#0F172A" opacity="0.12" />;
}
