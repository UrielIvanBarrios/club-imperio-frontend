import { Chip } from '@mui/material'

export function ChipEstadoComision({ activa }: { activa: boolean }) {
  return activa ? <Chip label="Activa" color="success" size="small" variant="outlined" /> : <Chip label="Inactiva" size="small" />
}
