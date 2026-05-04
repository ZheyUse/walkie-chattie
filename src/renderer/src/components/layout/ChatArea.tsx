import { useState } from "react"
import MessageList from "../chat/MessageList"
import ChatInput from "../chat/ChatInput"
import TypingIndicator from "../chat/TypingIndicator"
import { useSpaceStore } from "../../stores/space.store"
import { useChatStore } from "../../stores/chat.store"

export default function ChatArea() {
  const [dragging, setDragging] = useState(false)
  const currentSpace = useSpaceStore(s => s.currentSpace)
  const setPendingImage = useChatStore(s => s.setPendingImage)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear dragging if we've left the chat area entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragging(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("image/")) {
      setPendingImage(file)
    }
  }

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden relative"
      style={{ background: 'linear-gradient(180deg, rgba(20, 26, 46, 0.4) 0%, rgba(13, 17, 27, 0.8) 100%)' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
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

      {/* Full-panel drag-and-drop overlay */}
      {dragging && (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 rounded-2xl pointer-events-none"
          style={{ background: 'rgba(10, 13, 24, 0.88)', backdropFilter: 'blur(4px)', border: '2px dashed rgba(139, 92, 246, 0.6)' }}
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(139,92,246,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              <path d="M12 12v9M9 18l3-3 3 3"/>
            </svg>
          </div>
          <p className="font-display text-sm" style={{ color: 'rgba(139, 92, 246, 0.9)' }}>Drop image to upload</p>
        </div>
      )}
    </div>
  )
}