import 'material-symbols'
import { useState } from 'react'
import { useSpaceStore } from "../../stores/space.store"
import { assetPath } from "../../lib/assets"
import { debugLog } from "../../lib/debug"
import { toast } from "../../lib/toast"

export default function TitleBar() {
  const currentSpace = useSpaceStore(s => s.currentSpace)
  const members = useSpaceStore(s => s.members)
  const settingsOpen = useSpaceStore(s => s.settingsPanelOpen)
  const toggleSettings = useSpaceStore(s => s.toggleSettings)
  const appVersion = import.meta.env.VITE_APP_VERSION

  const [isHoveringVersion, setIsHoveringVersion] = useState(false)
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true)
    toast('Checking for new updates...')
    try {
      const result = await window.api.checkForUpdates()
      debugLog({ source: "updater", message: "Manual check result", details: result })
      if (result.message === "Skipped in dev mode") {
        toast('Update check skipped in development mode')
      } else if (result.updateAvailable) {
        toast(`New update available: v${result.updateVersion}`)
      } else {
        toast('No new updates available')
      }
    } catch (e) {
      debugLog({ level: "error", source: "updater", message: "Update check failed", details: e })
      toast('Failed to check for updates')
    }
    setIsCheckingUpdate(false)
  }

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
            src={assetPath("resources/icons/icon-32.png")}
            alt="Astra"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Brand name with gradient */}
        <div className="flex items-baseline gap-1">
          <span
            className="font-title font-bold tracking-wider text-sm leading-none"
            style={{
              background: 'linear-gradient(90deg, #e8eaed 0%, rgba(139, 92, 246, 0.9) 60%, rgba(26, 159, 255, 0.8) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '0.18em',
            }}
          >
            ASTRA
          </span>
          <span
            className="font-display text-[10px] font-semibold leading-none cursor-pointer transition-all duration-200"
            style={{
              color: isHoveringVersion ? 'rgba(139, 92, 246, 0.9)' : 'rgba(232,234,237,0.38)',
              letterSpacing: '0.06em'
            }}
            onMouseEnter={() => setIsHoveringVersion(true)}
            onMouseLeave={() => setIsHoveringVersion(false)}
            onClick={handleCheckUpdate}
            title="Click to check for updates"
          >
            {isCheckingUpdate ? (
              <span className="flex items-center">
                <span className="material-symbols-outlined animate-spin" style={{ fontSize: '10px' }}>progress_activity</span>
              </span>
            ) : (
              <>v{appVersion}{isHoveringVersion && <span className="ml-0.5 opacity-60">↻</span>}</>
            )}
          </span>
        </div>

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