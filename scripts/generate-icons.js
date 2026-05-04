/**
 * Generates PNG icons from resources/icons/icon.svg using sharp.
 * Run: node scripts/generate-icons.js
 */
const sharp = require('sharp')
const { readFileSync, writeFileSync, mkdirSync } = require('fs')
const path = require('path')

const svgPath = path.join(__dirname, '../resources/icons/icon.svg')
const outDir = path.join(__dirname, '../resources/icons')
const publicDir = path.join(__dirname, '../src/renderer/public/resources/icons')
mkdirSync(outDir, { recursive: true })
mkdirSync(publicDir, { recursive: true })

const sizes = [
  { name: 'icon-16.png',  size: 16  },
  { name: 'icon-32.png',  size: 32  },
  { name: 'icon-64.png',  size: 64  },
  { name: 'icon-128.png', size: 128 },
  { name: 'icon-256.png', size: 256 },
  { name: 'icon-512.png', size: 512 },
]

;(async () => {
  for (const { name, size } of sizes) {
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(path.join(outDir, name))

    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(path.join(publicDir, name))

    console.log(`Generated: ${name} (${size}x${size})`)
  }

  // Copy SVG to public for debug page
  writeFileSync(path.join(publicDir, 'icon.svg'), readFileSync(svgPath, 'utf8'))
  console.log(`\nAll icons from real SVG in: ${outDir}`)
})()