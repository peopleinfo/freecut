import { test, expect } from "@playwright/test";
import fs from "fs";
import http, { type AddressInfo } from "http";
import os from "os";
import path from "path";
import { execFileSync, spawn, type ChildProcess } from "child_process";

const BACKEND_URL = "http://localhost:8000";
const DEFAULT_LONG_TEST_VIDEO = path.join(
  os.tmpdir(),
  "freecut-export-repro",
  "test-1080p-300s-lowbitrate.mp4",
);
const LONG_TEST_VIDEO = process.env.FREECUT_LONG_TEST_VIDEO
  ?? (fs.existsSync(DEFAULT_LONG_TEST_VIDEO)
    ? DEFAULT_LONG_TEST_VIDEO
    : path.resolve("e2e/fixtures/test-1080p-60s.mp4"));
const FFPROBE_PATH =
  process.env.FREECUT_FFPROBE_PATH ??
  "C:\\Users\\dila\\AppData\\Local\\Microsoft\\WinGet\\Links\\ffprobe.exe";
const BACKEND_WORKDIR = path.resolve("backend");

let backendProcess: ChildProcess | null = null;
let startedBackendForTest = false;
let fixtureServer: http.Server | null = null;
let fixtureUrl: string | null = null;

async function isBackendAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForBackend(timeoutMs: number): Promise<boolean> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isBackendAvailable()) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function ensureBackendRunning(): Promise<void> {
  if (await isBackendAvailable()) return;

  backendProcess = spawn("uv", ["run", "python", "main.py"], {
    cwd: BACKEND_WORKDIR,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  startedBackendForTest = true;

  backendProcess.stdout?.on("data", (chunk) => {
    process.stdout.write(`[backend] ${chunk}`);
  });
  backendProcess.stderr?.on("data", (chunk) => {
    process.stderr.write(`[backend] ${chunk}`);
  });

  const ready = await waitForBackend(20_000);
  expect(ready).toBe(true);
}

function probeDuration(filePath: string): number {
  const output = execFileSync(
    FFPROBE_PATH,
    [
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      filePath,
    ],
    { encoding: "utf8" },
  );

  const data = JSON.parse(output) as {
    format?: { duration?: string };
  };

  return Number(data.format?.duration ?? 0);
}

async function startFixtureServer(filePath: string): Promise<string> {
  const stat = fs.statSync(filePath);

  return await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (req.url !== "/video.mp4") {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Type", "video/mp4");

      if (req.method === "HEAD") {
        res.setHeader("Content-Length", stat.size);
        res.writeHead(200);
        res.end();
        return;
      }

      let start = 0;
      let end = stat.size - 1;
      const range = req.headers.range;

      if (typeof range === "string") {
        const match = /bytes=(\d+)-(\d+)?/.exec(range);
        if (match) {
          start = Number(match[1] ?? 0);
          end = match[2] ? Number(match[2]) : end;
          end = Math.min(end, stat.size - 1);

          if (start > end || start >= stat.size) {
            res.writeHead(416, {
              "Content-Range": `bytes */${stat.size}`,
            });
            res.end();
            return;
          }

          res.writeHead(206, {
            "Content-Length": end - start + 1,
            "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          });
          fs.createReadStream(filePath, { start, end }).pipe(res);
          return;
        }
      }

      res.writeHead(200, {
        "Content-Length": stat.size,
      });
      fs.createReadStream(filePath).pipe(res);
    });

    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as AddressInfo | null;
      if (!address) {
        reject(new Error("Fixture server did not expose an address"));
        return;
      }
      fixtureServer = server;
      resolve(`http://127.0.0.1:${address.port}/video.mp4`);
    });
  });
}

