import { Chip } from '@mui/material'
import type { Persona } from '../types'

export function ChipSocio({ persona }: { persona: Persona }) {
  return persona.esSocioActivo ? (
    <Chip label="Socio" color="primary" size="small" />
  ) : (
    <Chip label="No socio" size="small" variant="outlined" />
  )
}

export function ChipEstado({ persona }: { persona: Persona }) {
  return persona.activo ? (
    <Chip label="Activo" color="success" size="small" variant="outlined" />
  ) : (
    <Chip label="Inactivo" color="default" size="small" />
  )
}
