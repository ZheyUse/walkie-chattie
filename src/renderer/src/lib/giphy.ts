import { GiphyFetch } from '@giphy/js-fetch-api'

const GIPHY_KEY = import.meta.env.VITE_GIPHY_KEY as string
const gf = new GiphyFetch(GIPHY_KEY)

export interface GiphyGif {
  id: string
  title: string
  url: string
  preview: string
}

export async function searchGifs(query: string, limit = 20): Promise<GiphyGif[]> {
  try {
    const { data } = await gf.search(query, { limit, rating: 'pg-13' })
    return data.map(formatGif)
  } catch {
    return []
  }
}

export async function getTrendingGifs(limit = 20): Promise<GiphyGif[]> {
  try {
    const { data } = await gf.trending({ limit, rating: 'pg-13' })
    return data.map(formatGif)
  } catch {
    return []
  }
}

function formatGif(g: any): GiphyGif {
  return {
    id: g.id,
    title: g.title || '',
    url: g.images?.original?.url ?? g.images?.fixed_width?.url ?? '',
    preview: g.images?.fixed_width_small?.url ?? g.images?.fixed_height_small?.url ?? g.images?.original?.url ?? '',
  }
}