interface Props { file: File | null; onRemove: () => void }
export default function ImagePreview({ file, onRemove }: Props) {
  if (!file) return null
  var url = URL.createObjectURL(file)
  return (
    <div className="relative inline-block">
      <img src={url} alt="Preview" className="max-h-24 rounded-lg object-contain" />
      <button onClick={onRemove}
        className="absolute -top-2 -right-2 w-5 h-5 bg-bg-deep border border-border-md rounded-full
                   text-text-lo hover:text-shout flex items-center justify-center text-xs">
        ×
      </button>
    </div>
  )
}
