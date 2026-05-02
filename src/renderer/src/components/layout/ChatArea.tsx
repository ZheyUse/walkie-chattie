import MessageList from "../chat/MessageList"
import ChatInput from "../chat/ChatInput"
import TypingIndicator from "../chat/TypingIndicator"
import { useSpaceStore } from "../../stores/space.store"

export default function ChatArea() {
  const currentSpace = useSpaceStore(s => s.currentSpace)

  return (
    <div className="flex-1 flex flex-col bg-bg-panel overflow-hidden">
      <div className="h-12 border-b border-border-lo flex items-center px-4 gap-2 flex-shrink-0">
        <span className="text-text-lo text-lg">{currentSpace ? currentSpace.avatar_emoji : ""} {currentSpace?.name || "Loading..."}</span>
      </div>
      <MessageList />
      <TypingIndicator />
      <ChatInput />
    </div>
  )
}