# Trim & Rate Stretch System Documentation

This document covers the trim and rate stretch operations, their constraints, and how they interact.

## Core Properties

| Property | Type | Description | When It Changes |
|----------|------|-------------|-----------------|
| `sourceDuration` | Source | Total frames in original file (ground truth) | Never - immutable |
| `sourceStart` | Source | First frame used from source | Trim start, Split |
| `sourceEnd` | Source | Last frame used from source | Trim end, Rate stretch, Split |
| `speed` | Playback | Playback rate multiplier (0.1x - 10x) | Rate stretch only |
| `from` | Timeline | Start position on timeline | Move, Trim start, Rate stretch (start handle) |
| `durationInFrames` | Timeline | Length on timeline | Trim, Rate stretch, Split |

---

## Frame Conversion Formulas

| Conversion | Formula | Example |
|------------|---------|---------|
| Source → Timeline | `timelineFrames = sourceFrames / speed` | 100 source @ 2x = 50 timeline |
| Timeline → Source | `sourceFrames = timelineFrames * speed` | 50 timeline @ 2x = 100 source |
| Max timeline duration | `(sourceDuration - sourceStart) / speed` | (1000 - 100) @ 0.5x = 1800 |
| Max start extension | `sourceStart / speed` | 100 sourceStart @ 2x = 50 frames |

---

## Trim Operations

| Operation | Handle | Properties Changed | Constraint | Notes |
|-----------|--------|-------------------|------------|-------|
| **Shrink from start** | Start | `from` ↑, `durationInFrames` ↓, `sourceStart` ↑ | Min 1 frame duration | Moves start forward |
| **Extend from start** | Start | `from` ↓, `durationInFrames` ↑, `sourceStart` ↓ | `sourceStart ≥ 0` | Reveals earlier source |
| **Shrink from end** | End | `durationInFrames` ↓, `sourceEnd` ↓ | Min 1 frame duration | Hides later source |
| **Extend from end** | End | `durationInFrames` ↑, `sourceEnd` ↑ | `sourceEnd ≤ sourceDuration` | Reveals later source |

**Key constraint**: Trim always uses `sourceDuration` as the limit, making trimming **always reversible**.

---

## Rate Stretch Operations

| Operation | Handle | Properties Changed | Constraint |
|-----------|--------|-------------------|------------|
| **Speed up (shorter)** | End | `durationInFrames` ↓, `speed` ↑, `sourceEnd` recalc | `speed ≤ 10x` |
| **Slow down (longer)** | End | `durationInFrames` ↑, `speed` ↓, `sourceEnd` recalc | `speed ≥ 0.1x` |
| **Speed up from start** | Start | `from` ↑, `durationInFrames` ↓, `speed` ↑, `sourceEnd` recalc | `speed ≤ 10x` |
| **Slow down from start** | Start | `from` ↓, `durationInFrames` ↑, `speed` ↓, `sourceEnd` recalc | `speed ≥ 0.1x` |

**sourceEnd recalculation**: `sourceEnd = sourceStart + Math.round(durationInFrames * speed)`

---

## Speed Limits & Duration

| Speed | Min Duration Formula | Max Duration Formula |
|-------|---------------------|---------------------|
| 0.1x (slowest) | N/A | `availableSource / 0.1` = 10x longer |
| 1.0x (normal) | `availableSource / 10` | `availableSource / 1` = same |
| 10x (fastest) | `availableSource / 10` | N/A |

Where `availableSource = sourceDuration - sourceStart`

---

## Interaction Matrix

| First Operation | Second Operation | Behavior | Key Points |
|-----------------|------------------|----------|------------|
| **Trim end** → | Rate stretch | ✅ Works | Uses `sourceDuration - sourceStart` as available source |
| **Rate stretch** → | Trim end | ✅ Works | Can extend back to full `sourceDuration` |
| **Trim start** → | Rate stretch | ✅ Works | `sourceStart` increased, less source available |
| **Rate stretch** → | Trim start | ✅ Works | Can extend back to `sourceStart = 0` |
| **Rate stretch** → | Rate stretch | ✅ Works | Uses `sourceDuration` as ground truth (no rounding drift) |
| **Trim** → | Rate stretch → Trim | ✅ Works | Always reversible to original constraints |

---

## Rounding & Precision

| Property | Rounding | Reason |
|----------|----------|--------|
| `speed` | Full precision (no rounding) | Prevents accumulation errors |
| `sourceStart` | `Math.round(trimAmount * speed)` | Integer frame positions |
| `sourceEnd` | `Math.round(duration * speed)` | Integer frame positions |
| `durationInFrames` | Integer | Timeline frames are discrete |
| `from` | Integer | Timeline position |

**Critical**: `sourceDuration` is NEVER recalculated - it's the immutable ground truth from the source file.

---

## Source Boundary Calculations

```
┌─────────────────────────────────────────────────────────────┐
│                     SOURCE FILE (sourceDuration)            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Frame 0                                   Frame N    │   │
│  │    ▼                                         ▼       │   │
│  │    ├─────────────────────────────────────────┤       │   │
│  │         ▲                               ▲            │   │
│  │    sourceStart                     sourceEnd         │   │
│  │         │◄──── Used Segment ────────►│               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

TIMELINE REPRESENTATION:
┌─────────────────────────────────────────────────────────────┐
│  from                                                       │
│   ▼                                                         │
│   ├────────────────────────────────────┤                    │
│   │◄──── durationInFrames ────────────►│                    │
│                                                             │
│   Timeline Duration = (sourceEnd - sourceStart) / speed     │
└─────────────────────────────────────────────────────────────┘
```

---

## Error Prevention

| Issue | Cause | Solution |
|-------|-------|----------|
| **Rounding drift** | Using `sourceEnd - sourceStart` across multiple operations | Always use `sourceDuration` as ground truth |
| **Negative sourceStart** | Incorrect calculation in shared sequences | Group rate-stretched clips separately |
| **Exceeds source bounds** | `duration * speed > sourceDuration` | Clamp `sourceEnd` to `sourceDuration` |
| **Stale playback** | React memo not detecting property changes | Use `itemsFingerprint` and custom comparison |
| **Can't extend back** | Using `sourceEnd` as constraint | Always use `sourceDuration` as constraint |

---

## GIF/Looping Media Special Case

| Property | Behavior | Notes |
|----------|----------|-------|
| Duration | User-controlled | Not tied to source animation length |
| Speed | Affects animation playback | Higher = faster animation loop |
| Source constraints | Very generous (10 min max) | Can extend freely |
| Rate stretch UI | Changes speed only | Duration/position stay fixed |

---

## Key Files

| File | Purpose |
|------|---------|
| `src/features/timeline/utils/trim-utils.ts` | Trim clamping and source boundary updates |
| `src/features/timeline/utils/source-calculations.ts` | Frame conversion utilities, speed clamping |
| `src/features/timeline/hooks/use-timeline-trim.ts` | Trim drag interaction hook |
| `src/features/timeline/hooks/use-rate-stretch.ts` | Rate stretch drag interaction hook |
| `src/features/timeline/stores/items-store.ts` | Store mutations for trim/rate stretch |
| `src/lib/remotion/components/stable-video-sequence.tsx` | Playback grouping with stable keys |
