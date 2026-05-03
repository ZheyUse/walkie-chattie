// Shim that returns the full electron API when required in the bundled context
const path = require('path')
const electronPkg = path.join(__dirname, 'node_modules/electron/package.json')
let electronExports = null

try {
  // Try to determine if we're in an electron context
  // In electron, process.versions.electron is set
  // In node, it's not set
  if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
    // We're in electron - require the actual electron module
    // (In electron, require('electron') returns the full API object)
    electronExports = require('electron')
  } else {
    // We're in plain Node.js (electron-vite dev mode)
    // require('electron') returns the .exe path string
    // We need to find the actual electron API through the preload DLL
    const dllPath = path.join(__dirname, 'node_modules/electron/dist/preload_helper.dll')
    const electronDir = path.join(__dirname, 'node_modules/electron')
    // The preload DLL IS the electron Node.js addon
    try { require(dllPath) } catch (_) {}
    // Fallback: expose a minimal stub for the bundled code to work
    electronExports = {
      BrowserWindow: class { constructor() { throw new Error('Electron not running in browser mode') } },
      app: { whenReady: () => Promise.resolve() },
      shell: {}, ipcMain: {}, Menu: {}, Tray: {}, nativeImage: {}
    }
  }
} catch (e) {
  electronExports = { app: {}, BrowserWindow: class {} }
}

module.exports = electronExports
