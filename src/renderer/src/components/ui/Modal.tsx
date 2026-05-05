import 'material-symbols'
interface Props {
  open: boolean
  title?: string
  closable?: boolean
  onClose?: () => void
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: React.ReactNode
  footer?: React.ReactNode
  backdropClassName?: string
}

const sizeClasses = {
  sm: 'min-w-72 max-w-sm',
  md: 'min-w-80 max-w-md',
  lg: 'min-w-96 max-w-lg',
  xl: 'min-w-[28rem] max-w-xl',
}

export default function Modal({ open, title, closable, onClose, size = 'md', children, footer, backdropClassName }: Props) {
  if (!open) return null

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${backdropClassName ?? ''}`}>
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(5, 8, 18, 0.75)',
          backdropFilter: 'blur(12px)',
        }}
        onClick={closable ? onClose : undefined}
      />
      {/* Modal content */}
      <div
        className={`relative z-10 rounded-2xl overflow-hidden flex flex-col ${sizeClasses[size]}`}
        style={{
          width: '100%',
          background: 'linear-gradient(135deg, rgba(19,25,41,0.98) 0%, rgba(13,17,27,0.98) 100%)',
          border: '1px solid rgba(139,92,246,0.2)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,92,246,0.08), inset 0 1px 0 rgba(255,255,255,0.07)',
        }}
      >
        {/* Header */}
        {(title || closable) && (
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            {title
              ? <h3 className="font-display font-bold text-base" style={{ color: 'rgba(232,234,237,0.9)' }}>{title}</h3>
              : <span />}
            {closable && (
              <button
                onClick={onClose}
                className="w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-150 hover:bg-white/[0.06]"
                style={{ color: 'rgba(90,100,120,0.6)' }}
                title="Close"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>close</span>
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="px-5 pb-5 flex-1">
          {children}
        </div>

        {/* Footer actions */}
        {footer && (
          <div className="px-5 pb-5 pt-1 flex gap-2 justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}