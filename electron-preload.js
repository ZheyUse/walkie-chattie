// Patches Node.js module resolution so that `require("electron")` resolves
// to the electron package (not its binary path) before any CJS wrappers run.
// Must be loaded with --require BEFORE electron's index.js executes.

const Module = require('module')
const path = require('path')
const fs = require('fs')

const electronPkg = path.join(__dirname, '..', 'node_modules', 'electron', 'package.json')
const electronMain = path.join(__dirname, '..', 'node_modules', 'electron', 'index.js')

if (fs.existsSync(electronMain)) {
  const originalResolve = Module._resolveFilename
  Module._resolveFilename = function (request, parent, isMain, options) {
    if (request === 'electron') {
      return electronMain
    }
    return originalResolve(request, parent, isMain, options)
  }
}