import { Chip } from '@mui/material'
import { vencida } from '../schema'
import type { ClasePrueba } from '../types'

// Asistió / Pendiente. Si la fecha ya pasó y nadie la marcó, se avisa: para el back sigue pendiente.
export function ChipEstadoClase({ clase }: { clase: ClasePrueba }) {
  if (clase.asistio) return <Chip size="small" color="success" label="Asistió" />
  if (vencida(clase)) return <Chip size="small" color="error" variant="outlined" label="Pendiente · ya pasó la fecha" />
  return <Chip size="small" color="warning" label="Pendiente" />
}
