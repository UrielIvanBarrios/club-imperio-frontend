import { Chip, Typography } from '@mui/material'
import { formatFecha } from '../../../lib/format'

// El estado viene como el booleano `activo`; si es una baja, se muestra desde cuándo
export function ChipEstadoInscripcion({ activo, fechaBaja }: { activo: boolean; fechaBaja: string | null }) {
  if (activo) return <Chip label="Activa" color="success" size="small" variant="outlined" />
  return (
    <>
      <Chip label="Dada de baja" size="small" />
      {fechaBaja && <Typography variant="body2" color="text.secondary">el {formatFecha(fechaBaja)}</Typography>}
    </>
  )
}
