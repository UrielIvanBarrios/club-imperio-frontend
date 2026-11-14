import { Box, Breadcrumbs, Link, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router'

export interface Miga {
  label: string
  to?: string // sin `to` es la página actual (no es link)
}

interface Props {
  titulo: string
  migas?: Miga[]
  acciones?: ReactNode
}

// Encabezado común: breadcrumbs, título y botones a la derecha.
export function PageHeader({ titulo, migas, acciones }: Props) {
  return (
    <Box sx={{ mb: 3 }}>
      {migas && (
        <Breadcrumbs sx={{ mb: 1 }}>
          {migas.map((m) =>
            m.to ? (
              <Link key={m.label} component={RouterLink} to={m.to} underline="hover" color="inherit">
                {m.label}
              </Link>
            ) : (
              <Typography key={m.label} color="text.primary">
                {m.label}
              </Typography>
            ),
          )}
        </Breadcrumbs>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          {titulo}
        </Typography>
        {acciones && <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>{acciones}</Box>}
      </Box>
    </Box>
  )
}