async function stopFixtureServer(): Promise<void> {
  if (!fixtureServer) return;

  await new Promise<void>((resolve, reject) => {
    fixtureServer?.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  fixtureServer = null;
  fixtureUrl = null;
}

test.describe("Export Duration Regression", () => {
  test.describe.configure({ timeout: 600_000 });

  test.beforeAll(async () => {
    await ensureBackendRunning();

    if (fs.existsSync(LONG_TEST_VIDEO)) {
      fixtureUrl = await startFixtureServer(LONG_TEST_VIDEO);
    }
  });

  test.afterAll(async () => {
    await stopFixtureServer();

    if (startedBackendForTest && backendProcess && !backendProcess.killed) {
      backendProcess.kill();
    }
    backendProcess = null;
    startedBackendForTest = false;
  });

  test("backend composition export preserves 5-minute duration for a 1080p source", async () => {
    test.skip(
      !fs.existsSync(LONG_TEST_VIDEO),
      `Long test video not found: ${LONG_TEST_VIDEO}`,
    );

    const mediaId = `duration-repro-${Date.now()}`;
    const uploadRes = await fetch(`${BACKEND_URL}/api/media/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Media-Id": mediaId,
        "X-Filename": path.basename(LONG_TEST_VIDEO),
      },
      body: fs.readFileSync(LONG_TEST_VIDEO),
    });
    expect(uploadRes.ok).toBe(true);
    const uploadResult = (await uploadRes.json()) as { path: string };

    const composition = {
      fps: 30,
      width: 1920,
      height: 1080,
      durationInFrames: 9000,
      tracks: [
        {
          id: "track-1",
          type: "video",
          items: [
            {
              id: "item-1",
              type: "video",
              mediaId,
              from: 0,
              durationInFrames: 9000,
              trimStart: 0,
              trimEnd: 0,
              volume: 0,
              playbackRate: 1,
              transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
            },
          ],
        },
      ],
    };

    const startedAt = Date.now();
    const exportRes = await fetch(`${BACKEND_URL}/api/ffmpeg/export-composition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        composition,
        mediaMap: { [mediaId]: uploadResult.path },
        settings: {
          codec: "avc",
          quality: "high",
          container: "mp4",
          width: 1920,
          height: 1080,
          videoBitrate: 10_000_000,
          audioBitrate: 192_000,
        },
        useHardwareAccel: true,
      }),
    });

    expect(exportRes.ok).toBe(true);
    const exportResult = (await exportRes.json()) as {
      success: boolean;
      jobId: string;
      fileSize: number;
      elapsed: number;
      encoder: string;
      hwAccel: boolean;
    };

    expect(exportResult.success).toBe(true);

    const downloadRes = await fetch(
      `${BACKEND_URL}/api/ffmpeg/export-download/${exportResult.jobId}`,
    );
    expect(downloadRes.ok).toBe(true);

    const outPath = path.join(
      os.tmpdir(),
      `freecut-export-duration-${exportResult.jobId}.mp4`,
    );
    fs.writeFileSync(outPath, Buffer.from(await downloadRes.arrayBuffer()));

    const actualDuration = probeDuration(outPath);
    const actualSize = fs.statSync(outPath).size;
    const elapsedSec = (Date.now() - startedAt) / 1000;

    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          input: LONG_TEST_VIDEO,
          exportElapsedSec: Number(elapsedSec.toFixed(2)),
          backendElapsedSec: exportResult.elapsed,
          actualDurationSec: Number(actualDuration.toFixed(2)),
          actualSizeBytes: actualSize,
          encoder: exportResult.encoder,
          hwAccel: exportResult.hwAccel,
        },
        null,
        2,
      ),
    );

    expect(actualDuration).toBeGreaterThan(295);
    expect(actualDuration).toBeLessThan(305);
    expect(actualSize).toBeGreaterThan(20 * 1024 * 1024);
  });

  test("browser import and UI export keep the full 5-minute duration", async ({
    page,
  }) => {
    test.skip(
      !fs.existsSync(LONG_TEST_VIDEO),
      `Long test video not found: ${LONG_TEST_VIDEO}`,
    );
    test.skip(!fixtureUrl, "Fixture server did not start");

    const fixtureSize = fs.statSync(LONG_TEST_VIDEO).size;

    await page.goto("/projects/new");
    await page.getByLabel(/Project Name/i).fill("Export Duration UI Repro");
    await page.getByRole("button", { name: /Create Project/i }).click();
    await expect(page).toHaveURL(/\/editor\//, { timeout: 15_000 });
    await page.waitForSelector(".h-screen", { timeout: 10_000 });

    await page.waitForFunction(async () => {
      const { useTimelineStore } = await import("/src/features/timeline/stores/timeline-store.ts");
      return useTimelineStore.getState().tracks.length > 0;
    });

    const importResult = await page.evaluate(async (videoUrl) => {
      const [
        { mediaProcessorService },
        { opfsService },
        { createMedia, associateMediaWithProject },
        { useProjectStore },
        { useMediaLibraryStore },
        { useTimelineStore },
      ] = await Promise.all([
        import("/src/features/media-library/services/media-processor-service.ts"),
        import("/src/features/media-library/services/opfs-service.ts"),
        import("/src/infrastructure/storage/indexeddb/index.ts"),
        import("/src/features/projects/stores/project-store.ts"),
        import("/src/features/media-library/stores/media-library-store.ts"),
        import("/src/features/timeline/stores/timeline-store.ts"),
      ]);

      const response = await fetch(videoUrl!);
      if (!response.ok) {
        throw new Error(`Failed to fetch fixture: ${response.status}`);
      }

      const blob = await response.blob();
      const file = new File([blob], "test-1080p-300s.mp4", { type: "video/mp4" });
      const { metadata } = await mediaProcessorService.processMedia(file, file.type, {
        thumbnailTimestamp: 1,
      });

      if (metadata.type !== "video") {
        throw new Error(`Expected video metadata, got ${metadata.type}`);
      }

      const project = useProjectStore.getState().currentProject;
      if (!project) {
        throw new Error("Current project was not initialized");
      }

      const mediaId = crypto.randomUUID();
      const now = Date.now();
      const opfsPath = `content/${mediaId.slice(0, 2)}/${mediaId.slice(2, 4)}/${mediaId}/data`;

      await opfsService.saveUpload(file, opfsPath);
      await createMedia({
        id: mediaId,
        storageType: "opfs",
        opfsPath,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        fps: metadata.fps,
        codec: metadata.codec,
        bitrate: metadata.bitrate ?? 0,
        audioCodec: metadata.audioCodec,
        audioCodecSupported: metadata.audioCodecSupported,
        tags: [],
        createdAt: now,
        updatedAt: now,
      });
      await associateMediaWithProject(project.id, mediaId);
      await useMediaLibraryStore.getState().loadMediaItems();

      const timelineStore = useTimelineStore.getState();
      const trackId = timelineStore.tracks[0]?.id;
      if (!trackId) {
        throw new Error("No track available in timeline");
      }

      const sourceDurationFrames = Math.max(
        1,
        Math.round(metadata.duration * (metadata.fps || project.metadata.fps)),
      );
      const durationInFrames = Math.max(
        1,
        Math.round(metadata.duration * project.metadata.fps),
      );

      timelineStore.addItem({
        id: crypto.randomUUID(),
        type: "video",
        trackId,
        from: 0,
        durationInFrames,
        label: file.name,
        mediaId,
        originId: crypto.randomUUID(),
        sourceStart: 0,
        sourceEnd: sourceDurationFrames,
        sourceDuration: sourceDurationFrames,
        sourceFps: metadata.fps || project.metadata.fps,
        trimStart: 0,
        trimEnd: 0,
        volume: 0,
        src: URL.createObjectURL(file),
        sourceWidth: metadata.width,
        sourceHeight: metadata.height,
        transform: {
          x: 0,
          y: 0,
          width: project.metadata.width,
          height: project.metadata.height,
          rotation: 0,
          opacity: 1,
        },
      });

      const endFrame = Math.max(
        0,
        ...useTimelineStore.getState().items.map(
          (item: { from: number; durationInFrames: number }) => item.from + item.durationInFrames,
        ),
      );

      return {
        durationSec: metadata.duration,
        durationInFrames,
        sourceDurationFrames,
        timelineEndFrame: endFrame,
        fps: project.metadata.fps,
        fileSize: file.size,
      };
    }, fixtureUrl);

    expect(importResult.durationSec).toBeGreaterThan(295);
    expect(importResult.durationSec).toBeLessThan(305);
    expect(importResult.durationInFrames).toBe(9000);
    expect(importResult.timelineEndFrame).toBe(9000);

    let uploadedBytes = 0;
    let uploadHeaders: Record<string, string> | null = null;
    let compositionPayload: Record<string, unknown> | null = null;

    await page.route("**/api/media/upload", async (route) => {
      const request = route.request();
      uploadedBytes = request.postDataBuffer()?.byteLength ?? 0;
      uploadHeaders = await request.allHeaders();
      const mediaId = request.headers()["x-media-id"] ?? "mock-media";

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          mediaId,
          path: `/mock/${mediaId}.mp4`,
          cached: false,
        }),
      });
    });

    await page.route("**/api/ffmpeg/export-composition", async (route) => {
      compositionPayload = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          jobId: "mock-duration-job",
          fileSize: 4,
          elapsed: 0.1,
          encoder: "h264_nvenc",
          hwAccel: true,
        }),
      });
    });

    await page.route("**/api/ffmpeg/export-download/mock-duration-job", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "video/mp4",
        body: Buffer.from("mock"),
      });
    });

    await page.getByRole("button", { name: /^Export$/ }).click();
    await page.getByRole("menuitem", { name: /Export Video/i }).click();

    await expect(page.getByText("5m 0s")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("00:05:00:00")).toBeVisible();

    await page.getByRole("button", { name: /^Export Video$/ }).click();

    await expect
      .poll(() => compositionPayload !== null, { timeout: 30_000 })
      .toBe(true);

    expect(uploadedBytes).toBe(fixtureSize);
    expect(uploadHeaders?.["x-filename"]).toBe("test-1080p-300s.mp4");

    const composition = compositionPayload!.composition as
      | { durationInFrames?: number; fps?: number; tracks?: Array<{ items?: Array<{ durationInFrames?: number }> }> }
      | undefined;

    expect(composition?.fps).toBe(30);
    expect(composition?.durationInFrames).toBe(9000);
    expect(composition?.tracks?.[0]?.items?.[0]?.durationInFrames).toBe(9000);
    await expect(page.getByText(/Export complete!/i)).toBeVisible({ timeout: 30_000 });
  });
});
