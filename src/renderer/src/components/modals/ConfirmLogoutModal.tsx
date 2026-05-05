import Modal from "../ui/Modal"

interface Props {
  onConfirm: () => Promise<void>
  onClose: () => void
}

export default function ConfirmLogoutModal({ onConfirm, onClose }: Props) {
  return (
    <Modal open size="md" title="Log out?" closable onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="btn-ghost text-sm px-3">Cancel</button>
          <button
            onClick={onConfirm}
            className="btn-shout text-sm px-3"
          >
            Log out
          </button>
        </>
      }
    >
      <p className="text-sm font-body" style={{ color: 'rgba(232,234,237,0.8)' }}>
        You will need to sign in again to continue.
      </p>
    </Modal>
  )
}
