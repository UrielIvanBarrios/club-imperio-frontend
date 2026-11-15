import { Autocomplete, Box, TextField, Typography } from '@mui/material'
import { useMemo, type Ref } from 'react'
import { normalizarTexto } from '../../../lib/paginar'
import type { Persona } from '../types'

interface Props {
  personas: Persona[] // todas: las dadas de baja se muestran, pero no se pueden elegir
  value: string // personaId, '' = ninguna
  onChange: (personaId: string) => void
  onBlur?: () => void
  inputRef?: Ref<HTMLInputElement>
  name: string
  label: string
  error?: string
  motivoBaja: string // por qué no se puede elegir una dada de baja: "no se puede inscribir"
}

const MAX_RESULTADOS = 20

// Busca por DNI, nombre o apellido, sin importar tildes ni mayúsculas ("perez" encuentra "Pérez")
function filtrarPersonas(personas: Persona[], busqueda: string) {
  const q = normalizarTexto(busqueda)
  const coinciden = q
    ? personas.filter((p) => normalizarTexto(`${p.dni} ${p.nombre} ${p.apellido} ${p.apellido}, ${p.nombre}`).includes(q))
    : personas
  return coinciden.slice(0, MAX_RESULTADOS)
}

// Buscador de personas para los formularios (inscribir, clase de prueba). Las dadas de baja aparecen
// deshabilitadas con el motivo: si no aparecieran, quien busca un DNI conocido pensaría que no existe.
export function PersonaAutocomplete({ personas, value, onChange, onBlur, inputRef, name, label, error, motivoBaja }: Props) {
  const ordenadas = useMemo(
    () => [...personas].sort((a, b) => a.apellido.localeCompare(b.apellido, 'es') || a.nombre.localeCompare(b.nombre, 'es')),
    [personas],
  )
  const persona = personas.find((p) => p.personaId === value)

  return (
    <Autocomplete
      options={ordenadas}
      value={persona ?? null}
      onChange={(_, p) => onChange(p?.personaId ?? '')}
      onBlur={onBlur}
      getOptionLabel={(p) => `${p.apellido}, ${p.nombre} · DNI ${p.dni}`}
      getOptionDisabled={(p) => !p.activo}
      isOptionEqualToValue={(a, b) => a.personaId === b.personaId}
      filterOptions={(opciones, { inputValue }) => filtrarPersonas(opciones, inputValue)}
      noOptionsText="No hay personas con ese DNI o nombre"
      renderOption={({ key, ...props }, p) => (
        <li key={key} {...props}>
          <Box>
            <Typography>{p.apellido}, {p.nombre}</Typography>
            <Typography variant="body2" color="text.secondary">
              DNI {p.dni}{p.activo ? '' : ` · Dada de baja: ${motivoBaja}`}
            </Typography>
          </Box>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          name={name}
          label={label}
          required
          inputRef={inputRef}
          error={!!error}
          helperText={error ?? `Buscá por DNI, nombre o apellido (se muestran hasta ${MAX_RESULTADOS})`}
        />
      )}
    />
  )
}
