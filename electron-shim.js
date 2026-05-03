// electron-shim.js — Use with ELECTRON_RUN_AS_NODE + ELECTRON_LOAD_INDEX
// When electron runs a .js file, it normally looks for default_app.asar
// ELECTRON_LOAD_INDEX tells it to use the file directly, still exposing the full API
// We require electron properly here, then export everything
const electron = require('electron')
module.exports = electron