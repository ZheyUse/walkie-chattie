import { useSpaceStore } from "../../stores/space.store"

export default function TitleBar() {
  const currentSpace = useSpaceStore(s => s.currentSpace)
  const members = useSpaceStore(s => s.members)
  const settingsOpen = useSpaceStore(s => s.settingsPanelOpen)
  const toggleSettings = useSpaceStore(s => s.toggleSettings)

  return (
    <div className="h-[38px] bg-bg-deep border-b border-border-lo flex items-center justify-between px-3 select-none"
      style={{ WebkitAppRegion: "drag" }}>
      <div className="flex items-center gap-2">
        <span className="text-lg font-display">WALKIE<span className="text-accent">-</span>CHATTIE</span>
        {currentSpace && (
          <><span className="text-border-md">|</span>
          <span className="text-text-md text-sm font-display">{currentSpace.avatar_emoji} {currentSpace.name}</span></>
        )}
      </div>
      <div className="flex items-center gap-1" style={{ WebkitAppRegion: "no-drag" }}>
        {currentSpace && (
          <div className="flex items-center gap-1.5 mr-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-text-lo text-xs">{members.length} online</span>
          </div>
        )}
        {currentSpace && (
          <button onClick={toggleSettings}
            title="Settings"
            className={"w-7 h-7 rounded flex items-center justify-center transition-all " + (settingsOpen ? "bg-accent/20 text-accent" : "text-text-lo hover:text-text-hi hover:bg-bg-hover")}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}