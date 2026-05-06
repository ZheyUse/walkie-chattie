import { resolve } from "path"
import { defineConfig, externalizeDepsPlugin } from "electron-vite"
import react from "@vitejs/plugin-react"
import fs from "fs"
import pkg from "./package.json"

function copyElectronPath(): void {
  const src = resolve(__dirname, "node_modules/electron/path.txt")
  try {
    fs.mkdirSync(resolve(__dirname, "out/main"), { recursive: true })
    fs.copyFileSync(src, resolve(__dirname, "out/main/path.txt"))
    fs.mkdirSync(resolve(__dirname, "out/preload"), { recursive: true })
    fs.copyFileSync(src, resolve(__dirname, "out/preload/path.txt"))
  } catch {}
}

export default defineConfig({
  main: {
    plugins: [
      { name: "copy-electron", closeBundle() { copyElectronPath() } },
      externalizeDepsPlugin(),
    ],
    build: {
      rollupOptions: { output: { format: "cjs", entryFileNames: "index.js" } },
    },
  },
  preload: {
    plugins: [
      { name: "copy-electron-preload", closeBundle() { copyElectronPath() } },
      externalizeDepsPlugin(),
    ],
    build: {
      rollupOptions: { output: { format: "cjs", entryFileNames: "index.js" } },
    },
  },
  renderer: {
    root: resolve(__dirname, "src/renderer"),
    server: { port: 5174, strictPort: true },
    define: {
      "import.meta.env.VITE_APP_VERSION": JSON.stringify(pkg.version),
    },
    build: { rollupOptions: { input: { index: resolve(__dirname, "src/renderer/index.html") } } },
    plugins: [react()],
  },
})
