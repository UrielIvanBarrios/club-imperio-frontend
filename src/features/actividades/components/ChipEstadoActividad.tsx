import { Chip } from '@mui/material'

export function ChipEstadoActividad({ activo }: { activo: boolean }) {
  return activo ? <Chip label="Activa" color="success" size="small" variant="outlined" /> : <Chip label="Inactiva" size="small" />
}
