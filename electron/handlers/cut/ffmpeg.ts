/**
 * Native FFmpeg service for the Electron main process.
 * Uses fluent-ffmpeg with platform-specific bundled binaries
 * for high-performance video encoding with hardware acceleration.
 */

import { type ChildProcess, execFile, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { app, ipcMain } from 'electron';

// --------------- FFmpeg Binary Resolution ---------------

function getFFmpegPath(): string {
  // In production, binaries are in the app resources
  const isPackaged = app.isPackaged;
  const platform = process.platform; // 'win32' | 'darwin' | 'linux'
  const arch = process.arch; // 'x64' | 'arm64'

  const binaryName = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';

  if (isPackaged) {
    // Packaged app: binaries in resources/ffmpeg/
    return path.join(process.resourcesPath, 'ffmpeg', binaryName);
  }

  // Dev mode: try local bin, then system PATH
  const localBin = path.join(app.getAppPath(), 'bin', `${platform}-${arch}`, binaryName);
  if (fs.existsSync(localBin)) {
    return localBin;
  }

  // Fall back to system FFmpeg
  return binaryName;
}

function getFFprobePath(): string {
  const isPackaged = app.isPackaged;
  const platform = process.platform;
  const arch = process.arch;

  const binaryName = platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';

  if (isPackaged) {
    return path.join(process.resourcesPath, 'ffmpeg', binaryName);
  }

  const localBin = path.join(app.getAppPath(), 'bin', `${platform}-${arch}`, binaryName);
  if (fs.existsSync(localBin)) {
    return localBin;
  }

  return binaryName;
}

// --------------- Hardware Acceleration Detection ---------------

interface HWAccelInfo {
  encoder: string;
  hwaccel: string;
  available: boolean;
}

async function detectHardwareAcceleration(): Promise<HWAccelInfo> {
  const platform = process.platform;
  const ffmpegPath = getFFmpegPath();

  // Try platform-specific hardware encoders
  const candidates: { encoder: string; hwaccel: string }[] =
    platform === 'win32'
      ? [
          { encoder: 'h264_nvenc', hwaccel: 'cuda' }, // NVIDIA
          { encoder: 'h264_amf', hwaccel: 'd3d11va' }, // AMD
          { encoder: 'h264_qsv', hwaccel: 'qsv' }, // Intel QuickSync
        ]
      : platform === 'darwin'
        ? [
            { encoder: 'h264_videotoolbox', hwaccel: 'videotoolbox' }, // macOS
          ]
        : [
            { encoder: 'h264_nvenc', hwaccel: 'cuda' }, // Linux NVIDIA
            { encoder: 'h264_vaapi', hwaccel: 'vaapi' }, // Linux VA-API
          ];

  for (const candidate of candidates) {
    try {
      const available = await testEncoder(ffmpegPath, candidate.encoder);
      if (available) {
        return { ...candidate, available: true };
      }
    } catch {
      // Continue to next candidate
    }
  }
  return { encoder: 'libx264', hwaccel: '', available: false };
}

function testEncoder(ffmpegPath: string, encoder: string): Promise<boolean> {
  return new Promise((resolve) => {
    execFile(ffmpegPath, ['-hide_banner', '-encoders'], { timeout: 5000 }, (error, stdout) => {
      if (error) {
        resolve(false);
        return;
      }
      resolve(stdout.includes(encoder));
    });
  });
}

// --------------- Probe ---------------

export interface ProbeResult {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  audioCodec: string | null;
  bitrate: number;
}

async function probeFile(filePath: string): Promise<ProbeResult> {
  const ffprobePath = getFFprobePath();

  return new Promise((resolve, reject) => {
    execFile(
      ffprobePath,
      ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath],
      { timeout: 15000 },
      (error, stdout) => {
        if (error) {
          reject(new Error(`FFprobe failed: ${error.message}`));
          return;
        }

        try {
          const data = JSON.parse(stdout);
          const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
          const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio');

          if (!videoStream) {
            reject(new Error('No video stream found'));
            return;
          }

          // Parse FPS from r_frame_rate (e.g. "30/1" or "30000/1001")
          let fps = 30;
          if (videoStream.r_frame_rate) {
            const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
            if (den && den > 0) fps = num / den;
          }

          resolve({
            duration: parseFloat(data.format?.duration || videoStream.duration || '0'),
            width: videoStream.width || 0,
            height: videoStream.height || 0,
            fps,
            codec: videoStream.codec_name || '',
            audioCodec: audioStream?.codec_name || null,
            bitrate: parseInt(data.format?.bit_rate || '0', 10),
          });
        } catch (e) {
          reject(new Error(`Failed to parse FFprobe output: ${e}`));
        }
      },
    );
  });
}

