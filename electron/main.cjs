/**
 * FreeCut — Electron Main Process
 *
 * Minimal wrapper that loads the web app in a BrowserWindow.
 * Auto-update support via electron-updater (checks GitHub Releases).
 *
 * In development: loads from Vite dev server (http://localhost:5173)
 * In production:  loads from the built dist/ folder + auto-updates
 */

const { app, BrowserWindow, shell } = require("electron");
const path = require("path");
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

/**
 * Start the Python backend process.
 * In production, the backend is bundled alongside the app.
 */
function startBackend() {
  const backendDir = path.join(__dirname, "../backend");

  try {
    backendProcess = spawn("uv", ["run", "python", "main.py"], {
      cwd: backendDir,
      stdio: "pipe",
      shell: true,
    });

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

    console.log("[Backend] Starting Python backend...");
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
