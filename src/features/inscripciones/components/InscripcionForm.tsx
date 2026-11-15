import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Autocomplete, Box, Button, MenuItem, Paper, TextField, Typography } from '@mui/material'
import { useMemo } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router'
import { ErrorState } from '../../../components/ErrorState'
import { aplicarErrorDelBack } from '../../../components/form/errorDelBack'
import { normalizarTexto } from '../../../lib/paginar'
import type { Actividad } from '../../actividades/types'
import { useComisionesPorActividad } from '../../comisiones/hooks'
import type { Comision } from '../../comisiones/types'
import type { Persona } from '../../personas/types'
import { useInscripcionesPorSocio, useInscriptosDeComisiones } from '../hooks'
import { inscripcionSchema, valoresVacios, type InscripcionFormValues } from '../schema'

interface Props {
  personas: Persona[] // todas: las dadas de baja se muestran, pero no se pueden elegir
  actividades: Actividad[] // solo las activas
  valoresIniciales?: Partial<InscripcionFormValues>
  onSubmit: (valores: InscripcionFormValues) => Promise<unknown>
  cancelarA: string
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

// "3 lugares libres de 10" / "Completa" / "Sin tope de cupo"
function textoCupo(c: Comision, inscriptos: number | undefined) {
  if (c.cupoMaximo === null) return 'Sin tope de cupo'
  if (inscriptos === undefined) return `Cupo ${c.cupoMaximo}`
  const libres = c.cupoMaximo - inscriptos
  if (libres <= 0) return `Completa (${inscriptos} / ${c.cupoMaximo})`
  return `${libres} ${libres === 1 ? 'lugar libre' : 'lugares libres'} de ${c.cupoMaximo}`
}

export function InscripcionForm({ personas, actividades, valoresIniciales, onSubmit, cancelarA }: Props) {
  const { control, handleSubmit, setError, setValue, clearErrors, formState: { errors, isSubmitting } } = useForm<InscripcionFormValues>({
    resolver: zodResolver(inscripcionSchema),
    defaultValues: { ...valoresVacios, ...valoresIniciales },
  })
  const [personaId, actividadId, comisionId] = useWatch({ control, name: ['personaId', 'actividadId', 'comisionId'] })

  const ordenadas = useMemo(
    () => [...personas].sort((a, b) => a.apellido.localeCompare(b.apellido, 'es') || a.nombre.localeCompare(b.nombre, 'es')),
    [personas],
  )
  const persona = personas.find((p) => p.personaId === personaId)

  // Comisiones activas de la actividad elegida, con cuántos inscriptos tiene cada una
  const comisiones = useComisionesPorActividad(actividadId || undefined)
  const listaComisiones = comisiones.data ?? []
  const inscriptos = useInscriptosDeComisiones(listaComisiones.map((c) => c.comisionId))
  // Dónde ya está inscripta la persona elegida: esas comisiones se muestran deshabilitadas
  const inscripcionesDelSocio = useInscripcionesPorSocio(persona?.dni)
  const yaInscripto = new Set(inscripcionesDelSocio.data?.map((i) => i.comision.comisionId))

  const completa = (c: Comision) => c.cupoMaximo !== null && (inscriptos.cantidad[c.comisionId] ?? 0) >= c.cupoMaximo

  const enviar = async (valores: InscripcionFormValues) => {
    try {
      await onSubmit(valores)
    } catch (e) {
      // Los cuatro rechazos del back (InscripcionService), cada uno debajo de su campo.
      // "Cupo agotado para la comisión: <nombre>" va primero porque repite el nombre de la comisión.
      aplicarErrorDelBack(e, setError, [
        [/^cupo agotado/i, 'comisionId'],
        [/ya está inscripto/i, 'comisionId'], // "El socio ya está inscripto en esta comisión."
        [/persona|socio/i, 'personaId'], //      "La persona seleccionada no esta activa." / "No existe socio con DNI: …"
        [/comisi[oó]n/i, 'comisionId'], //       "La comision seleccionada no esta activa."
      ])
    }
  }

  const comisionElegida = listaComisiones.find((c) => c.comisionId === comisionId)
  const ayudaComision = !actividadId
    ? 'Primero elegí la actividad'
    : comisiones.isPending
      ? 'Cargando comisiones...'
      : listaComisiones.length === 0
        ? 'Esta actividad no tiene comisiones activas'
        : comisionElegida
          ? `${comisionElegida.horario} · ${textoCupo(comisionElegida, inscriptos.cantidad[comisionElegida.comisionId])}`
          : undefined

  return (
    <Paper sx={{ p: 3 }}>
      <Box component="form" noValidate onSubmit={handleSubmit(enviar)}>
        {errors.root?.server && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.root.server.message}
          </Alert>
        )}

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 2fr' }, alignItems: 'start' }}>
          <Controller
            control={control}
            name="personaId"
            render={({ field, fieldState }) => (
              <Autocomplete
                options={ordenadas}
                value={persona ?? null}
                onChange={(_, p) => field.onChange(p?.personaId ?? '')}
                onBlur={field.onBlur}
                getOptionLabel={(p) => `${p.apellido}, ${p.nombre} · DNI ${p.dni}`}
                getOptionDisabled={(p) => !p.activo} // el back no inscribe personas dadas de baja
                isOptionEqualToValue={(a, b) => a.personaId === b.personaId}
                filterOptions={(opciones, { inputValue }) => filtrarPersonas(opciones, inputValue)}
                noOptionsText="No hay personas con ese DNI o nombre"
                renderOption={({ key, ...props }, p) => (
                  <li key={key} {...props}>
                    <Box>
                      <Typography>{p.apellido}, {p.nombre}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        DNI {p.dni}{p.activo ? '' : ' · Dada de baja: no se puede inscribir'}
                      </Typography>
                    </Box>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    name="personaId"
                    label="Socio"
                    required
                    inputRef={field.ref}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message ?? `Buscá por DNI, nombre o apellido (se muestran hasta ${MAX_RESULTADOS})`}
                  />
                )}
              />
            )}
          />

          <Controller
            control={control}
            name="actividadId"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                inputRef={field.ref}
                select
                label="Actividad"
                required
                fullWidth
                onChange={(e) => {
                  field.onChange(e.target.value)
                  // Otra actividad, otras comisiones: la elegida deja de valer
                  setValue('comisionId', '')
                  clearErrors('comisionId')
                }}
                error={!!fieldState.error}
                helperText={fieldState.error?.message ?? (actividades.length === 0 ? 'No hay actividades activas' : undefined)}
              >
                {actividades.map((a) => (
                  <MenuItem key={a.actividadId} value={a.actividadId}>{a.nombre}</MenuItem>
                ))}
              </TextField>
            )}
          />

          <Controller
            control={control}
            name="comisionId"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                // Mientras cargan, el valor precargado todavía no está entre las opciones: se muestra vacío
                value={listaComisiones.some((c) => c.comisionId === field.value) ? field.value : ''}
                inputRef={field.ref}
                select
                label="Comisión"
                required
                fullWidth
                disabled={!actividadId || comisiones.isPending || listaComisiones.length === 0}
                error={!!fieldState.error}
                helperText={fieldState.error?.message ?? ayudaComision}
              >
                {listaComisiones.map((c) => {
                  const ya = yaInscripto.has(c.comisionId)
                  return (
                    // Completa o ya inscripto: se ve, pero no se puede elegir (el back lo rechazaría)
                    <MenuItem key={c.comisionId} value={c.comisionId} disabled={ya || completa(c)}>
                      {c.nombre} · {c.horario} — {ya ? 'Ya está inscripto' : textoCupo(c, inscriptos.cantidad[c.comisionId])}
                    </MenuItem>
                  )
                })}
              </TextField>
            )}
          />
        </Box>

        {comisiones.isError && (
          <Box sx={{ mt: 2 }}>
            <ErrorState error={comisiones.error} titulo="No se pudieron cargar las comisiones" onRetry={() => comisiones.refetch()} />
          </Box>
        )}

        <Box sx={{ mt: 3, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button component={Link} to={cancelarA} disabled={isSubmitting}>
            Cancelar
          </Button>
          {/* Deshabilitado mientras espera al back: evita el doble envío */}
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Inscribiendo...' : 'Inscribir'}
          </Button>
        </Box>
      </Box>
    </Paper>
  )
}
