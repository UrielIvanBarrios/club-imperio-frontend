import { createContext, useContext } from 'react'

export interface Toast {
  exito: (mensaje: string) => void
  error: (mensaje: string) => void
}

export const ToastContext = createContext<Toast | null>(null)

// Uso: const toast = useToast(); toast.exito('Persona creada')
export function useToast(): Toast {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast se usa dentro de <ToastProvider>')
  return ctx
}
