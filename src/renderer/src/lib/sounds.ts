import { debugLog } from './debug'

const BASE = '/resources/sound-effects'

const cache = new Map<string, HTMLAudioElement>()

function getAudio(name: string): HTMLAudioElement {
  if (cache.has(name)) return cache.get(name)!
  const audio = new Audio(`${BASE}/${name}.mp3`)
  audio.volume = 0.7
  cache.set(name, audio)
  return audio
}

export function playSound(name: 'notification' | 'sent' | 'shout' | 'tap') {
  const audio = getAudio(name)
  audio.currentTime = 0
  audio.play().then(() => {
    debugLog({ source: "sound", level: "success" as const, message: `playSound '${name}' — SUCCESS`, details: { name, src: `${BASE}/${name}.mp3` } })
  }).catch((err) => {
    debugLog({ source: "sound", level: "error", message: `playSound '${name}' — FAILED`, details: { name, error: err?.message ?? err } })
  })
}