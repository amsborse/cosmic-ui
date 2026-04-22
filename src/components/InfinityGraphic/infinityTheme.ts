import type { CSSProperties } from 'react';
import type { InfinityColorScheme } from './InfinityGraphic.types';

/** Internal theme tokens; not part of the public package API. */
export type InfinityTheme = {
  mode: InfinityColorScheme;
  /** Unique suffix so React can swap defs cleanly when `colorScheme` changes. */
  idSuffix: string;
  background: { top: string; mid: string; bottom: string };
  hazeLeft: { from: string; via: string; to: string; fromOp: string; viaOp: string };
  hazeRight: { from: string; via: string; to: string; fromOp: string; viaOp: string };
  vignette: { inner: string; edge: string; innerOp: string; edgeOp: string };
  pathGrad1: [number, string][];
  pathGrad2: [number, string][];
  pathGrad3: [number, string][];
  stroke: { mainGlow: number; mainCore: number; secondaryGlow: number; secondaryCore: number };
  centerEllipse: { fillRef: 'coreGlow' };
  centerCross: { outerFill: string; innerFill: string };
  coreRadial: { stops: { off: string; c: string; o: string }[] };
  shimmer: { color: string; peakOpacity: string };
  frame: { outer: string; inner: string; capture: string };
  hoverHalo: { large: string; small: string; smallOp: string };
  mouse: { r38: string; r10: string; r10Op: string };
  orbs: {
    main: [string, string, string];
    core: string;
    trail: [string, string, string];
    trailCore: string;
  };
  blur: { soft: number; wide: number; center: number; mouse: number };
};

export const gid = (t: InfinityTheme, name: string) => `${name}-${t.idSuffix}`;

function stopsFrom(pairs: [number, string][]) {
  return pairs;
}

