import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const globalFetchWithTimeout = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const controller = new AbortController()
  const id = window.setTimeout(() => controller.abort(), 15000)
  return fetch(input, { ...init, signal: controller.signal })
    .finally(() => window.clearTimeout(id))
}

class FetchAbortError extends Error {
  constructor() {
    super("fetch aborted by timeout")
    this.name = "AbortError"
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: globalFetchWithTimeout },
})
