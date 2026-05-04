const TENOR_KEY = import.meta.env.VITE_TENOR_KEY as string
const BASE = 'https://tenor.googleapis.com/v2'

export interface TenorGif {
  id: string
  title: string
  url: string
  dims: [number, number]
  preview: string
}
export interface TenorResult {
  id: string
  title: string
  media_formats: {
    gif: { url: string; dims: [number, number] }
    tinygif: { url: string; dims: [number, number] }
    mediumgif: { url: string; dims: [number, number] }
  }
}

let trendingCache: { gifs: TenorGif[]; ts: number } | null = null

export async function searchGifs(query: string, limit = 20): Promise<TenorGif[]> {
  const res = await fetch(
    `${BASE}/search?q=${encodeURIComponent(query)}&key=${TENOR_KEY}&limit=${limit}&media_filter=gif`
  )
  const data = await res.json()
  if (!data.results) return []
  return (data.results as TenorResult[]).map(formatGif)
}

export async function getTrendingGifs(limit = 20): Promise<TenorGif[]> {
  const now = Date.now()
  if (trendingCache && now - trendingCache.ts < 5 * 60 * 1000) {
    return trendingCache.gifs
  }
  const res = await fetch(
    `${BASE}/featured?key=${TENOR_KEY}&limit=${limit}&media_filter=gif`
  )
  const data = await res.json()
  if (!data.results) return []
  const gifs = (data.results as TenorResult[]).map(formatGif)
  trendingCache = { gifs, ts: now }
  return gifs
}

function formatGif(r: TenorResult): TenorGif {
  return {
    id: r.id,
    title: r.title,
    url: r.media_formats.gif?.url ?? r.media_formats.tinygif?.url ?? '',
    dims: r.media_formats.gif?.dims ?? r.media_formats.tinygif?.dims ?? [200, 200],
    preview: r.media_formats.tinygif?.url ?? r.media_formats.mediumgif?.url ?? r.media_formats.gif?.url ?? ''
  }
}
