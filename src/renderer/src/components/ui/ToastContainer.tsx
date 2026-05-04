import { useToastStore } from '../../lib/toast'

export default function ToastContainer() {
  const { toasts, remove } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className='fixed bottom-6 right-6 z-50 flex flex-col gap-2'>
      {toasts.map((t) => (
        <div
          key={t.id}
          className='flex items-center gap-2 px-4 py-2.5 bg-bg-surface border border-border-md rounded-card shadow-xl text-text-hi text-xs font-body animate-fade-in'
        >
          <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' className='text-accent flex-shrink-0'>
            <path d='M20 6 9 17l-5-5' />
          </svg>
          <span>{t.msg}</span>
          <button onClick={() => remove(t.id)} className='ml-1 text-text-lo hover:text-text-hi'>
            <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round'>
              <path d='M18 6 6 18M6 6l12 12' />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}