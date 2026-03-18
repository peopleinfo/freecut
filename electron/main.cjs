/**
 * FreeCut — Electron Main Process
 *
 * Minimal wrapper that loads the web app in a BrowserWindow.
 * Auto-update support via electron-updater (checks GitHub Releases).
 *
 * In development: loads from Vite dev server (http://localhost:5173)
 * In production:  loads from the built dist/ folder + auto-updates
 */

const { app, BrowserWindow, shell, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

// Check if running in development
const isDev = !app.isPackaged;

let mainWindow = null;
let backendProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: "FreeCut",
    icon: path.join(__dirname, "../public/favicon.ico"),
    backgroundColor: "#09090b", // zinc-950
    show: false, // Show when ready to avoid flash
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  // Show window when content is loaded (avoids white flash)
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    // Development: load from Vite dev server
    mainWindow.loadURL("http://localhost:5173");
    // Uncomment to open DevTools by default:
    // mainWindow.webContents.openDevTools();
  } else {
    // Production: load from built files
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ── IPC Handlers (opencut bridge) ───────────────────────────────

function registerIpcHandlers() {
  // dialog:save-file — native save dialog
  ipcMain.handle("dialog:save-file", async (_event, options) => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showSaveDialog(win, {
      title: options?.title ?? "Save file",
      defaultPath: options?.defaultPath,
      filters: options?.filters ?? [
        { name: "Video files", extensions: ["mp4", "mov", "webm", "mkv"] },
        { name: "Audio files", extensions: ["mp3", "aac", "wav"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });
    if (result.canceled || !result.filePath) return null;
    return result.filePath;
  });

  // dialog:open-file — native open dialog
  ipcMain.handle("dialog:open-file", async (_event, options) => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win, {
      title: options?.title ?? "Open file",
      properties: options?.multiple ? ["openFile", "multiSelections"] : ["openFile"],
      filters: options?.filters ?? [
        { name: "Media files", extensions: ["mp4", "mov", "webm", "mkv", "mp3", "wav", "aac", "png", "jpg", "jpeg", "gif", "webp"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return options?.multiple ? result.filePaths : result.filePaths[0];
  });

  // fs:write-file — write binary data to disk
  ipcMain.handle("fs:write-file", async (_event, filePath, data) => {
    try {
      const buffer = Buffer.from(data);
      await fs.promises.writeFile(filePath, buffer);
      return true;
    } catch (err) {
      console.error("[IPC] fs:write-file failed:", err.message);
      return false;
    }
  });

  // shell:open-external — open URL in system browser
  ipcMain.handle("shell:open-external", async (_event, url) => {
    await shell.openExternal(url);
  });

  // shell:show-item-in-folder — reveal file in file explorer
  ipcMain.handle("shell:show-item-in-folder", async (_event, fullPath) => {
    shell.showItemInFolder(fullPath);
  });
}

/**
 * Start the Python backend process.
 * In production: runs the PyInstaller-compiled freecut-backend exe.
 * In development: runs via uv (started by concurrently, not here).
 */
function startBackend() {
  let command, args, options;

  if (isDev) {
    // Dev mode — this branch is only called if you manually invoke startBackend()
    // in dev. Normally concurrently handles it via `npm run electron:dev`.
    command = "uv";
    args = ["run", "python", "main.py"];
    options = {
      cwd: path.join(__dirname, "../backend"),
      stdio: "pipe",
      shell: true,
    };
  } else {
    // Production — use PyInstaller-compiled executable
    const backendDir = path.join(
      process.resourcesPath,
      "backend-dist",
      "freecut-backend",
    );
    const exeName =
      process.platform === "win32" ? "freecut-backend.exe" : "freecut-backend";
    const exePath = path.join(backendDir, exeName);

    console.log(`[Backend] Launching: ${exePath}`);
    command = exePath;
    args = [];
    options = {
      cwd: backendDir,
      stdio: "pipe",
      // Don't use shell in production — direct exe launch is more reliable
    };
  }

  try {
    backendProcess = spawn(command, args, options);

    backendProcess.stdout?.on("data", (data) => {
      console.log(`[Backend] ${data.toString().trim()}`);
    });

    backendProcess.stderr?.on("data", (data) => {
      console.error(`[Backend] ${data.toString().trim()}`);
    });

    backendProcess.on("error", (err) => {
      console.error("[Backend] Failed to start:", err.message);
    });

    backendProcess.on("close", (code) => {
      console.log(`[Backend] Exited with code ${code}`);
      backendProcess = null;
    });

    console.log("[Backend] Starting backend server...");
  } catch (err) {
    console.error("[Backend] Failed to spawn:", err.message);
  }
}

function stopBackend() {
  if (backendProcess) {
    console.log("[Backend] Stopping...");
    backendProcess.kill();
    backendProcess = null;
  }
}

// ── App Lifecycle ──────────────────────────────────────────────

app.whenReady().then(() => {
  // In dev, backend is started by concurrently (npm run electron:dev).
  // In production (packaged app), we start it ourselves.
  if (!isDev) {
    startBackend();
  }

  // Register IPC handlers for the opencut bridge (dialog, fs, shell)
  registerIpcHandlers();

  // Setup auto-updater (production only — no updates in dev)
  if (!isDev) {
    try {
      const { setupUpdater } = require("./updater.cjs");
      setupUpdater();
      console.log("[Updater] Auto-updater initialized");
    } catch (err) {
      console.error("[Updater] Failed to initialize:", err.message);
    }
  }

  // Give backend a moment to start, then create window
  setTimeout(
    () => {
      createWindow();
    },
    isDev ? 0 : 1500,
  ); // In dev, Vite is already running

  app.on("activate", () => {
    // macOS: re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  stopBackend();
  // On macOS, apps stay active until Cmd+Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  stopBackend();
  if (!isDev) {
    try {
      const { teardownUpdater } = require("./updater.cjs");
      teardownUpdater();
    } catch {
      /* ok */
    }
  }
});
