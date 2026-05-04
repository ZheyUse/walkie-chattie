import 'material-symbols'
import { useSpaceStore } from "../../stores/space.store"

export default function TitleBar() {
  const currentSpace = useSpaceStore(s => s.currentSpace)
  const members = useSpaceStore(s => s.members)
  const settingsOpen = useSpaceStore(s => s.settingsPanelOpen)
  const toggleSettings = useSpaceStore(s => s.toggleSettings)

  return (
    <div
      className="h-[42px] flex items-center justify-between px-4 select-none relative"
      style={{
        background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.06) 0%, transparent 100%)',
        borderBottom: '1px solid',
        borderImageSource: 'linear-gradient(90deg, transparent 0%, rgba(139, 92, 246, 0.2) 50%, transparent 100%)',
        borderImageSlice: 1,
        borderBottomColor: 'rgba(139, 92, 246, 0.15)',
      }}
    >
      {/* Drag region */}
      <div className="flex items-center gap-3 flex-1" style={{ WebkitAppRegion: "drag" }}>
        {/* App logo mark */}
        <div className="flex items-center justify-center w-7 h-7 rounded-lg overflow-hidden p-0"
          style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #1a9fff 100%)', WebkitAppRegion: 'no-drag' }}>
          <img
            src="/resources/icons/icon-32.png"
            alt="Walkie-Chattie"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Brand name with gradient */}
        <div className="flex items-baseline gap-1">
          <span
            className="font-display font-bold tracking-wider text-sm leading-none"
            style={{
              background: 'linear-gradient(90deg, #e8eaed 0%, rgba(139, 92, 246, 0.9) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            WALKIE
          </span>
          <span className="text-text-lo font-display font-bold text-sm">-</span>
          <span
            className="font-display font-bold tracking-wider text-sm leading-none"
            style={{
              background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.9) 0%, rgba(26, 159, 255, 0.8) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            CHATTIE
          </span>
        </div>

        {currentSpace && (
          <>
            <div className="w-px h-4 bg-border-lo" />
            <div className="flex items-center gap-1.5">
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center text-xs leading-none border"
                style={{
                  borderColor: 'rgba(139, 92, 246, 0.3)',
                  background: 'rgba(139, 92, 246, 0.1)',
                  color: 'rgba(139, 92, 246, 0.8)',
                  fontSize: '0.7rem',
                }}
              >
                {currentSpace.avatar_emoji}
              </div>
              <span className="text-text-hi text-xs font-display font-medium">{currentSpace.name}</span>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-1" style={{ WebkitAppRegion: "no-drag" }}>
        {currentSpace && (
          <div className="flex items-center gap-1.5 mr-2">
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                boxShadow: '0 0 6px 0 rgba(139, 92, 246, 0.6)',
              }}
            />
            <span className="text-text-lo text-xs">{members.length} members</span>
          </div>
        )}
        {currentSpace && (
          <button
            onClick={toggleSettings}
            title="Settings"
            className={
              'w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 ' +
              (settingsOpen
                ? 'bg-accent-purple/20 text-accent-purple'
                : 'text-text-lo hover:text-text-hi hover:bg-bg-hover')
            }
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'currentColor' }}>settings</span>
          </button>
        )}
      </div>
    </div>
  )
}