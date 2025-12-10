import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, Sequence, OffthreadVideo, Img, interpolate } from 'remotion';
import type { VideoItem, ImageItem } from '@/types/timeline';
import type { Transition, WipeDirection, SlideDirection, FlipDirection } from '@/types/transition';

/**
 * Enriched visual item with track metadata (same as main-composition)
 */
type EnrichedVisualItem = (VideoItem | ImageItem) & {
  zIndex: number;
  muted: boolean;
  trackOrder: number;
  trackVisible: boolean;
};

interface EffectsBasedTransitionProps {
  /** Transition configuration */
  transition: Transition;
  /** Left clip (outgoing) */
  leftClip: EnrichedVisualItem;
  /** Right clip (incoming) */
  rightClip: EnrichedVisualItem;
}

/**
 * Calculate opacity for fade presentation using equal-power crossfade
 */
function getFadeOpacity(progress: number, isOutgoing: boolean): number {
  if (isOutgoing) {
    return Math.cos(progress * Math.PI / 2);
  } else {
    return Math.sin(progress * Math.PI / 2);
  }
}

/**
 * Calculate clip-path for wipe presentation
 */
function getWipeClipPath(progress: number, direction: WipeDirection, isOutgoing: boolean): string {
  const effectiveProgress = isOutgoing ? progress : 1 - progress;

  switch (direction) {
    case 'from-left':
      return isOutgoing
        ? `inset(0 ${effectiveProgress * 100}% 0 0)`
        : `inset(0 0 0 ${effectiveProgress * 100}%)`;
    case 'from-right':
      return isOutgoing
        ? `inset(0 0 0 ${effectiveProgress * 100}%)`
        : `inset(0 ${effectiveProgress * 100}% 0 0)`;
    case 'from-top':
      return isOutgoing
        ? `inset(0 0 ${effectiveProgress * 100}% 0)`
        : `inset(${effectiveProgress * 100}% 0 0 0)`;
    case 'from-bottom':
      return isOutgoing
        ? `inset(${effectiveProgress * 100}% 0 0 0)`
        : `inset(0 0 ${effectiveProgress * 100}% 0)`;
    default:
      return 'none';
  }
}

/**
 * Calculate transform for slide presentation
 */
function getSlideTransform(progress: number, direction: SlideDirection, isOutgoing: boolean): string {
  const slideProgress = isOutgoing ? progress : progress - 1;

  switch (direction) {
    case 'from-left':
      return `translateX(${slideProgress * 100}%)`;
    case 'from-right':
      return `translateX(${-slideProgress * 100}%)`;
    case 'from-top':
      return `translateY(${slideProgress * 100}%)`;
    case 'from-bottom':
      return `translateY(${-slideProgress * 100}%)`;
    default:
      return 'none';
  }
}

/**
 * Calculate transform for flip presentation
 */
function getFlipTransform(progress: number, direction: FlipDirection, isOutgoing: boolean): string {
  const flipDegrees = isOutgoing
    ? interpolate(progress, [0, 1], [0, 90])
    : interpolate(progress, [0, 1], [-90, 0]);

  const axis = (direction === 'from-left' || direction === 'from-right') ? 'Y' : 'X';
  const sign = (direction === 'from-right' || direction === 'from-bottom') ? -1 : 1;

  return `perspective(1000px) rotate${axis}(${sign * flipDegrees}deg)`;
}

/**
 * Calculate conic-gradient mask for clock wipe presentation
 * Creates a sweeping reveal like a clock hand moving clockwise from 12 o'clock
 */
function getClockWipeMask(progress: number, isOutgoing: boolean): string {
  // Clock wipe sweeps clockwise from 12 o'clock (top)
  // For outgoing: transparent area expands clockwise, hiding the clip
  const degrees = progress * 360;

  // In CSS conic-gradient:
  // - from 0deg = 12 o'clock (top)
  // - gradient goes clockwise by default
  // Transparent part expands clockwise from 12 o'clock
  // At progress=0: all black (fully visible)
  // At progress=1: all transparent (fully hidden)
  return `conic-gradient(from 0deg, transparent ${degrees}deg, black ${degrees}deg)`;
}

/**
 * Calculate radial-gradient mask for iris presentation
 * Creates a circular hole expanding from center, revealing the clip underneath
 */
function getIrisMask(progress: number, isOutgoing: boolean): string {
  // Iris: hole expands from center outward
  // For radial-gradient with 'circle', percentage is relative to the smaller dimension
  // To cover corners of a 16:9 frame, we need ~118% (sqrt(1 + (16/9)^2) / 2 ≈ 1.18)
  // Use 120% to ensure full coverage on any aspect ratio
  const maxRadius = 120;

  // For outgoing clip: hole (transparent) expands from center
  // At progress=0: no hole (fully visible)
  // At progress=1: full hole (fully hidden, corners included)
  const radius = progress * maxRadius;

  // Transparent in center (hole), black at edges (visible)
  return `radial-gradient(circle, transparent ${radius}%, black ${radius}%)`;
}

