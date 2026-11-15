import { Box, Typography } from '@mui/material'
import { notas } from '../schema'
import type { ClasePrueba } from '../types'

// Las observaciones de una clase, una nota por línea (el back las guarda juntas, separadas por " | Nota: ")
export function Notas({ clase, vacio = '—' }: { clase: ClasePrueba; vacio?: string }) {
  const lista = notas(clase)
  if (lista.length === 0) return <Typography variant="body2" color="text.secondary">{vacio}</Typography>
  return (
    <Box component="ul" sx={{ m: 0, pl: 2.5 }} aria-label="Observaciones">
      {lista.map((n, i) => (
        <Typography component="li" variant="body2" key={i}>{n}</Typography>
      ))}
    </Box>
  )
}
