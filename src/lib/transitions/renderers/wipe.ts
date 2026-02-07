/**
 * Wipe Transition Renderers
 *
 * Includes: wipe
 */

import type { TransitionRegistry, TransitionRenderer } from '../registry';
import type { TransitionStyleCalculation } from '../engine';
import type { TransitionDefinition, WipeDirection } from '@/types/transition';

const ALL_DIRECTIONS: WipeDirection[] = ['from-left', 'from-right', 'from-top', 'from-bottom'];
const ALL_TIMINGS = ['linear', 'spring', 'ease-in', 'ease-out', 'ease-in-out', 'cubic-bezier'] as const;

// ============================================================================
// Wipe
// ============================================================================

function calculateWipeClipPath(progress: number, direction: WipeDirection, isOutgoing: boolean): string {
  const p = isOutgoing ? progress : 1 - progress;
  switch (direction) {
    case 'from-left':
      return isOutgoing
        ? `inset(0 0 0 ${p * 100}%)`
        : `inset(0 ${p * 100}% 0 0)`;
    case 'from-right':
      return isOutgoing
        ? `inset(0 ${p * 100}% 0 0)`
        : `inset(0 0 0 ${p * 100}%)`;
    case 'from-top':
      return isOutgoing
        ? `inset(${p * 100}% 0 0 0)`
        : `inset(0 0 ${p * 100}% 0)`;
    case 'from-bottom':
      return isOutgoing
        ? `inset(0 0 ${p * 100}% 0)`
        : `inset(${p * 100}% 0 0 0)`;
    default:
      return 'none';
  }
}

const wipeRenderer: TransitionRenderer = {
  calculateStyles(progress, isOutgoing, _cw, _ch, direction): TransitionStyleCalculation {
    const p = Math.max(0, Math.min(1, progress));
    if (isOutgoing) {
      const clipPath = calculateWipeClipPath(p, (direction as WipeDirection) || 'from-left', true);
      return { clipPath, webkitClipPath: clipPath };
    }
    return {};
  },
  renderCanvas(ctx, leftCanvas, rightCanvas, progress, direction, canvas) {
    const p = Math.max(0, Math.min(1, progress));
    const dir = (direction as WipeDirection) || 'from-left';
    const w = canvas?.width ?? leftCanvas.width;
    const h = canvas?.height ?? leftCanvas.height;

    ctx.drawImage(rightCanvas, 0, 0);
    ctx.save();
    const ep = p; // effective progress for outgoing
    const path = new Path2D();
    switch (dir) {
      case 'from-left':
        path.rect(ep * w, 0, w, h); break;
      case 'from-right':
        path.rect(0, 0, (1 - ep) * w, h); break;
      case 'from-top':
        path.rect(0, ep * h, w, h); break;
      case 'from-bottom':
        path.rect(0, 0, w, (1 - ep) * h); break;
    }
    ctx.clip(path);
    ctx.drawImage(leftCanvas, 0, 0);
    ctx.restore();
  },
};

const wipeDef: TransitionDefinition = {
  id: 'wipe',
  label: 'Wipe',
  description: 'Wipe reveal from one direction',
  category: 'wipe',
  icon: 'ArrowRight',
  hasDirection: true,
  directions: ALL_DIRECTIONS,
  supportedTimings: [...ALL_TIMINGS],
  defaultDuration: 30,
  minDuration: 5,
  maxDuration: 90,
};

// ============================================================================
// Registration
// ============================================================================

export function registerWipeTransitions(registry: TransitionRegistry): void {
  registry.register('wipe', wipeDef, wipeRenderer);
}
