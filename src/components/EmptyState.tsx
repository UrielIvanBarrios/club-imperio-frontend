import InboxIcon from '@mui/icons-material/Inbox'
import { Box, Typography } from '@mui/material'
import type { ReactNode } from 'react'

interface Props {
  titulo: string
  descripcion?: string
  accion?: ReactNode
}

// Estado "no hay datos": en vez de una tabla en blanco, un mensaje y qué hacer.
export function EmptyState({ titulo, descripcion, accion }: Props) {
  return (
    <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
      <InboxIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
      <Typography variant="h6" sx={{ mt: 1 }}>
        {titulo}
      </Typography>
      {descripcion && <Typography color="text.secondary">{descripcion}</Typography>}
      {accion && <Box sx={{ mt: 2 }}>{accion}</Box>}
    </Box>
  )
}