/**
 * Render a clip's video/image content using Remotion's proper playback
 * This component plays video continuously rather than seeking per frame
 */
const ClipContent: React.FC<{
  clip: EnrichedVisualItem;
}> = ({ clip }) => {
  if (clip.type === 'video') {
    const videoClip = clip as VideoItem;
    const sourceStart = videoClip.sourceStart ?? videoClip.trimStart ?? videoClip.offset ?? 0;
    const playbackRate = videoClip.speed ?? 1;

    return (
      <OffthreadVideo
        src={videoClip.src}
        startFrom={sourceStart}
        playbackRate={playbackRate}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        // Ensure no audio from effects layer - audio is handled separately
        muted={true}
        volume={0}
      />
    );
  } else if (clip.type === 'image') {
    const imageClip = clip as ImageItem;
    return (
      <Img
        src={imageClip.src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    );
  }
  return null;
};

/**
 * Transition overlay that applies visual effects
 * This component uses useCurrentFrame but only for styling, not for video seeking
 *
 * Performance optimizations:
 * - Uses GPU-accelerated properties (opacity, transform)
 * - Uses will-change hint for better compositing
 * - Avoids layout-triggering properties where possible
 */
const TransitionOverlay: React.FC<{
  transition: Transition;
  isOutgoing: boolean;
  children: React.ReactNode;
  zIndex: number;
}> = ({ transition, isOutgoing, children, zIndex }) => {
  const frame = useCurrentFrame();
  // frame is already local to the parent Sequence (0 to durationInFrames - 1)
  // To get full 0-1 range, divide by (duration - 1) so last frame = 1.0
  const maxFrame = Math.max(1, transition.durationInFrames - 1);
  const progress = Math.max(0, Math.min(1, frame / maxFrame));

  const presentation = transition.presentation;
  const direction = transition.direction;

  // Calculate styles based on presentation type
  // Prioritize GPU-accelerated properties: opacity, transform
  //
  // For reveal-style transitions (wipe, clockWipe, iris):
  // - Only the OUTGOING clip gets the mask effect
  // - The INCOMING clip sits underneath at full opacity, getting revealed
  //
  // For blend-style transitions (fade, slide, flip):
  // - Both clips get animated (opacity or transform)
  const getStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex,
      // GPU acceleration hints
      willChange: 'opacity, transform',
      transform: 'translateZ(0)',
      backfaceVisibility: 'hidden',
    };

    switch (presentation) {
      case 'fade':
        // Both clips fade (crossfade)
        return {
          ...baseStyle,
          opacity: getFadeOpacity(progress, isOutgoing),
        };

      case 'wipe':
        // Reveal-style: only outgoing gets clipped, incoming is full opacity underneath
        if (isOutgoing) {
          return {
            ...baseStyle,
            clipPath: getWipeClipPath(progress, direction as WipeDirection || 'from-left', true),
            WebkitClipPath: getWipeClipPath(progress, direction as WipeDirection || 'from-left', true),
          };
        }
        // Incoming clip: full opacity, sits below outgoing
        return baseStyle;

      case 'slide':
        // Both clips slide
        return {
          ...baseStyle,
          transform: `translateZ(0) ${getSlideTransform(progress, direction as SlideDirection || 'from-left', isOutgoing)}`,
        };

      case 'flip':
        // Both clips flip
        return {
          ...baseStyle,
          transform: getFlipTransform(progress, direction as FlipDirection || 'from-left', isOutgoing),
        };

      case 'none':
        // Hard cut at midpoint
        return {
          ...baseStyle,
          opacity: isOutgoing ? (progress < 0.5 ? 1 : 0) : (progress >= 0.5 ? 1 : 0),
        };

      case 'clockWipe':
        // Reveal-style: only outgoing gets masked
        if (isOutgoing) {
          return {
            ...baseStyle,
            maskImage: getClockWipeMask(progress, true),
            WebkitMaskImage: getClockWipeMask(progress, true),
            maskSize: '100% 100%',
            WebkitMaskSize: '100% 100%',
            maskPosition: 'center',
            WebkitMaskPosition: 'center',
          };
        }
        // Incoming clip: full opacity, sits below outgoing
        return baseStyle;

      case 'iris':
        // Reveal-style: only outgoing gets masked
        if (isOutgoing) {
          return {
            ...baseStyle,
            maskImage: getIrisMask(progress, true),
            WebkitMaskImage: getIrisMask(progress, true),
            maskSize: '100% 100%',
            WebkitMaskSize: '100% 100%',
            maskPosition: 'center',
            WebkitMaskPosition: 'center',
          };
        }
        // Incoming clip: full opacity, sits below outgoing
        return baseStyle;

      default:
        return {
          ...baseStyle,
          opacity: getFadeOpacity(progress, isOutgoing),
        };
    }
  };

  return <div style={getStyle()}>{children}</div>;
};

