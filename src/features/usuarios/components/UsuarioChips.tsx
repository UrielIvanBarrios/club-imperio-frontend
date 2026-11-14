import { Chip } from '@mui/material'
import type { Rol } from '../types'

export function ChipRol({ rol }: { rol: Rol }) {
  return rol === 'ADMIN' ? <Chip label="ADMIN" color="secondary" size="small" /> : <Chip label="USER" size="small" variant="outlined" />
}

export function ChipEstadoUsuario({ activo }: { activo: boolean }) {
  return activo ? <Chip label="Activo" color="success" size="small" variant="outlined" /> : <Chip label="Inactivo" size="small" />
}
