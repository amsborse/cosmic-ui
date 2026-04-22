import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CSSProperties, MouseEvent, PointerEvent } from 'react';
import { getInfinityTheme, gid, themeSvgStyle, type InfinityTheme } from './infinityTheme';
import type { InfinityGraphicProps } from './InfinityGraphic.types';
import { getStateBehavior } from './InfinityGraphic.state';
import './InfinityGraphic.css';

export type {
  InfinityColorScheme,
  InfinityGraphicMode,
  InfinityGraphicProps,
  InfinityGraphicState,
} from './InfinityGraphic.types';

type Point = { x: number; y: number };
type HoverState = {
  x: number;
  y: number;
  active: boolean;
  insideCapture: boolean;
};
type OrbConfig = {
  baseSpeed: number;
  reverse?: boolean;
  scale: number;
  depth: 'main' | 'top' | 'bottom';
  phase: number;
};
type OrbMode = 'path' | 'hover' | 'return';
type OrbState = {
  progress: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
  trail: Point[];
  mode: OrbMode;
};

const VIEW_W = 1200;
const VIEW_H = 700;
const CENTER_X = 600;
const CENTER_Y = 350;
const MAX_TRAIL_LENGTH = 28;

const ORB_CONFIGS: OrbConfig[] = [
  { baseSpeed: 0.102, scale: 1.34, depth: 'main', phase: 0 },
  { baseSpeed: 0.091, scale: 1.18, depth: 'top', phase: 0.34, reverse: true },
  { baseSpeed: 0.112, scale: 1.26, depth: 'bottom', phase: 0.68 },
];

const FOLLOWER_OFFSETS = [
  { x: 0, y: 0 },
  { x: -30, y: 22 },
  { x: 30, y: 22 },
];

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function sampleInfinity(
  scaleX: number,
  scaleY: number,
  offsetY = 0,
  organic = 0,
  samples = 360,
): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= samples; i += 1) {
    const t = (i / samples) * Math.PI * 2;
    const denom = 1 + Math.sin(t) * Math.sin(t);
    const baseX = (Math.cos(t) / denom) * scaleX;
    const baseY = (Math.sin(t) * Math.cos(t) / denom) * scaleY;
    const organicX = organic * Math.cos(t * 3) * 6;
    const organicY = organic * Math.sin(t * 2) * 4;
    points.push({ x: CENTER_X + baseX + organicX, y: CENTER_Y + offsetY + baseY + organicY });
  }
  return points;
}

function pointsToPath(points: Point[]) {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
}

function getPointAt(points: Point[], progress: number, reverse = false): Point {
  const total = points.length - 1;
  const wrapped = ((reverse ? 1 - progress : progress) % 1 + 1) % 1;
  const scaled = wrapped * total;
  const index = Math.floor(scaled);
  const next = (index + 1) % points.length;
  const t = scaled - index;
  return {
    x: lerp(points[index].x, points[next].x, t),
    y: lerp(points[index].y, points[next].y, t),
  };
}

function seedTrail(points: Point[], phase: number, reverse = false, length = MAX_TRAIL_LENGTH) {
  const seeded: Point[] = [];
  for (let i = 0; i < length; i += 1) seeded.push(getPointAt(points, phase - i * 0.013, reverse));
  return seeded;
}

function findNearestProgress(points: Point[], x: number, y: number, reverse = false) {
  let bestIndex = 0;
  let bestDist = Infinity;
  for (let i = 0; i < points.length; i += 1) {
    const dx = points[i].x - x;
    const dy = points[i].y - y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
    }
  }
  const normalized = bestIndex / (points.length - 1);
  return reverse ? 1 - normalized : normalized;
}

type OrbRefs = {
  wide: SVGCircleElement | null;
  soft: SVGCircleElement | null;
  core: SVGCircleElement | null;
  trailWide: (SVGCircleElement | null)[];
  trailCore: (SVGCircleElement | null)[];
};

type Ripple = { id: number; x: number; y: number };

