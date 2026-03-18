/**
 * FreeCut — Electron Preload Script
 *
 * Exposes safe bridges between the Electron main process and the
 * renderer (React app) using contextBridge:
 *
 * - window.electronUpdater — auto-update events and controls
 * - window.opencut — native dialog, filesystem, and shell operations
 *   used by the export flow (use-client-render.ts) for native save dialogs
 */

const { contextBridge, ipcRenderer } = require("electron");

// ── Auto-Updater Bridge ───────────────────────────────────────────
contextBridge.exposeInMainWorld("electronUpdater", {
  // Queries
  isElectron: true,
  getVersion: () => ipcRenderer.invoke("updater:get-version"),

  // Commands
  checkForUpdates: () => ipcRenderer.invoke("updater:check"),
  downloadUpdate: () => ipcRenderer.invoke("updater:download"),
  quitAndInstall: () => ipcRenderer.invoke("updater:install"),
  setAutoUpdate: (enabled) =>
    ipcRenderer.invoke("updater:set-auto-update", enabled),
  getAutoUpdate: () => ipcRenderer.invoke("updater:get-auto-update"),

  // Event listeners
  onUpdateEvent: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("updater:event", handler);
    return () => ipcRenderer.removeListener("updater:event", handler);
  },
});

// ── OpenCut Bridge (dialog, fs, shell) ────────────────────────────
// Matches the window.opencut interface in src/types/electron.d.ts
// Used by use-client-render.ts for native "Save As" during export
contextBridge.exposeInMainWorld("opencut", {
  dialog: {
    saveFile: (options) => ipcRenderer.invoke("dialog:save-file", options),
    openFile: (options) => ipcRenderer.invoke("dialog:open-file", options),
  },
  fs: {
    writeFile: (filePath, data) =>
      ipcRenderer.invoke("fs:write-file", filePath, data),
  },
  shell: {
    openExternal: (url) => ipcRenderer.invoke("shell:open-external", url),
    showItemInFolder: (fullPath) =>
      ipcRenderer.invoke("shell:show-item-in-folder", fullPath),
  },
});
