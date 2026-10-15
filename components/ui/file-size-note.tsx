import { AlertCircle, CheckCircle2 } from 'lucide-react'

// "850 KB", "3.4 MB"
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`
}

// The message when a chosen file is over its limit, naming both sizes so the
// person knows how much smaller it has to be.
export function fileTooLargeMessage(file: File, maxBytes: number, what = 'file'): string {
  return `That ${what} is ${formatBytes(file.size)}, over the ${formatBytes(maxBytes)} limit. Please choose a smaller one.`
}

// A green line under a chosen (not yet uploaded) file: its name and size
// against the limit, so the person sees it will go through before sending.
export function FileSizeNote({ file, maxBytes }: { file: File | null; maxBytes: number }) {
  if (!file) return null
  const ok = file.size <= maxBytes
  return (
    <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${ok ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
      <span className="min-w-0 truncate">
        {file.name} · {formatBytes(file.size)} of {formatBytes(maxBytes)} {ok ? '' : '(too large)'}
      </span>
    </p>
  )
}
