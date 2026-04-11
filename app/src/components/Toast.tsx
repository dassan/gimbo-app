import { X } from 'lucide-react'

export interface ToastProps {
  message: string
  onDismiss: () => void
}

export default function Toast({ message, onDismiss }: ToastProps) {
  return (
    <div
      role="alert"
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-on-surface px-4 py-3 text-xs text-white shadow-ambient"
    >
      <span className="max-w-xs">{message}</span>
      <button
        aria-label="dismiss"
        onClick={onDismiss}
        className="shrink-0 rounded-full p-0.5 text-white/60 transition-colors hover:text-white"
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  )
}
