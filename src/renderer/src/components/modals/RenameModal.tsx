import { useState } from "react"
import Modal from "../ui/Modal"

interface Props {
  oldName: string
  newName: string
  onConfirm: () => void
  onClose: () => void
}

export default function RenameModal({ oldName, newName, onConfirm, onClose }: Props) {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
      onClose()
    }
  }

  return (
    <Modal open onClose={onClose} title="Rename Space" closable size="lg"
      footer={
        <>
          <button onClick={onClose} className="input-field text-sm px-3 py-1.5" disabled={loading}>Cancel</button>
          <button onClick={handleConfirm} className="btn-primary text-sm px-3 py-1.5" disabled={loading}>
            {loading ? 'Renaming...' : 'Rename'}
          </button>
        </>
      }
    >
      <p className="text-sm text-text-lo font-body">
        Are you sure you want to rename{' '}
        <span className="font-semibold text-text-hi">{oldName}</span>{' '}
        to <span className="font-semibold text-accent">{newName}</span>?
      </p>
    </Modal>
  )
}