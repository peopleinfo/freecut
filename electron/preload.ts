import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...rest) =>
      listener(event, ...rest),
    );
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  },
});

contextBridge.exposeInMainWorld("opencut", {
  dialog: {
    openFile: (options?: {
      title?: string;
      multiple?: boolean;
      filters?: { name: string; extensions: string[] }[];
    }): Promise<string | string[] | null> =>
      ipcRenderer.invoke("dialog:openFile", options),

    saveFile: (options?: {
      title?: string;
      defaultPath?: string;
      filters?: { name: string; extensions: string[] }[];
    }): Promise<string | null> =>
      ipcRenderer.invoke("dialog:saveFile", options),
  },
  shell: {
    openExternal: (url: string): Promise<void> =>
      ipcRenderer.invoke("shell:openExternal", url),
    showItemInFolder: (fullPath: string): Promise<void> =>
      ipcRenderer.invoke("shell:showItemInFolder", fullPath),
  },
  ffmpeg: {
    check: (): Promise<{
      available: boolean;
      version: string;
      path: string;
      hwAccel: { encoder: string; hwaccel: string; available: boolean };
    }> => ipcRenderer.invoke("ffmpeg:check"),

    probe: (
      filePath: string,
    ): Promise<{
      duration: number;
      width: number;
      height: number;
      fps: number;
      codec: string;
      audioCodec: string | null;
      bitrate: number;
    }> => ipcRenderer.invoke("ffmpeg:probe", filePath),

    thumbnail: (filePath: string, timeSeconds: number): Promise<string> =>
      ipcRenderer.invoke("ffmpeg:thumbnail", filePath, timeSeconds),

    export: (options: {
      inputPath: string;
      outputPath: string;
      width?: number;
      height?: number;
      fps?: number;
      format: "mp4" | "webm" | "mov";
      quality: "low" | "medium" | "high" | "very_high";
      useHardwareAccel?: boolean;
    }): Promise<void> => ipcRenderer.invoke("ffmpeg:export", options),

    cancelExport: (): Promise<boolean> =>
      ipcRenderer.invoke("ffmpeg:cancel-export"),

    onExportProgress: (callback: (progress: number) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, progress: number) =>
        callback(progress);
      ipcRenderer.on("ffmpeg:export-progress", handler);
      return () => ipcRenderer.off("ffmpeg:export-progress", handler);
    },
  },
});
