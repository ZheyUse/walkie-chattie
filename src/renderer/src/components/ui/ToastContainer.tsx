import 'material-symbols'
import { useToastStore } from '../../lib/toast'

export default function ToastContainer() {
  const { toasts, remove } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className='fixed bottom-6 right-6 z-50 flex flex-col gap-2'>
      {toasts.map((t) => (
        <div
          key={t.id}
          className='flex items-center gap-2.5 px-4 py-2.5 text-sm font-body animate-fade-in rounded-xl'
          style={{
            background: 'rgba(19,25,41,0.95)',
            border: '1px solid rgba(139,92,246,0.2)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(16px)',
            color: 'rgba(232,234,237,0.85)',
          }}
        >
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(139,92,246,0.15)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '11px', color: 'rgba(139,92,246,0.8)' }}>check</span>
          </div>
          <span>{t.msg}</span>
          <button
            onClick={() => remove(t.id)}
            className='ml-1 p-0.5 rounded-lg transition-colors'
            style={{ color: 'rgba(90,100,120,0.5)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>close</span>
          </button>
        </div>
      ))}
    </div>
  )
}