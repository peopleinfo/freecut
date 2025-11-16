import type { TimelineTrack, TimelineClip } from '@/types/timeline';
import { TimelineItem } from './timeline-item';

export interface TimelineTrackProps {
  track: TimelineTrack;
  clips: TimelineClip[];
}

/**
 * Timeline Track Component
 *
 * Renders a single timeline track with:
 * - Track background based on type (video/audio/subtitle)
 * - All clips belonging to this track
 * - Appropriate height based on track settings
 */
export function TimelineTrack({ track, clips }: TimelineTrackProps) {
  // Filter clips for this track
  const trackClips = clips.filter((clip) => clip.trackId === track.id);

  // Get track-specific styling
  const getTrackClass = () => {
    switch (track.type) {
      case 'video':
        return 'video-track';
      case 'audio':
        return 'audio-track';
      case 'subtitle':
        return 'subtitle-track';
      default:
        return '';
    }
  };

  return (
    <div
      className={`border-b border-border ${getTrackClass()} relative`}
      style={{ height: `${track.height}px` }}
    >
      {/* Render all clips for this track */}
      {trackClips.map((clip) => (
        <TimelineItem key={clip.id} clip={clip} />
      ))}

      {/* Waveform visualization for audio tracks */}
      {track.type === 'audio' && (
        <div className="absolute inset-0 flex items-center px-2 opacity-20 pointer-events-none">
          <svg
            className="w-full h-10"
            preserveAspectRatio="none"
            viewBox="0 0 1000 100"
          >
            <path
              d="M0 50 Q25 20, 50 50 T100 50 T150 50 T200 50 T250 50 T300 50 T350 50 T400 50 T450 50 T500 50 T550 50 T600 50 T650 50 T700 50 T750 50 T800 50 T850 50 T900 50 T950 50 T1000 50"
              stroke="currentColor"
              className="text-green-400"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
