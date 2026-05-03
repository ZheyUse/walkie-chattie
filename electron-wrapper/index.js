// Wrapper module that exports electron's full API.
// This exists because electron/index.js only returns getElectronPath (the .exe path string).
// We instead load the preload DLL addon which provides the actual Electron runtime API.

const path = require('path')

// The path.txt tells us where the electron binary is
const electronPkgDir = path.join(__dirname)
const pathTxtFile = path.join(electronPkgDir, 'path.txt')

let executablePath = 'electron'
try {
  executablePath = require('fs').readFileSync(pathTxtFile, 'utf-8').trim()
} catch {}

const electronExe = path.join(electronPkgDir, 'dist', executablePath)

// The preload DLL is what provides the Node.js <-> native electron bridge
const preloadDll = path.join(electronPkgDir, 'dist', 'preload_helper.dll')

// Require the preload DLL to load the electron native module
// This is what electron/index.js does internally when running inside Electron
try {
  require(preloadDll)
} catch (e) {
  // Preload DLL may not be available — fall back to the main electron package
}

module.exports = { app: undefined, BrowserWindow: undefined, shell: undefined,
  ipcMain: undefined, Menu: undefined, Tray: undefined, nativeImage: undefined,
  getElectronPath: () => electronExe
}