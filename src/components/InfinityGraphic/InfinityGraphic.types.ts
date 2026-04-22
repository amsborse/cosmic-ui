import type { CSSProperties } from 'react';

export type InfinityGraphicMode = 'dark' | 'light';
/** @deprecated Use `InfinityGraphicMode` */
export type InfinityColorScheme = InfinityGraphicMode;

export type InfinityGraphicState = 'calm' | 'charged' | 'cosmic' | 'focused';

export type InfinityGraphicProps = {
  /** Dark / light canvas and stroke palettes. @default 'dark' */
  mode?: InfinityGraphicMode;
  /**
   * @deprecated Use `mode` instead. If set, falls back for compatibility.
   */
  colorScheme?: InfinityGraphicMode;
  /** Preset that nudges glow, speed, and motion feel. @default 'calm' */
  state?: InfinityGraphicState;
  /** Toggle wire paths and center node visibility. @default true */
  showPaths?: boolean;
  /** Master switch for pointer-driven behavior and callbacks. @default true */
  interactive?: boolean;
  /** When false, the lead orb stays on the path (no magnetic pull). @default true */
  followCursor?: boolean;
  /** How strongly the lead orb eases toward the pointer, 0–1. @default 0.18 */
  cursorInfluence?: number;
  /** Scales brightness of moving particles/orbs (not center node). @default 1 */
  glowIntensity?: number;
  /** Controls particle density and trailing tail length. @default 8 */
  particleCount?: number;
  /** Multiplier for path animation speed. @default 1 */
  speed?: number;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
  onClick?: () => void;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
  onPointerMove?: (position: { x: number; y: number }) => void;
};
