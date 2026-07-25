type ToastTone = 'success' | 'error' | 'info'
interface Toast {
  id: number
  message: string
  tone: ToastTone
}

export function useToast() {
  const toasts = useState<Toast[]>('app-toasts', () => [])

  function show(message: string, tone: ToastTone = 'info') {
    const id = Date.now() + Math.random()
    toasts.value.push({ id, message, tone })
    setTimeout(() => {
      toasts.value = toasts.value.filter(item => item.id !== id)
    }, 4200)
  }

  return {
    toasts,
    success: (message: string) => show(message, 'success'),
    error: (message: string) => show(message, 'error'),
    info: (message: string) => show(message, 'info')
  }
}
