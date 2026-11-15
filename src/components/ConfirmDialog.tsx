import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material'
import type { ReactNode } from 'react'

interface Props {
  open: boolean
  titulo: string
  mensaje: ReactNode
  textoConfirmar: string
  textoPendiente: string // ej: "Dando de baja..."
  isPending: boolean
  error?: Error | null
  color?: 'error' | 'primary' // 'primary' para lo que no es destructivo (ej: corregir una asistencia)
  onConfirm: () => void
  onClose: () => void
}

// Modal de confirmación, pensado para acciones destructivas (bajas).
export function ConfirmDialog({ open, titulo, mensaje, textoConfirmar, textoPendiente, isPending, error, color = 'error', onConfirm, onClose }: Props) {
  return (
    // Mientras se ejecuta, no se puede cerrar: el usuario tiene que ver cómo terminó.
    <Dialog open={open} onClose={isPending ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{titulo}</DialogTitle>
      <DialogContent>
        <DialogContentText>{mensaje}</DialogContentText>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error.message}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isPending}>
          Cancelar
        </Button>
        <Button onClick={onConfirm} color={color} variant="contained" disabled={isPending}>
          {isPending ? textoPendiente : textoConfirmar}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
