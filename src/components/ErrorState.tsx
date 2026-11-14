import { Alert, AlertTitle, Button } from '@mui/material'
import type { ReactNode } from 'react'

interface Props {
  error: Error
  titulo?: string
  // Sin onRetry no se muestra el botón (ej: "no existe", reintentar daría lo mismo)
  onRetry?: () => void
  accion?: ReactNode
}

// Estado "falló la carga": mensaje entendible (el del back) y botón para reintentar.
export function ErrorState({ error, titulo = 'No se pudieron cargar los datos', onRetry, accion }: Props) {
  return (
    <Alert
      severity="error"
      action={
        accion ??
        (onRetry && (
          <Button color="inherit" size="small" onClick={onRetry}>
            Reintentar
          </Button>
        ))
      }
    >
      <AlertTitle>{titulo}</AlertTitle>
      {error.message}
    </Alert>
  )
}
