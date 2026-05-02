const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'

export function generateId(length = 10): string {
  return Array.from({ length }, () =>
    CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join('')
}