export function getInfinityTheme(colorScheme: InfinityColorScheme): InfinityTheme {
  if (colorScheme === 'light') {
    return {
      mode: 'light',
      idSuffix: 'light',
      background: { top: '#F5F6FD', mid: '#EEF0FA', bottom: '#E4E7F2' },
      hazeLeft: {
        from: '#4F46E5',
        via: '#7C3AED',
        to: '#4F46E5',
        fromOp: '0.10',
        viaOp: '0.05',
      },
      hazeRight: {
        from: '#0EA5E9',
        via: '#2563EB',
        to: '#0EA5E9',
        fromOp: '0.10',
        viaOp: '0.05',
      },
      vignette: { inner: '#FFFFFF', edge: '#0F172A', innerOp: '0', edgeOp: '0.04' },
      pathGrad1: stopsFrom([
        [0, '#4C1D95'],
        [20, '#5B21B6'],
        [40, '#6366F1'],
        [50, '#4338CA'],
        [60, '#5B21B6'],
        [80, '#0E7490'],
        [100, '#0369A1'],
      ]),
      pathGrad2: stopsFrom([
        [0, '#6B21A8'],
        [35, '#7C3AED'],
        [70, '#5B21B6'],
        [100, '#4C1D95'],
      ]),
      pathGrad3: stopsFrom([
        [0, '#1D4ED8'],
        [35, '#2563EB'],
        [70, '#1E40AF'],
        [100, '#0C4A6E'],
      ]),
      stroke: { mainGlow: 0.22, mainCore: 0.92, secondaryGlow: 0.2, secondaryCore: 0.78 },
      centerEllipse: { fillRef: 'coreGlow' },
      centerCross: { outerFill: 'rgba(99, 102, 241, 0.35)', innerFill: 'rgba(30, 64, 175, 0.25)' },
      coreRadial: {
        stops: [
          { off: '0%', c: '#6366F1', o: '0.2' },
          { off: '40%', c: '#818CF8', o: '0.12' },
          { off: '70%', c: '#4F46E5', o: '0.08' },
          { off: '100%', c: '#312E81', o: '0' },
        ],
      },
      shimmer: { color: '#4338CA', peakOpacity: '0.35' },
      frame: { outer: 'rgba(99, 102, 241, 0.22)', inner: 'rgba(15, 23, 42, 0.08)', capture: 'rgba(15, 23, 42, 0.06)' },
      hoverHalo: { large: 'rgba(99, 102, 241, 0.5)', small: 'rgba(30, 64, 175, 0.4)', smallOp: '0.2' },
      mouse: { r38: 'rgba(99, 102, 241, 0.45)', r10: 'rgba(30, 64, 175, 0.5)', r10Op: '0.2' },
      orbs: {
        main: ['#4F46E5', '#5B21B6', '#2563EB'],
        core: '#0F172A',
        trail: ['#6366F1', '#7C3AED', '#2563EB'],
        trailCore: '#0F172A',
      },
      blur: { soft: 1.7, wide: 3.2, center: 6, mouse: 9 },
    };
  }

  return {
    mode: 'dark',
    idSuffix: 'dark',
    background: { top: '#04030B', mid: '#09061A', bottom: '#02030A' },
    hazeLeft: {
      from: '#8A5CFF',
      via: '#6E44FF',
      to: '#6E44FF',
      fromOp: '0.12',
      viaOp: '0.05',
    },
    hazeRight: {
      from: '#5B8CFF',
      via: '#4D6BFF',
      to: '#4D6BFF',
      fromOp: '0.12',
      viaOp: '0.05',
    },
    // Tint edge to the canvas mid so corners darken without a flat #000 "hole" over the lobes
    vignette: { inner: '#09061A', edge: '#060410', innerOp: '0', edgeOp: '0.22' },
    pathGrad1: stopsFrom([
      [0, '#DCCBFF'],
      [22, '#8A5CFF'],
      [44, '#6E44FF'],
      [50, '#FFFFFF'],
      [58, '#DCCBFF'],
      [78, '#5B8CFF'],
      [100, '#8FD4FF'],
    ]),
    pathGrad2: stopsFrom([
      [0, '#E5D8FF'],
      [32, '#A97EFF'],
      [68, '#7A56FF'],
      [100, '#DCCBFF'],
    ]),
    pathGrad3: stopsFrom([
      [0, '#D6E6FF'],
      [34, '#8DB7FF'],
      [70, '#5B8CFF'],
      [100, '#8FD4FF'],
    ]),
    stroke: { mainGlow: 0.14, mainCore: 0.82, secondaryGlow: 0.14, secondaryCore: 0.62 },
    centerEllipse: { fillRef: 'coreGlow' },
    centerCross: { outerFill: '#DCCBFF', innerFill: '#d7e4ff' },
    coreRadial: {
      stops: [
        { off: '0%', c: '#FFFFFF', o: '0.24' },
        { off: '34%', c: '#DCCBFF', o: '0.16' },
        { off: '64%', c: '#8A5CFF', o: '0.09' },
        { off: '100%', c: '#5B8CFF', o: '0' },
      ],
    },
    shimmer: { color: '#ffffff', peakOpacity: '0.38' },
    frame: { outer: 'rgba(138,92,255,0.12)', inner: 'rgba(255,255,255,0.035)', capture: 'rgba(255,255,255,0.04)' },
    hoverHalo: { large: '#DCCBFF', small: '#ffffff', smallOp: '0.08' },
    mouse: { r38: '#DCCBFF', r10: '#ffffff', r10Op: '0.08' },
    orbs: {
      main: ['#FFFFFF', '#DCCBFF', '#8FD4FF'],
      core: '#ffffff',
      trail: ['#DCCBFF', '#A97EFF', '#7DB8FF'],
      trailCore: '#ffffff',
    },
    blur: { soft: 2.6, wide: 5, center: 9, mouse: 12 },
  };
}

/** Merged for root `<svg>`. Layout and theme tint live in `InfinityGraphic.css`. */
export function themeSvgStyle(
  className: string | undefined,
  userStyle: CSSProperties | undefined,
): { className: string; style: CSSProperties } {
  return {
    className: ['infinity-graphic', className].filter(Boolean).join(' '),
    style: { ...userStyle },
  };
}
