import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useSpaceStore } from '../../stores/space.store'

export default function ContextMeter() {
  const currentSpace = useSpaceStore(s => s.currentSpace)
  const [used, setUsed] = useState(0)
  const limit = currentSpace?.context_window_limit ?? 500

  useEffect(() => {
    if (!currentSpace) return
    setUsed(currentSpace.context_window_used ?? 0)
    const ch = supabase
      .channel('context-meter')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'spaces',
        filter: 'id=eq.' + currentSpace.id
      }, payload => {
        setUsed(payload.new.context_window_used)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [currentSpace?.id])

  const pct = Math.min((used / limit) * 100, 100)
  const barColor = pct > 90
    ? 'linear-gradient(90deg, rgba(239,68,68,0.8), rgba(220,38,38,0.8))'
    : pct > 70
    ? 'linear-gradient(90deg, rgba(251,191,36,0.8), rgba(245,158,11,0.8))'
    : 'linear-gradient(90deg, rgba(139,92,246,0.8), rgba(26,159,255,0.8))'

  const textColor = pct > 90
    ? 'rgba(239,68,68,0.7)'
    : pct > 70
    ? 'rgba(251,191,36,0.7)'
    : 'rgba(139,92,246,0.5)'

  return (
    <div className='px-4 py-3' style={{ borderTop: '1px solid rgba(139,92,246,0.06)' }}>
      <div className='flex justify-between text-[10px] font-body mb-1.5' style={{ color: textColor }}>
        <span>Context window</span>
        <span>{used.toLocaleString()} / {limit.toLocaleString()}</span>
      </div>
      <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: pct + '%',
            background: barColor,
            boxShadow: pct > 70 ? `0 0 8px ${pct > 90 ? 'rgba(239,68,68,0.5)' : 'rgba(251,191,36,0.5)'}` : 'none',
          }}
        />
      </div>
      {pct > 90 && (
        <p className="text-[10px] font-body mt-1.5" style={{ color: 'rgba(239,68,68,0.6)' }}>
          Auto-reset incoming
        </p>
      )}
    </div>
  )
}