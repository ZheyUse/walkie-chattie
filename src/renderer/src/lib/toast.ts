import { create } from 'zustand'

interface Toast {
  id: number
  msg: string
}

interface ToastState {
  toasts: Toast[]
  add: (msg: string) => void
  remove: (id: number) => void
}

const timers: Record<number, ReturnType<typeof setTimeout>> = {}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (msg) => {
    const id = Date.now()
    set((s) => ({ toasts: [...s.toasts, { id, msg }] }))
    timers[id] = setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) }))
      delete timers[id]
    }, 2800)
  },
  remove: (id) => {
    clearTimeout(timers[id])
    delete timers[id]
    set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) }))
  },
}))

export const toast = (msg: string) => useToastStore.getState().add(msg)