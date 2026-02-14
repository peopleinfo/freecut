import React from 'react';
import { AbsoluteFill, Sequence } from '@/features/player/composition';
import { useCurrentFrame, useVideoConfig } from '../hooks/use-player-compat';
import type { CompositionItem as CompositionItemType } from '@/types/timeline';
import { useCompositionsStore } from '@/features/timeline/stores/compositions-store';
import { Item } from './item';

interface CompositionContentProps {
  item: CompositionItemType;
}

/**
 * Renders the contents of a sub-composition inline within the main preview.
 *
 * Each sub-composition item is rendered via a Sequence at its local `from`,
 * offset so that frame 0 of the sub-comp maps to the CompositionItem's
 * `from` on the parent timeline.
 *
 * The sub-comp is rendered at its own resolution and then CSS-scaled to fit
 * the parent transform bounds (handled by the parent ItemVisualWrapper).
 */
export const CompositionContent = React.memo<CompositionContentProps>(({ item }) => {
  const subComp = useCompositionsStore((s) => s.compositions.find((c) => c.id === item.compositionId));

  if (!subComp) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: '#2a1a2a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p style={{ color: '#a855f7', fontSize: 14 }}>Composition not found</p>
      </AbsoluteFill>
    );
  }

  // Sort tracks so lower order renders first (bottom), higher order on top
  const sortedTracks = [...subComp.tracks].sort((a, b) => b.order - a.order);

  return (
    <AbsoluteFill>
      {sortedTracks.map((track) => {
        if (!track.visible) return null;

        const trackItems = subComp.items.filter((i) => i.trackId === track.id);

        return trackItems.map((subItem) => (
          <Sequence
            key={subItem.id}
            from={subItem.from}
            durationInFrames={subItem.durationInFrames}
          >
            <Item item={subItem} muted={track.muted} masks={[]} />
          </Sequence>
        ));
      })}
    </AbsoluteFill>
  );
});
