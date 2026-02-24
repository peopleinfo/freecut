/**
 * CUT Module – Electron Handler Registration
 *
 * This file registers all IPC handlers specific to the Cut (video editor) module.
 * It is imported from the main electron/main.ts and keeps all cut-related
 * electron logic isolated from the rest of the MMO handlers.
 *
 * Handlers registered:
 *   - ffmpeg:check, ffmpeg:probe, ffmpeg:thumbnail, ffmpeg:export, ffmpeg:cancel-export
 *   - dialog:saveFile (cut-specific save dialog with video format filters)
 *   - shell:openExternal, shell:showItemInFolder
 */

import { type BrowserWindow, dialog, ipcMain, shell } from "electron";
import fs from "node:fs";
import { registerFFmpegHandlers } from "./ffmpeg";

export function registerCutHandlers(
  getMainWindow: () => BrowserWindow | null,
): void {
  // Register FFmpeg IPC handlers
  registerFFmpegHandlers();

  // ============ Cut-specific Save File Dialog ============
  // Only register if not already registered by the MMO app
  try {
    ipcMain.handle(
      "dialog:saveFile",
      async (
        _event,
        options?: {
          title?: string;
          defaultPath?: string;
          filters?: { name: string; extensions: string[] }[];
        },
      ) => {
        const mainWindow = getMainWindow();
        if (!mainWindow) return null;

        const result = await dialog.showSaveDialog(mainWindow, {
          title: options?.title || "Export Video",
          defaultPath: options?.defaultPath,
          filters: options?.filters || [
            { name: "MP4 Video", extensions: ["mp4"] },
            { name: "WebM Video", extensions: ["webm"] },
            { name: "All Files", extensions: ["*"] },
          ],
        });

        if (result.canceled) return null;
        return result.filePath;
      },
    );
  } catch (err) {
    console.warn("Failed to register dialog:saveFile", err);
  }

  // ============ Shell handlers (shared, register safely) ============
  try {
    ipcMain.handle("shell:openExternal", (_event, url: string) =>
      shell.openExternal(url),
    );
  } catch (err) {
    console.warn("Failed to register shell:openExternal", err);
  }

  try {
    ipcMain.handle("shell:showItemInFolder", (_event, fullPath: string) =>
      shell.showItemInFolder(fullPath),
    );
  } catch (err) {
    console.warn("Failed to register shell:showItemInFolder", err);
  }

  // ============ File System handlers ============
  try {
    ipcMain.handle(
      "fs:writeFile",
      async (_event, filePath: string, data: ArrayBuffer) => {
        fs.writeFileSync(filePath, Buffer.from(data));
        return true;
      },
    );
  } catch (err) {
    console.error(err);
  }
}
