import React from 'react';

export interface DebugOverlayProps {
  /** Unique identifier for the item */
  id?: string;
  /** Playback speed multiplier */
  speed: number;
  /** Original trimBefore value (frames) */
  trimBefore: number;
  /** Clamped/safe trimBefore value (frames) */
  safeTrimBefore: number;
  /** Source start position (frames) */
  sourceStart?: number;
  /** Total source duration (frames) */
  sourceDuration: number;
  /** Timeline duration (frames) */
  durationInFrames: number;
  /** Source frames needed for playback */
  sourceFramesNeeded: number;
  /** Source end position needed (frames) */
  sourceEndPosition: number;
  /** Whether seek position is invalid */
  isInvalidSeek: boolean;
  /** Whether playback would exceed source */
  exceedsSource: boolean;
  /** Frames per second for time calculations */
  fps?: number;
  /** Position of overlay */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * Debug overlay component for Remotion video items
 *
 * Shows detailed information about video timing, trimming, and playback.
 * Useful for diagnosing issues with sped-up clips, trimming, and exports.
 *
 * Usage:
 * ```tsx
 * <DebugOverlay
 *   id={item.id}
 *   speed={playbackRate}
 *   trimBefore={trimBefore}
 *   safeTrimBefore={safeTrimBefore}
 *   sourceDuration={sourceDuration}
 *   durationInFrames={item.durationInFrames}
 *   sourceFramesNeeded={sourceFramesNeeded}
 *   sourceEndPosition={sourceEndPosition}
 *   isInvalidSeek={isInvalidSeek}
 *   exceedsSource={exceedsSource}
 * />
 * ```
 */
export const DebugOverlay: React.FC<DebugOverlayProps> = ({
  id,
  speed,
  trimBefore,
  safeTrimBefore,
  sourceStart,
  sourceDuration,
  durationInFrames,
  sourceFramesNeeded,
  sourceEndPosition,
  isInvalidSeek,
  exceedsSource,
  fps = 30,
  position = 'top-left',
}) => {
  const positionStyles: React.CSSProperties = {
    'top-left': { top: 10, left: 10 },
    'top-right': { top: 10, right: 10 },
    'bottom-left': { bottom: 10, left: 10 },
    'bottom-right': { bottom: 10, right: 10 },
  }[position];

  return (
    <div
      style={{
        position: 'absolute',
        ...positionStyles,
        background: 'rgba(0,0,0,0.8)',
        color: '#fff',
        padding: '8px 12px',
        fontSize: 11,
        fontFamily: 'monospace',
        borderRadius: 4,
        maxWidth: '50%',
        zIndex: 1000,
      }}
    >
      <div style={{ color: '#0f0', marginBottom: 4 }}>
        DEBUG: {id?.slice(0, 8) ?? 'unknown'}
      </div>
      <div>speed: {speed.toFixed(3)}</div>
      <div>
        trimBefore: {trimBefore}
        {trimBefore !== safeTrimBefore && ` → safe: ${safeTrimBefore}`}
      </div>
      <div>sourceStart: {sourceStart ?? 'undefined'}</div>
      <div>sourceDuration: {sourceDuration || 'NOT SET'}</div>
      <div>durationInFrames: {durationInFrames}</div>
      <div>sourceFramesNeeded: {sourceFramesNeeded}</div>
      <div
        style={{
          marginTop: 4,
          borderTop: '1px solid #444',
          paddingTop: 4,
        }}
      >
        <div>seekTime: {(trimBefore / fps).toFixed(2)}s</div>
        <div>
          srcDuration: {sourceDuration ? (sourceDuration / fps).toFixed(2) + 's' : 'N/A'}
        </div>
        <div>srcEndNeeded: {(sourceEndPosition / fps).toFixed(2)}s</div>
      </div>
      {(isInvalidSeek || exceedsSource) && (
        <div style={{ marginTop: 4, color: '#f00', fontWeight: 'bold' }}>
          {isInvalidSeek && <div>⚠️ INVALID SEEK</div>}
          {exceedsSource && <div>⚠️ EXCEEDS SOURCE</div>}
        </div>
      )}
    </div>
  );
};