// --------------- Export ---------------

interface ExportOptions {
  inputPath: string;
  outputPath: string;
  width?: number;
  height?: number;
  fps?: number;
  format: 'mp4' | 'webm' | 'mov';
  quality: 'low' | 'medium' | 'high' | 'very_high';
  useHardwareAccel?: boolean;
}

const CRF_MAP = {
  low: { libx264: '28', libx265: '32', libvpx: '35', hw: '30' },
  medium: { libx264: '23', libx265: '28', libvpx: '30', hw: '25' },
  high: { libx264: '18', libx265: '24', libvpx: '23', hw: '20' },
  very_high: { libx264: '15', libx265: '20', libvpx: '18', hw: '15' },
};

let activeExportProcess: ChildProcess | null = null;
let cachedHWAccel: HWAccelInfo | null = null;

async function exportVideo(
  options: ExportOptions,
  onProgress: (progress: number) => void,
): Promise<void> {
  const ffmpegPath = getFFmpegPath();

  // Detect HW accel once
  if (!cachedHWAccel) {
    cachedHWAccel = await detectHardwareAcceleration();
  }

  const useHW = options.useHardwareAccel !== false && cachedHWAccel.available;
  const encoder = useHW ? cachedHWAccel.encoder : 'libx264';
  const crf = CRF_MAP[options.quality];

  // Build FFmpeg args
  const args: string[] = ['-y', '-hide_banner'];

  // Hardware decode if available
  if (useHW && cachedHWAccel.hwaccel) {
    args.push('-hwaccel', cachedHWAccel.hwaccel);
  }

  args.push('-i', options.inputPath);

  // Video filters
  const filters: string[] = [];
  if (options.width && options.height) {
    filters.push(`scale=${options.width}:${options.height}:force_original_aspect_ratio=decrease`);
    filters.push(`pad=${options.width}:${options.height}:(ow-iw)/2:(oh-ih)/2`);
  }
  if (options.fps) {
    filters.push(`fps=${options.fps}`);
  }
  if (filters.length > 0) {
    args.push('-vf', filters.join(','));
  }

  // Encoder settings
  args.push('-c:v', encoder);

  if (encoder === 'libx264') {
    args.push('-crf', crf.libx264, '-preset', 'fast', '-pix_fmt', 'yuv420p');
  } else if (encoder.includes('nvenc')) {
    args.push('-cq', crf.hw, '-preset', 'p4', '-pix_fmt', 'yuv420p');
  } else if (encoder.includes('videotoolbox')) {
    args.push('-q:v', crf.hw, '-pix_fmt', 'yuv420p');
  } else if (encoder.includes('amf')) {
    args.push('-quality', 'balanced', '-pix_fmt', 'yuv420p');
  } else if (encoder.includes('qsv')) {
    args.push('-global_quality', crf.hw, '-preset', 'faster', '-pix_fmt', 'yuv420p');
  }

  // Audio
  if (options.format === 'webm') {
    args.push('-c:a', 'libopus', '-b:a', '128k');
  } else {
    args.push('-c:a', 'aac', '-b:a', '192k');
  }

  // Format-specific
  if (options.format === 'mp4') {
    args.push('-movflags', '+faststart');
  }

  args.push('-progress', 'pipe:1', options.outputPath);

  // Get duration for progress calculation
  let totalDuration = 0;
  try {
    const probe = await probeFile(options.inputPath);
    totalDuration = probe.duration;
  } catch {
    // If probe fails, progress won't be accurate but export still works
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    activeExportProcess = proc;

    let stderrOutput = '';

    proc.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      // Parse FFmpeg progress output
      const timeMatch = text.match(/out_time_ms=(\d+)/);
      if (timeMatch && totalDuration > 0) {
        const currentTimeMs = parseInt(timeMatch[1], 10);
        const progress = Math.min(currentTimeMs / (totalDuration * 1_000_000), 1);
        onProgress(progress);
      }
    });

    proc.stderr?.on('data', (data: Buffer) => {
      stderrOutput += data.toString();
    });

    proc.on('close', (code) => {
      activeExportProcess = null;
      if (code === 0) {
        onProgress(1);
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderrOutput.slice(-500)}`));
      }
    });

    proc.on('error', (err) => {
      activeExportProcess = null;
      reject(err);
    });
  });
}

function cancelExport(): boolean {
  if (activeExportProcess) {
    activeExportProcess.kill('SIGTERM');
    activeExportProcess = null;
    return true;
  }
  return false;
}

// --------------- Generate Thumbnail (Native) ---------------

async function generateThumbnailNative(filePath: string, timeSeconds: number): Promise<string> {
  const ffmpegPath = getFFmpegPath();
  const tmpDir = os.tmpdir();
  const outputPath = path.join(tmpDir, `opencut-thumb-${Date.now()}.jpg`);

  return new Promise((resolve, reject) => {
    execFile(
      ffmpegPath,
      [
        '-y',
        '-hide_banner',
        '-ss',
        String(timeSeconds),
        '-i',
        filePath,
        '-vframes',
        '1',
        '-vf',
        'scale=320:-1',
        '-q:v',
        '5',
        outputPath,
      ],
      { timeout: 10000 },
      (error) => {
        if (error) {
          reject(new Error(`Thumbnail generation failed: ${error.message}`));
          return;
        }

        // Read as base64 data URL
        try {
          const buffer = fs.readFileSync(outputPath);
          const base64 = buffer.toString('base64');
          fs.unlinkSync(outputPath); // cleanup
          resolve(`data:image/jpeg;base64,${base64}`);
        } catch (e) {
          reject(new Error(`Failed to read thumbnail: ${e}`));
        }
      },
    );
  });
}

// --------------- Check FFmpeg Availability ---------------

async function checkFFmpegAvailability(): Promise<{
  available: boolean;
  version: string;
  path: string;
  hwAccel: HWAccelInfo;
}> {
  const ffmpegPath = getFFmpegPath();

  return new Promise(async (resolve) => {
    execFile(ffmpegPath, ['-version'], { timeout: 5000 }, async (error, stdout) => {
      if (error) {
        resolve({
          available: false,
          version: '',
          path: ffmpegPath,
          hwAccel: { encoder: 'libx264', hwaccel: '', available: false },
        });
        return;
      }

      const versionMatch = stdout.match(/ffmpeg version (\S+)/);
      const version = versionMatch?.[1] || 'unknown';

      const hwAccel = await detectHardwareAcceleration();
      cachedHWAccel = hwAccel;

      resolve({
        available: true,
        version,
        path: ffmpegPath,
        hwAccel,
      });
    });
  });
}

// --------------- IPC Handlers ---------------

export function registerFFmpegHandlers(): void {
  ipcMain.handle('ffmpeg:check', async () => {
    return checkFFmpegAvailability();
  });

  ipcMain.handle('ffmpeg:probe', async (_event, filePath: string) => {
    return probeFile(filePath);
  });

  ipcMain.handle('ffmpeg:thumbnail', async (_event, filePath: string, timeSeconds: number) => {
    return generateThumbnailNative(filePath, timeSeconds);
  });

  ipcMain.handle('ffmpeg:export', async (event, options: ExportOptions) => {
    return exportVideo(options, (progress) => {
      event.sender.send('ffmpeg:export-progress', progress);
    });
  });

  ipcMain.handle('ffmpeg:cancel-export', () => {
    return cancelExport();
  });
}
