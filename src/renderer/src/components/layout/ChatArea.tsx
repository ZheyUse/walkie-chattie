import MessageList from "../chat/MessageList"
import ChatInput from "../chat/ChatInput"
import TypingIndicator from "../chat/TypingIndicator"
import { useSpaceStore } from "../../stores/space.store"

export default function ChatArea() {
  const currentSpace = useSpaceStore(s => s.currentSpace)

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(20, 26, 46, 0.4) 0%, rgba(13, 17, 27, 0.8) 100%)' }}>
      {/* Subtle atmospheric header */}
      <div className="h-10 flex-shrink-0 flex items-center px-4 gap-3 border-b" style={{ borderColor: 'rgba(139, 92, 246, 0.08)' }}>
        {currentSpace && (
          <>
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center text-xs leading-none border"
              style={{
                borderColor: 'rgba(139, 92, 246, 0.25)',
                background: 'rgba(139, 92, 246, 0.08)',
                color: 'rgba(139, 92, 246, 0.7)',
                fontSize: '0.7rem',
              }}
            >
              {currentSpace.avatar_emoji}
            </div>
            <span className="text-text-md text-xs font-display font-medium tracking-wide">{currentSpace.name}</span>
            <div className="ml-auto flex items-center gap-1.5">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: 'rgba(139, 92, 246, 0.5)', boxShadow: '0 0 6px rgba(139, 92, 246, 0.5)' }}
              />
              <span className="text-text-lo text-[11px]">live</span>
            </div>
          </>
        )}
      </div>
      <MessageList />
      <TypingIndicator />
      <ChatInput />
    </div>
  )
}