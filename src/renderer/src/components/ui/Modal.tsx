interface Props {
  open: boolean
  title?: string
  closable?: boolean
  onClose?: () => void
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: React.ReactNode
  footer?: React.ReactNode
}

const sizeClasses = {
  sm: 'min-w-72 max-w-sm',
  md: 'min-w-80 max-w-md',
  lg: 'min-w-96 max-w-lg',
  xl: 'min-w-[28rem] max-w-xl',
}

export default function Modal({ open, title, closable, onClose, size = 'md', children, footer }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-bg-deep/80 backdrop-blur-sm"
        onClick={closable ? onClose : undefined}
      />
      <div className={`relative z-10 bg-bg-panel border border-border-md rounded-modal shadow-2xl flex flex-col ${sizeClasses[size]}`}
        style={{ width: '100%' }}
      >
        {/* Header */}
        {(title || closable) && (
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            {title
              ? <h3 className="font-display font-bold text-text-hi">{title}</h3>
              : <span />}
            {closable && (
              <button
                onClick={onClose}
                className="w-6 h-6 rounded text-text-lo hover:text-text-hi hover:bg-bg-hover flex items-center justify-center transition-colors"
                title="Close"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
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