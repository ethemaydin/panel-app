import { psize } from './logic.ts';

export function art(id: number): string {
  let a = (id * 2654435761) % 4294967296;
  const R = () => {
    a = (a + 1831565813) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const h = R() * 360;
  const h2 = (h + 30 + R() * 90) % 360;
  const k = id % 5;
  const sun = (h + 35) % 360;
  const sx = 70 + R() * 360;
  const sy = 45 + R() * 80;
  const sr = 16 + R() * 20;

  let o = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 300'><defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='hsl(${h.toFixed(0)},40%,${(18 + R() * 12).toFixed(0)}%)'/><stop offset='1' stop-color='hsl(${h2.toFixed(0)},45%,${(38 + R() * 14).toFixed(0)}%)'/></linearGradient><radialGradient id='s'><stop offset='0' stop-color='hsl(${sun.toFixed(0)},75%,85%)'/><stop offset='1' stop-color='hsl(${sun.toFixed(0)},75%,85%)' stop-opacity='0'/></radialGradient></defs><rect width='500' height='300' fill='url(#g)'/>`;

  for (let i = 0; i < 34; i++) {
    o += `<circle cx='${(R() * 500).toFixed(0)}' cy='${(R() * 170).toFixed(0)}' r='${(R() * 1.3 + 0.3).toFixed(1)}' fill='#fff' opacity='${(0.25 + R() * 0.5).toFixed(2)}'/>`;
  }

  o += `<circle cx='${sx.toFixed(0)}' cy='${sy.toFixed(0)}' r='${(sr * 3.4).toFixed(0)}' fill='url(#s)'/><circle cx='${sx.toFixed(0)}' cy='${sy.toFixed(0)}' r='${sr.toFixed(0)}' fill='hsl(${sun.toFixed(0)},65%,91%)' opacity='.93'/>`;

  const L = 3 + (k % 3);
  for (let j = 0; j < L; j++) {
    const y = 140 + j * (150 / L);
    const am = 12 + R() * 34;
    const ph = R() * 6;
    const fq = k === 1 ? 25 : k === 2 ? 45 : 70;
    let d = 'M0 300L0 ' + y;
    for (let x = 0; x <= 500; x += 10) {
      const w = Math.sin(x / fq + ph) * am;
      const pk = k === 0 ? Math.abs(Math.sin(x / 55 + ph * 2)) * am * 1.6 : 0;
      d += 'L' + x + ' ' + (y - w - pk).toFixed(1);
    }
    d += 'L500 300Z';
    o += `<path d='${d}' fill='hsl(${((h2 + j * 16) % 360).toFixed(0)},${(24 + j * 5).toFixed(0)}%,${(32 - j * 6).toFixed(0)}%)' opacity='${(0.7 + j * 0.1).toFixed(2)}'/>`;
  }

  return (
    o +
    `<rect y='${(150 + R() * 40).toFixed(0)}' width='500' height='60' fill='hsl(${h.toFixed(0)},30%,80%)' opacity='.07'/></svg>`
  );
}

export function uri(id: number): string {
  return 'data:image/svg+xml,' + encodeURIComponent(art(id)).replace(/'/g, '%27');
}

export interface PuzzleGridProps {
  id: number;
  n: number;
}

export function getPuzzlePieceStyles(id: number, index: number, isUnlocked: boolean) {
  const tot = psize(id);
  const c = tot === 4 ? 2 : 5;
  const x = index % c;
  const y = Math.floor(index / c);
  const u = `url("${uri(id)}")`;

  if (!isUnlocked) {
    return {
      background: 'repeating-linear-gradient(45deg, var(--line), var(--line) 6px, var(--bg) 6px, var(--bg) 12px)',
      opacity: 0.7,
    };
  }

  return {
    backgroundImage: u,
    backgroundSize: `${c * 100}% 200%`,
    backgroundPosition: `${c > 1 ? (x * 100) / (c - 1) : 0}% ${y * 100}%`,
  };
}