export function InfinityGraphic({
  mode: modeProp,
  colorScheme: colorSchemeProp,
  state = 'calm',
  showPaths = true,
  interactive = true,
  followCursor = true,
  cursorInfluence = 0.18,
  glowIntensity = 1,
  particleCount = 8,
  speed = 1,
  className,
  style,
  'aria-label': ariaLabel = 'Animated infinity graphic',
  onClick,
  onHoverStart,
  onHoverEnd,
  onPointerMove,
}: InfinityGraphicProps) {
  const colorMode = colorSchemeProp ?? modeProp ?? 'dark';
  const t: InfinityTheme = useMemo(() => getInfinityTheme(colorMode), [colorMode]);
  const sm = useMemo(() => getStateBehavior(state), [state]);
  const svgStyle = useMemo(
    () => themeSvgStyle(undefined, { display: 'block', width: '100%', height: 'auto' }),
    [],
  );

  const [hover, setHover] = useState<HoverState>({
    x: CENTER_X,
    y: CENTER_Y,
    active: false,
    insideCapture: false,
  });
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleId = useRef(0);

  const hoverRef = useRef<HoverState>(hover);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const interactiveRef = useRef(interactive);
  const followCursorRef = useRef(followCursor);
  const cursorInfluenceRef = useRef(cursorInfluence);
  const speedRef = useRef(speed);
  const stRef = useRef(sm);
  const behaviorSpeedRef = useRef(sm.speed);

  useEffect(() => {
    interactiveRef.current = interactive;
  }, [interactive]);
  useEffect(() => {
    followCursorRef.current = followCursor;
  }, [followCursor]);
  useEffect(() => {
    cursorInfluenceRef.current = cursorInfluence;
  }, [cursorInfluence]);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  useEffect(() => {
    stRef.current = sm;
    behaviorSpeedRef.current = sm.speed;
  }, [sm]);

  const sampled = useMemo(() => {
    const mainPts = sampleInfinity(400, 280, 0, 0);
    const upperPts = sampleInfinity(372, 248, -22, 0.1);
    const lowerPts = sampleInfinity(372, 248, 22, -0.1);
    return {
      mainPts,
      upperPts,
      lowerPts,
      main: pointsToPath(mainPts),
      upper: pointsToPath(upperPts),
      lower: pointsToPath(lowerPts),
    };
  }, []);

  const orbsRef = useRef<OrbState[]>(
    ORB_CONFIGS.map((config, idx) => {
      const points = idx === 0 ? sampled.mainPts : idx === 1 ? sampled.upperPts : sampled.lowerPts;
      const p = getPointAt(points, config.phase, config.reverse);
      return {
        progress: config.phase,
        vx: 0,
        vy: 0,
        x: p.x,
        y: p.y,
        trail: seedTrail(points, config.phase, config.reverse),
        mode: 'path' as OrbMode,
      };
    }),
  );

  const orbRefs = useRef<OrbRefs[]>(
    ORB_CONFIGS.map(() => ({
      wide: null,
      soft: null,
      core: null,
      trailWide: new Array(MAX_TRAIL_LENGTH - 1).fill(null),
      trailCore: new Array(MAX_TRAIL_LENGTH - 1).fill(null),
    })),
  );

  useEffect(() => {
    hoverRef.current = hover;
  }, [hover]);

  const sparkles = useMemo(() => {
    const c = Math.min(30, Math.max(0, Math.floor(particleCount)));
    const pts = sampled.mainPts;
    if (c === 0 || pts.length < 2) return [];
    const out: Point[] = [];
    for (let i = 0; i < c; i += 1) {
      const u = (i + 0.5) / c;
      const idx = Math.min(pts.length - 1, Math.floor(u * (pts.length - 1)));
      out.push(pts[idx]);
    }
    return out;
  }, [sampled, particleCount]);

  const activeTrailCount = useMemo(
    () => clamp(6 + Math.floor(particleCount), 8, MAX_TRAIL_LENGTH),
    [particleCount],
  );

  const toView = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * VIEW_W,
      y: ((clientY - rect.top) / rect.height) * VIEW_H,
    };
  }, []);

  const updatePointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!interactive) return;
      const p = toView(clientX, clientY);
      if (!p) return;
      const inPad = p.x >= 40 && p.x <= 1160 && p.y >= 40 && p.y <= 660;
      setHover((prev) => {
        if (p.x === prev.x && p.y === prev.y && prev.active && prev.insideCapture === inPad) {
          return prev;
        }
        return { x: p.x, y: p.y, active: true, insideCapture: inPad };
      });
      const nx = p.x / VIEW_W;
      const ny = p.y / VIEW_H;
      onPointerMove?.({ x: clamp(nx, 0, 1), y: clamp(ny, 0, 1) });
    },
    [interactive, onPointerMove, toView],
  );

  const pointerNorm = useMemo(
    () => ({ x: hover.x / VIEW_W, y: hover.y / VIEW_H }),
    [hover.x, hover.y],
  );

  const hoverFx = useMemo(() => {
    const dx = hover.x - CENTER_X;
    const dy = hover.y - CENTER_Y;
    const distance = Math.hypot(dx, dy);
    const nx = dx / 600;
    const ny = dy / 350;
    const parallaxMix = 0.28 + 0.72 * cursorInfluence;
    const centerStrBase = interactive && hover.active ? Math.max(0, 1 - distance / 250) : 0;
    const dCenter = Math.hypot(hover.x - CENTER_X, hover.y - CENTER_Y);
    const nearNode = interactive && hover.active && dCenter < 120;
    const nodeEnergy = nearNode ? 1 - dCenter / 120 : 0;
    const hoverGlow = interactive && hover.active ? 0.09 : 0;
    return {
      centerStrength: centerStrBase,
      mainParallaxX: hover.active && interactive ? nx * 3 * sm.parallax * parallaxMix : 0,
      mainParallaxY: hover.active && interactive ? ny * 2 * sm.parallax * parallaxMix : 0,
      upperParallaxX: hover.active && interactive ? nx * 2.2 * sm.parallax * parallaxMix : 0,
      upperParallaxY: hover.active && interactive ? ny * 1.4 * sm.parallax * parallaxMix : 0,
      lowerParallaxX: hover.active && interactive ? nx * 4 * sm.parallax * parallaxMix : 0,
      lowerParallaxY: hover.active && interactive ? ny * 2.8 * sm.parallax * parallaxMix : 0,
      centerGlowOpacity: (0.16 + centerStrBase * 0.28 + nodeEnergy * 0.14 * sm.center) + hoverGlow * 0.2,
      centerCoreOpacity: (0.1 + centerStrBase * 0.2 + nodeEnergy * 0.1 * sm.center),
      centerGlowScale: 1 + centerStrBase * 0.26 + nodeEnergy * 0.1 * sm.center,
      captureOpacity: hover.insideCapture ? 0.2 : 0,
      hoverHaloOpacity: hover.insideCapture ? 0.1 + centerStrBase * 0.16 : 0,
    };
  }, [hover, sm, cursorInfluence, interactive, glowIntensity]);

  const glowM = useMemo(
    () => sm.stroke * (interactive && hover.active ? 1.04 : 1),
    [sm, interactive, hover.active],
  );

  const movingGlowM = useMemo(
    () => glowIntensity * sm.glow * (interactive && hover.active ? 1.04 : 1),
    [glowIntensity, sm, interactive, hover.active],
  );

  useEffect(() => {
    const step = (ts: number) => {
      const last = lastTimeRef.current ?? ts;
      const dt = Math.min(0.032, (ts - last) / 1000);
      lastTimeRef.current = ts;
      const nowSec = ts / 1000;
      const hoverState = hoverRef.current;
      const orbs = orbsRef.current;
      const st = stRef.current;
      const sMul = st.speed * speedRef.current;

      const magnet =
        hoverState.insideCapture &&
        interactiveRef.current &&
        followCursorRef.current;

      for (let idx = 0; idx < orbs.length; idx += 1) {
        const orb = orbs[idx];
        const cfg = ORB_CONFIGS[idx];
        const hoverSlowdown = hoverState.insideCapture && magnet ? 0.12 : orb.mode === 'return' ? 0.45 : 1;
        orb.progress = (orb.progress + dt * cfg.baseSpeed * sMul * hoverSlowdown) % 1;
        orb.mode = hoverState.insideCapture && magnet ? 'hover' : orb.mode === 'hover' ? 'return' : orb.mode;
      }

      if (!hoverState.insideCapture || (hoverState.insideCapture && !magnet)) {
        for (let idx = 0; idx < orbs.length; idx += 1) {
          if (orbs[idx].mode !== 'path') continue;
          const points = idx === 0 ? sampled.mainPts : idx === 1 ? sampled.upperPts : sampled.lowerPts;
          const p = getPointAt(points, orbs[idx].progress, ORB_CONFIGS[idx].reverse);
          orbs[idx].x = p.x;
          orbs[idx].y = p.y;
          orbs[idx].vx = 0;
          orbs[idx].vy = 0;
        }
      }

      const lead = orbs[0];
      const leadCfg = ORB_CONFIGS[0];
      const leadPathPoint = getPointAt(sampled.mainPts, lead.progress, leadCfg.reverse);

      if (hoverState.insideCapture && magnet) {
        const inf = cursorInfluenceRef.current;
        const tPull = 0.5 + inf * 0.46;
        const targetX = lerp(leadPathPoint.x, hoverState.x, tPull);
        const targetY = lerp(leadPathPoint.y, hoverState.y - 8, tPull);
        let vx = (lead.vx + (targetX - lead.x) * 0.055) * 0.91;
        let vy = (lead.vy + (targetY - lead.y) * 0.055) * 0.91;
        vx = clamp(vx, -8, 8);
        vy = clamp(vy, -8, 8);
        lead.vx = vx;
        lead.vy = vy;
        lead.x += vx;
        lead.y += vy;
        lead.mode = 'hover';
      } else if (lead.mode === 'return') {
        const x = lerp(lead.x, leadPathPoint.x, 0.14);
        const y = lerp(lead.y, leadPathPoint.y, 0.14);
        const dist = Math.hypot(leadPathPoint.x - x, leadPathPoint.y - y);
        lead.x = x;
        lead.y = y;
        lead.vx = 0;
        lead.vy = 0;
        lead.progress = findNearestProgress(sampled.mainPts, x, y, leadCfg.reverse);
        lead.mode = dist < 1.2 ? 'path' : 'return';
      }

      for (let idx = 1; idx < orbs.length; idx += 1) {
        const orb = orbs[idx];
        const cfg = ORB_CONFIGS[idx];
        const points = idx === 1 ? sampled.upperPts : sampled.lowerPts;
        const pathPoint = getPointAt(points, orb.progress, cfg.reverse);

        if (hoverState.insideCapture && magnet) {
          const leader = orbs[0];
          const offset = FOLLOWER_OFFSETS[idx];
          const tx = lerp(pathPoint.x, leader.x + offset.x, 0.78);
          const ty = lerp(pathPoint.y, leader.y + offset.y, 0.78);
          let vx = (orb.vx + (tx - orb.x) * 0.048) * 0.92;
          let vy = (orb.vy + (ty - orb.y) * 0.048) * 0.92;
          vx = clamp(vx, -7.5, 7.5);
          vy = clamp(vy, -7.5, 7.5);
          orb.vx = vx;
          orb.vy = vy;
          orb.x += vx;
          orb.y += vy;
          orb.mode = 'hover';
        } else if (orb.mode === 'return') {
          const x = lerp(orb.x, pathPoint.x, 0.12);
          const y = lerp(orb.y, pathPoint.y, 0.12);
          const dist = Math.hypot(pathPoint.x - x, pathPoint.y - y);
          orb.x = x;
          orb.y = y;
          orb.vx = 0;
          orb.vy = 0;
          orb.progress = findNearestProgress(points, x, y, cfg.reverse);
          orb.mode = dist < 1.2 ? 'path' : 'return';
        }
      }

      for (let idx = 0; idx < orbs.length; idx += 1) {
        const orb = orbs[idx];
        const minTrailSpacing = idx === 0 ? 8.5 : 7.5;
        const builtTrail: Point[] = [{ x: orb.x, y: orb.y }];

        for (let i = 0; i < orb.trail.length; i += 1) {
          const candidate = orb.trail[i];
          const prevPoint = builtTrail[builtTrail.length - 1];
          const dist = Math.hypot(candidate.x - prevPoint.x, candidate.y - prevPoint.y);
          if (dist >= minTrailSpacing || builtTrail.length < 4) builtTrail.push(candidate);
          if (builtTrail.length >= activeTrailCount) break;
        }
        while (builtTrail.length < activeTrailCount) builtTrail.push(builtTrail[builtTrail.length - 1]);

        const relaxed: Point[] = [builtTrail[0]];
        for (let i = 1; i < builtTrail.length; i += 1) {
          const prevPoint = builtTrail[i - 1];
          const point = builtTrail[i];
          const follow = idx === 0 ? 0.14 : 0.11;
          const subtleDrift = hoverState.insideCapture ? 0 : Math.sin(nowSec * 1.8 + i + idx) * 0.08;
          relaxed.push({
            x: point.x + (prevPoint.x - point.x) * follow,
            y: point.y + (prevPoint.y - point.y) * follow + subtleDrift,
          });
        }
        orb.trail = relaxed;
      }

      const hoverStrength = (() => {
        const ddx = hoverState.x - CENTER_X;
        const ddy = hoverState.y - CENTER_Y;
        const distance = Math.hypot(ddx, ddy);
        return hoverState.active ? Math.max(0, 1 - distance / 240) : 0;
      })();

      for (let idx = 0; idx < orbs.length; idx += 1) {
        const orb = orbs[idx];
        const cfg = ORB_CONFIGS[idx];
        const refs = orbRefs.current[idx];
        const nearCenter = Math.max(0, 1 - Math.hypot(orb.x - CENTER_X, orb.y - CENTER_Y) / 140);
        const leadFactor = idx === 0 ? 1 : 0.82;
        const scaleBoost = cfg.scale * leadFactor * (1 + nearCenter * 0.22 + hoverStrength * 0.12);
        const glowBoost = 1 + nearCenter * 0.35 + hoverStrength * 0.16;

        if (refs.wide) {
          refs.wide.setAttribute('cx', orb.x.toFixed(2));
          refs.wide.setAttribute('cy', orb.y.toFixed(2));
          refs.wide.setAttribute('r', (18.6 * scaleBoost).toFixed(2));
          refs.wide.setAttribute('opacity', (0.1 * glowBoost).toFixed(3));
        }
        if (refs.soft) {
          refs.soft.setAttribute('cx', orb.x.toFixed(2));
          refs.soft.setAttribute('cy', orb.y.toFixed(2));
          refs.soft.setAttribute('r', (7.9 * scaleBoost).toFixed(2));
          refs.soft.setAttribute('opacity', (0.32 * glowBoost).toFixed(3));
        }
        if (refs.core) {
          refs.core.setAttribute('cx', orb.x.toFixed(2));
          refs.core.setAttribute('cy', orb.y.toFixed(2));
          refs.core.setAttribute('r', (3.6 * scaleBoost).toFixed(2));
        }

        for (let i = 0; i < refs.trailWide.length; i += 1) {
          const trailPoint = orb.trail[i + 1];
          if (!trailPoint) continue;
          const trailDen = Math.max(1, activeTrailCount - 1);
          const ttr = 1 - i / trailDen;
          if (i >= activeTrailCount - 1) {
            if (refs.trailWide[i]) refs.trailWide[i]!.setAttribute('opacity', '0');
            if (refs.trailCore[i]) refs.trailCore[i]!.setAttribute('opacity', '0');
            continue;
          }
          const tailIntensity = idx === 0 ? 1 : 0.72;
          const wideR = Math.max(1.2, (4.8 - i * 0.2) * scaleBoost * ttr);
          const coreR = Math.max(0.7, (2.0 - i * 0.06) * scaleBoost * ttr);
          const wideOpacity = Math.max(0.03, 0.22 * ttr * tailIntensity) * glowBoost * movingGlowM;
          const coreOpacity = Math.max(0.02, 0.1 * ttr * tailIntensity) * movingGlowM;

          const wideEl = refs.trailWide[i];
          if (wideEl) {
            wideEl.setAttribute('cx', trailPoint.x.toFixed(2));
            wideEl.setAttribute('cy', trailPoint.y.toFixed(2));
            wideEl.setAttribute('r', wideR.toFixed(2));
            wideEl.setAttribute('opacity', wideOpacity.toFixed(3));
          }
          const coreEl = refs.trailCore[i];
          if (coreEl) {
            coreEl.setAttribute('cx', trailPoint.x.toFixed(2));
            coreEl.setAttribute('cy', trailPoint.y.toFixed(2));
            coreEl.setAttribute('r', coreR.toFixed(2));
            coreEl.setAttribute('opacity', coreOpacity.toFixed(3));
          }
        }
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [sampled, activeTrailCount, movingGlowM]);

  const u = (id: string) => `url(#${gid(t, id)})`;
  const trailWideOp = t.mode === 'light' ? 0.16 : 0.12;
  const trailCoreOp = t.mode === 'light' ? 0.11 : 0.06;

  const addRipple = (nx: number, ny: number) => {
    const idn = (rippleId.current += 1);
    setRipples((r) => [...r, { id: idn, x: nx, y: ny }]);
    window.setTimeout(() => {
      setRipples((r) => r.filter((x) => x.id !== idn));
    }, 720);
  };

  const handleRootPointerEnter = () => {
    if (!interactive) return;
    onHoverStart?.();
  };

  const handleRootPointerLeave = () => {
    if (!interactive) return;
    setHover({ x: CENTER_X, y: CENTER_Y, active: false, insideCapture: false });
    onHoverEnd?.();
  };

  const handleSvgPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!interactive) return;
    updatePointer(e.clientX, e.clientY);
  };

  const handleSvgClick = (e: MouseEvent<SVGSVGElement>) => {
    if (!interactive) return;
    const p = toView(e.clientX, e.clientY);
    if (p) {
      addRipple(p.x / VIEW_W, p.y / VIEW_H);
    }
    onClick?.();
  };

  return (
    <div
      className={['infinity-graphic-root', className].filter(Boolean).join(' ')}
      data-state={state}
      style={
        {
          position: 'relative',
          display: 'block',
          width: '100%',
          ...style,
          ['--ig-px' as string]: String(pointerNorm.x),
          ['--ig-py' as string]: String(pointerNorm.y),
        } as CSSProperties
      }
      onPointerEnter={handleRootPointerEnter}
      onPointerLeave={handleRootPointerLeave}
    >
      {interactive ? (
        <div className="infinity-graphic-aura" aria-hidden data-theme={t.mode} />
      ) : null}
      {ripples.map((r) => (
        <span
          key={r.id}
          className="infinity-graphic-ripple"
          style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%` }}
          aria-hidden
        />
      ))}
      <svg
        ref={svgRef}
        data-theme={t.mode}
        viewBox="0 0 1200 700"
        xmlns="http://www.w3.org/2000/svg"
        className={svgStyle.className}
        style={{ ...svgStyle.style, pointerEvents: interactive ? 'auto' : 'none' }}
        role="img"
        aria-label={ariaLabel}
        onPointerMove={handleSvgPointerMove}
        onClick={handleSvgClick}
      >
        <defs>
          <linearGradient id={gid(t, 'bg')} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={t.background.top} />
            <stop offset="45%" stopColor={t.background.mid} />
            <stop offset="100%" stopColor={t.background.bottom} />
          </linearGradient>
          <radialGradient id={gid(t, 'bgHazeLeft')} cx="22%" cy="42%" r="42%">
            <stop offset="0%" stopColor={t.hazeLeft.from} stopOpacity={t.hazeLeft.fromOp} />
            <stop offset="52%" stopColor={t.hazeLeft.via} stopOpacity={t.hazeLeft.viaOp} />
            <stop offset="100%" stopColor={t.hazeLeft.to} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={gid(t, 'bgHazeRight')} cx="78%" cy="58%" r="42%">
            <stop offset="0%" stopColor={t.hazeRight.from} stopOpacity={t.hazeRight.fromOp} />
            <stop offset="50%" stopColor={t.hazeRight.via} stopOpacity={t.hazeRight.viaOp} />
            <stop offset="100%" stopColor={t.hazeRight.to} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={gid(t, 'vignette')} cx="50%" cy="50%" r="62%">
            <stop offset="60%" stopColor={t.vignette.inner} stopOpacity={t.vignette.innerOp} />
            <stop offset="100%" stopColor={t.vignette.edge} stopOpacity={t.vignette.edgeOp} />
          </radialGradient>
          <linearGradient id={gid(t, 'grad1')} x1="0%" y1="50%" x2="100%" y2="50%">
            {t.pathGrad1.map(([off, c]) => (
              <stop key={off} offset={`${off}%`} stopColor={c} />
            ))}
          </linearGradient>
          <linearGradient id={gid(t, 'grad2')} x1="0%" y1="50%" x2="100%" y2="50%">
            {t.pathGrad2.map(([off, c]) => (
              <stop key={off} offset={`${off}%`} stopColor={c} />
            ))}
          </linearGradient>
          <linearGradient id={gid(t, 'grad3')} x1="0%" y1="50%" x2="100%" y2="50%">
            {t.pathGrad3.map(([off, c]) => (
              <stop key={off} offset={`${off}%`} stopColor={c} />
            ))}
          </linearGradient>
          <filter id={gid(t, 'glowSoft')} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation={t.blur.soft} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={gid(t, 'glowWide')} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation={t.blur.wide} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={gid(t, 'glowCenter')} x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation={t.blur.center} result="centerBlur" />
            <feColorMatrix
              in="centerBlur"
              type="matrix"
              values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.5 0"
              result="centerGlow"
            />
            <feMerge>
              <feMergeNode in="centerGlow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={gid(t, 'mouseAura')} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation={t.blur.mouse} />
          </filter>
          <linearGradient id={gid(t, 'shimmer')} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={t.shimmer.color} stopOpacity="0" />
            <stop offset="42%" stopColor={t.shimmer.color} stopOpacity="0" />
            <stop offset="50%" stopColor={t.shimmer.color} stopOpacity={t.shimmer.peakOpacity} />
            <stop offset="58%" stopColor={t.shimmer.color} stopOpacity="0" />
            <stop offset="100%" stopColor={t.shimmer.color} stopOpacity="0" />
          </linearGradient>
          <radialGradient id={gid(t, 'coreGlow')} cx="50%" cy="50%" r="50%">
            {t.coreRadial.stops.map((s) => (
              <stop key={s.off} offset={s.off} stopColor={s.c} stopOpacity={s.o} />
            ))}
          </radialGradient>
        </defs>

        <g style={{ pointerEvents: 'none' }}>
          <rect width="1200" height="700" fill={u('bg')} rx="36" />
          <rect width="1200" height="700" fill={u('bgHazeLeft')} rx="36" />
          <rect width="1200" height="700" fill={u('bgHazeRight')} rx="36" />
          <rect x="24" y="24" width="1152" height="652" rx="30" fill="none" stroke={t.frame.outer} />
          <rect x="24" y="24" width="1152" height="652" rx="30" fill="none" stroke={t.frame.inner} transform="translate(0 1)" />

          {showPaths ? (
            <g className="breathe">
              <ellipse
                cx="600"
                cy="350"
                rx={300 * hoverFx.centerGlowScale}
                ry={112 * (1 + Math.min(0.18, (hoverFx.centerStrength + (interactive ? 0.08 : 0)) * 0.16))}
                fill={u('coreGlow')}
                opacity={
                  t.mode === 'light'
                    ? 0.48 + Math.min(0.22, (hoverFx.centerStrength + 0.06) * 0.2)
                    : 0.9 + Math.min(0.2, (hoverFx.centerStrength + 0.06) * 0.18)
                }
                filter={u('glowCenter')}
              />
            </g>
          ) : null}

          {hover.insideCapture ? (
            <g pointerEvents="none">
              <circle
                cx={hover.x}
                cy={hover.y}
                r="38"
                fill={t.hoverHalo.large}
                opacity={hoverFx.hoverHaloOpacity}
                filter={u('mouseAura')}
              />
              <circle
                cx={hover.x}
                cy={hover.y}
                r="10"
                fill={t.hoverHalo.small}
                opacity={t.hoverHalo.smallOp}
                filter={u('mouseAura')}
              />
            </g>
          ) : null}

          <rect
            x="40"
            y="40"
            width="1120"
            height="620"
            rx="28"
            fill="none"
            stroke={t.frame.capture}
            opacity={hoverFx.captureOpacity}
            pointerEvents="none"
          />

          {showPaths ? (
            <g className="crossPulse">
              <ellipse
                cx="600"
                cy="350"
                rx={58 * hoverFx.centerGlowScale}
                ry={20 * (1 + Math.min(0.14, hoverFx.centerStrength * 0.14))}
                fill={t.centerCross.outerFill}
                opacity={hoverFx.centerGlowOpacity}
                filter={u('glowCenter')}
              />
              <ellipse
                cx="600"
                cy="350"
                rx={30 * hoverFx.centerGlowScale}
                ry={10 * (1 + Math.min(0.1, hoverFx.centerStrength * 0.1))}
                fill={t.centerCross.innerFill}
                opacity={hoverFx.centerCoreOpacity}
              />
            </g>
          ) : null}

          {showPaths ? (
            <>
              <g transform={`translate(${hoverFx.mainParallaxX} ${hoverFx.mainParallaxY})`}>
                <path
                  d={sampled.main}
                  fill="none"
                  className="path-glow"
                  stroke={u('grad1')}
                  strokeWidth="9"
                  opacity={t.stroke.mainGlow * glowM}
                  filter={u('glowWide')}
                />
                <path
                  d={sampled.main}
                  fill="none"
                  className="path-core"
                  stroke={u('grad1')}
                  strokeWidth="2.6"
                  opacity={t.stroke.mainCore * glowM}
                  filter={u('glowSoft')}
                />
                {!hover.insideCapture ? (
                  <path
                    d={sampled.main}
                    fill="none"
                    className="path-shimmer shimmerSweep"
                    stroke={u('shimmer')}
                    strokeWidth="1.6"
                    opacity="0"
                    filter={u('glowSoft')}
                    strokeDasharray="160 1200"
                  />
                ) : null}
              </g>
              <g transform={`translate(${hoverFx.upperParallaxX} ${hoverFx.upperParallaxY})`}>
                <path
                  d={sampled.upper}
                  fill="none"
                  className="path-glow"
                  stroke={u('grad2')}
                  strokeWidth="5.2"
                  opacity={t.stroke.secondaryGlow * glowM}
                  filter={u('glowWide')}
                />
                <path
                  d={sampled.upper}
                  fill="none"
                  className="path-core"
                  stroke={u('grad2')}
                  strokeWidth="1.9"
                  opacity={t.stroke.secondaryCore * glowM}
                  filter={u('glowSoft')}
                />
              </g>
              <g transform={`translate(${hoverFx.lowerParallaxX} ${hoverFx.lowerParallaxY})`}>
                <path
                  d={sampled.lower}
                  fill="none"
                  className="path-glow"
                  stroke={u('grad3')}
                  strokeWidth="5.2"
                  opacity={t.stroke.secondaryGlow * glowM}
                  filter={u('glowWide')}
                />
                <path
                  d={sampled.lower}
                  fill="none"
                  className="path-core"
                  stroke={u('grad3')}
                  strokeWidth="1.9"
                  opacity={t.stroke.secondaryCore * glowM}
                  filter={u('glowSoft')}
                />
              </g>
            </>
          ) : null}

          {sparkles.map((p, i) => (
            <circle
              key={i}
              className="ig-particle"
              cx={p.x}
              cy={p.y}
              r="1.4"
              fill={t.shimmer.color}
              opacity="0.2"
              style={{ ['--ig-i' as string]: i }}
            />
          ))}

          {ORB_CONFIGS.map((cfg, idx) => {
            const orb = orbsRef.current[idx];
            const hue = t.orbs.main[idx];
            const trailFill = t.orbs.trail[idx];
            return (
              <g key={idx}>
                {Array.from({ length: MAX_TRAIL_LENGTH - 1 }).map((_, i) => (
                  <g key={i}>
                    <circle
                      ref={(el) => {
                        orbRefs.current[idx].trailWide[i] = el;
                      }}
                      cx={orb.trail[i + 1]?.x ?? orb.x}
                      cy={orb.trail[i + 1]?.y ?? orb.y}
                      r={3}
                      fill={trailFill}
                      opacity={trailWideOp * movingGlowM}
                    />
                    <circle
                      ref={(el) => {
                        orbRefs.current[idx].trailCore[i] = el;
                      }}
                      cx={orb.trail[i + 1]?.x ?? orb.x}
                      cy={orb.trail[i + 1]?.y ?? orb.y}
                      r={1.2}
                      fill={t.orbs.trailCore}
                      opacity={trailCoreOp * movingGlowM}
                    />
                  </g>
                ))}
                <circle
                  ref={(el) => {
                    orbRefs.current[idx].wide = el;
                  }}
                  cx={orb.x}
                  cy={orb.y}
                  r={18.6 * cfg.scale}
                  fill={hue}
                  opacity={0.1 * movingGlowM}
                  filter={u('glowWide')}
                />
                <circle
                  ref={(el) => {
                    orbRefs.current[idx].soft = el;
                  }}
                  cx={orb.x}
                  cy={orb.y}
                  r={7.9 * cfg.scale}
                  fill={hue}
                  opacity={0.32 * movingGlowM}
                  filter={u('glowSoft')}
                />
                <circle
                  ref={(el) => {
                    orbRefs.current[idx].core = el;
                  }}
                  cx={orb.x}
                  cy={orb.y}
                  r={3.6 * cfg.scale}
                  fill={t.orbs.core}
                  opacity={Math.min(1, 0.9 + 0.08 * movingGlowM)}
                />
              </g>
            );
          })}

          <rect width="1200" height="700" fill={u('vignette')} rx="36" pointerEvents="none" />
        </g>
      </svg>
    </div>
  );
}
