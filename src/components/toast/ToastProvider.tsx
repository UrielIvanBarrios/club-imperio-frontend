import { Alert, Snackbar } from '@mui/material'
import { useMemo, useState, type ReactNode } from 'react'
import { ToastContext, type Toast } from './ToastContext'

interface Mensaje {
  id: number
  texto: string
  severidad: 'success' | 'error'
}

// Un solo Snackbar para toda la app: cualquier pantalla dispara un toast con useToast().
export function ToastProvider({ children }: { children: ReactNode }) {
  const [mensaje, setMensaje] = useState<Mensaje | null>(null)
  const [abierto, setAbierto] = useState(false)

  const toast = useMemo<Toast>(() => {
    const mostrar = (texto: string, severidad: Mensaje['severidad']) => {
      setMensaje({ id: Date.now(), texto, severidad })
      setAbierto(true)
    }
    return { exito: (t) => mostrar(t, 'success'), error: (t) => mostrar(t, 'error') }
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <Snackbar
        key={mensaje?.id}
        open={abierto}
        autoHideDuration={4000}
        onClose={(_, motivo) => motivo !== 'clickaway' && setAbierto(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={mensaje?.severidad} variant="filled" onClose={() => setAbierto(false)} sx={{ width: '100%' }}>
          {mensaje?.texto}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  )
}
