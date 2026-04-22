import type { InfinityGraphicState } from './InfinityGraphic.types';

/** Subtle, preset multipliers — keep values close to 1 to stay premium, not “gamey”. */
export function getStateBehavior(state: InfinityGraphicState) {
  switch (state) {
    case 'charged':
      return { speed: 1.08, glow: 1.1, stroke: 1.05, parallax: 1.1, center: 1.15 };
    case 'cosmic':
      return { speed: 0.94, glow: 1.18, stroke: 1.03, parallax: 1.18, center: 1.22 };
    case 'focused':
      return { speed: 1, glow: 0.96, stroke: 1.04, parallax: 0.9, center: 1.1 };
    default:
      return { speed: 1, glow: 1, stroke: 1, parallax: 1, center: 1 };
  }
}
