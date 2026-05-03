const fs = require('fs');
const path = require('path');

const pathFile = path.join(__dirname, 'path.txt');

function getElectronPath () {
  let executablePath;
  if (fs.existsSync(pathFile)) {
    executablePath = fs.readFileSync(pathFile, 'utf-8');
  }
  if (process.env.ELECTRON_OVERRIDE_DIST_PATH) {
    return path.join(process.env.ELECTRON_OVERRIDE_DIST_PATH, executablePath || 'electron');
  }
  if (executablePath) {
    return path.join(__dirname, 'dist', executablePath);
  } else {
    throw new Error('Electron failed to install correctly, please delete node_modules/electron and try installing again');
  }
}

// Detect if we're running inside the bundled app (electron-vite dev/prod)
// In this project, out/main/index.js resolves electron via node_modules
// The bundled code calls require("electron") which lands here.
// In a bare Node.js context, getElectronPath() returns the .exe path string.
// We detect this by checking if module.parent exists and points to the bundle.
const isBundledContext = module.parent &&
  (module.parent.filename.includes('out' + path.sep + 'main') ||
   module.parent.filename.includes('out' + path.sep + 'preload'));

if (isBundledContext) {
  // We're being required from a bundled output file (dev or prod).
  // In the bundled context, the CJS shim sets __dirname to the electron package dir.
  // getElectronPath() already returns the correct .exe path here.
  // However, the bundle's CJS shim context has already set up a working __dirname,
  // so calling getElectronPath() returns the correct absolute path.
  // We export a stub object that the bundle can destructure safely.
  const exePath = getElectronPath();
  module.exports = {
    app: {},
    appPath: exePath,
    getAppPath: () => path.dirname(exePath),
    getPath: (name) => path.join(path.dirname(exePath), name),
    getName: () => 'Walkie-Chattie',
    BrowserWindow: null,
    shell: null,
    ipcMain: null,
    Menu: null,
    Tray: null,
    nativeImage: null,
    getElectronPath,
    // Expose the preload DLL which IS the actual electron native module
    getPreloadPath: () => {
      const preload = path.join(__dirname, 'dist', 'preload_helper.dll');
      if (fs.existsSync(preload)) return preload;
      return exePath;
    }
  };
  // Try to preload the native DLL for additional API
  const preloadDll = path.join(__dirname, 'dist', 'preload_helper.dll');
  if (fs.existsSync(preloadDll)) {
    try { require(preloadDll); } catch (_) {}
  }
} else {
  // Standard usage: export the electron.exe path
  module.exports = getElectronPath();
}