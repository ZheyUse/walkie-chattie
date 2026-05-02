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
  const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-accent'

  return (
    <div className='px-4 py-3 border-t border-border-lo'>
      <div className='flex justify-between text-xs text-text-lo mb-1.5'>
        <span>Context Window</span>
        <span>{used} / {limit}</span>
      </div>
      <div className='h-1.5 bg-bg-surface rounded-full overflow-hidden'>
        <div className={'h-full rounded-full transition-all ' + color} style={{ width: pct + '%' }} />
      </div>
      {pct > 90 && <p className='text-xs text-red-400 mt-1.5'>Auto-reset incoming</p>}
    </div>
  )
}