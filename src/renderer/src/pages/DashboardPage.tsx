import { useSpaceStore } from '../stores/space.store'
import TitleBar from '../components/layout/TitleBar'
import SpacePanel from '../components/layout/SpacePanel'
import ChatArea from '../components/layout/ChatArea'
import SettingsPanel from '../components/layout/SettingsPanel'

export default function DashboardPage() {
  var settingsOpen = useSpaceStore(s => s.settingsPanelOpen)
  return (
    <div className="h-screen flex flex-col bg-bg-deep overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <SpacePanel />
        <ChatArea />
        <div className={"transition-all duration-200 overflow-hidden " + (settingsOpen ? 'w-72' : 'w-0')}>
          {settingsOpen && <SettingsPanel />}
        </div>
      </div>
    </div>
  )
}