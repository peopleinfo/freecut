import React from 'react';
import { AbsoluteFill, OffthreadVideo, Audio } from 'remotion';
import type { TimelineItem } from '@/types/timeline';

export interface ItemProps {
  item: TimelineItem;
}

/**
 * Remotion Item Component
 *
 * Renders different item types following Remotion best practices:
 * - Video: Uses OffthreadVideo for better performance
 * - Audio: Uses Audio component
 * - Image: Uses img tag
 * - Text: Renders text with styling
 * - Shape: Renders solid colors or shapes
 */
export const Item: React.FC<ItemProps> = ({ item }) => {
  if (item.type === 'video') {
    return (
      <OffthreadVideo
        src={item.src}
        startFrom={item.offset || 0}
      />
    );
  }

  if (item.type === 'audio') {
    return (
      <Audio
        src={item.src}
        startFrom={item.offset || 0}
      />
    );
  }

  if (item.type === 'image') {
    return (
      <AbsoluteFill>
        <img
          src={item.src}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      </AbsoluteFill>
    );
  }

  if (item.type === 'text') {
    return (
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <h1
          style={{
            fontSize: item.fontSize || 60,
            fontFamily: item.fontFamily || 'Arial, sans-serif',
            color: item.color,
            textAlign: 'center',
          }}
        >
          {item.text}
        </h1>
      </AbsoluteFill>
    );
  }

  if (item.type === 'shape') {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: item.fillColor
        }}
      />
    );
  }

  throw new Error(`Unknown item type: ${JSON.stringify(item)}`);
};