/**
 * Effects-Based Transition Renderer
 *
 * Renders a visual transition effect WITHOUT repositioning clips or changing timeline duration.
 * Uses Remotion's Sequence for proper video playback timing instead of manual frame seeking.
 *
 * Transition is centered on the cut point:
 * - First half plays during the end of the left clip's timeline region
 * - Second half plays during the start of the right clip's timeline region
 *
 * Performance optimization:
 * - Videos play continuously within their Sequences (no per-frame seeking)
 * - Only CSS styles update per frame (opacity, clip-path, transforms)
 * - Clips are premounted slightly before transition for smoother playback
 */
export const EffectsBasedTransitionRenderer = React.memo<EffectsBasedTransitionProps>(function EffectsBasedTransitionRenderer({
  transition,
  leftClip,
  rightClip,
}) {
  // Calculate transition timing - transition is centered on cut point (half in, half out)
  const cutPoint = leftClip.from + leftClip.durationInFrames;
  const halfDuration = Math.floor(transition.durationInFrames / 2);
  const transitionStart = cutPoint - halfDuration;

  // Premount buffer for smoother video loading (about 1 second at 30fps)
  const premountFrames = 30;

  // Use higher z-index to ensure effects layer covers normal clips during transition
  const effectsZIndex = Math.max(leftClip.zIndex, rightClip.zIndex) + 2000;

  // Calculate left clip's content offset to show its ending frames during transition
  // We want to show the last `durationInFrames` frames of the left clip
  const leftClipContentOffset = -(leftClip.durationInFrames - transition.durationInFrames);

  // Adjust right clip's sourceStart to align with normal rendering after transition ends
  // Without this offset, transition shows frames 0 to (durationInFrames-1), then normal
  // rendering jumps back to frame halfDuration, causing visible frame repetition.
  // With the offset, transition shows frames that lead into where normal rendering continues.
  const adjustedRightClip = useMemo(() => {
    if (rightClip.type === 'video') {
      const videoClip = rightClip as VideoItem & typeof rightClip;
      const sourceStart = videoClip.sourceStart ?? videoClip.trimStart ?? videoClip.offset ?? 0;
      // Offset by -halfDuration so last transition frame leads into first normal frame
      const adjustedSourceStart = Math.max(0, sourceStart - halfDuration);
      return {
        ...videoClip,
        sourceStart: adjustedSourceStart,
        // Also adjust trimStart/offset if they exist to maintain consistency
        ...(videoClip.trimStart != null ? { trimStart: Math.max(0, videoClip.trimStart - halfDuration) } : {}),
        ...(videoClip.offset != null ? { offset: Math.max(0, videoClip.offset - halfDuration) } : {}),
      };
    }
    // Images don't need frame offset adjustment
    return rightClip;
  }, [rightClip, halfDuration]);

  return (
    <Sequence
      from={transitionStart}
      durationInFrames={transition.durationInFrames}
      premountFor={premountFrames}
    >
      <AbsoluteFill
        style={{
          zIndex: effectsZIndex,
          visibility: leftClip.trackVisible && rightClip.trackVisible ? 'visible' : 'hidden',
        }}
      >
        {/* Opaque background to cover underlying normal clip renders */}
        {/* This ensures the transition effect is the only thing visible during transition */}
        <AbsoluteFill style={{ backgroundColor: '#000' }} />

        {/* Incoming clip (right) - sits at bottom, gets revealed */}
        {/* Uses adjusted sourceStart so frames align with normal rendering after transition */}
        <TransitionOverlay
          transition={transition}
          isOutgoing={false}
          zIndex={1}
        >
          <Sequence
            from={0}
            durationInFrames={transition.durationInFrames}
          >
            <ClipContent clip={adjustedRightClip} />
          </Sequence>
        </TransitionOverlay>

        {/* Outgoing clip (left) - sits on top, gets wiped/faded away */}
        {/* Renders for full transition duration, offset to show left clip's end portion */}
        <TransitionOverlay
          transition={transition}
          isOutgoing={true}
          zIndex={2}
        >
          <Sequence
            from={leftClipContentOffset}
            durationInFrames={transition.durationInFrames + Math.abs(leftClipContentOffset)}
          >
            <ClipContent clip={leftClip} />
          </Sequence>
        </TransitionOverlay>
      </AbsoluteFill>
    </Sequence>
  );
});

/**
 * Container for all transitions
 * Renders each transition as a visual effect independently
 */
export const EffectsBasedTransitionsLayer = React.memo<{
  transitions: Transition[];
  itemsById: Map<string, EnrichedVisualItem>;
}>(function EffectsBasedTransitionsLayer({ transitions, itemsById }) {
  if (transitions.length === 0) return null;

  return (
    <>
      {transitions.map((transition) => {
        const leftClip = itemsById.get(transition.leftClipId);
        const rightClip = itemsById.get(transition.rightClipId);

        // Skip if either clip is missing
        if (!leftClip || !rightClip) return null;

        return (
          <EffectsBasedTransitionRenderer
            key={transition.id}
            transition={transition}
            leftClip={leftClip}
            rightClip={rightClip}
          />
        );
      })}
    </>
  );
});
