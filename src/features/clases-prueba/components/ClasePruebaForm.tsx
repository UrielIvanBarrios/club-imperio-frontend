import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, Link as MuiLink, MenuItem, Paper, TextField, Typography } from '@mui/material'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router'
import { aplicarErrorDelBack } from '../../../components/form/errorDelBack'
import { FormTextField } from '../../../components/form/FormTextField'
import { hoyISO } from '../../../lib/format'
import type { Actividad } from '../../actividades/types'
import { PersonaAutocomplete } from '../../personas/components/PersonaAutocomplete'
import type { Persona } from '../../personas/types'
import { clasePruebaSchema, valoresVacios, type ClasePruebaFormValues } from '../schema'
import type { ClasePrueba } from '../types'

interface Props {
  personas: Persona[] // todas: las dadas de baja se muestran, pero no se pueden elegir
  actividades: Actividad[] // solo las activas
  // Las clases ya cargadas, para no ofrecer una actividad donde la persona ya tiene una pendiente.
  // undefined si no se pudieron cargar: se ofrece todo y valida el back.
  clases: ClasePrueba[] | undefined
  valoresIniciales?: Partial<ClasePruebaFormValues>
  onSubmit: (valores: ClasePruebaFormValues) => Promise<unknown>
  cancelarA: string
}

export function ClasePruebaForm({ personas, actividades, clases, valoresIniciales, onSubmit, cancelarA }: Props) {
  const { control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<ClasePruebaFormValues>({
    resolver: zodResolver(clasePruebaSchema),
    defaultValues: { ...valoresVacios, ...valoresIniciales },
  })
  const personaId = useWatch({ control, name: 'personaId' })

  // Actividades donde la persona elegida ya tiene una clase pendiente: el back no deja registrar otra
  const conPendiente = new Set(
    (clases ?? []).filter((c) => c.persona.personaId === personaId && !c.asistio).map((c) => c.actividad.actividadId),
  )

  const enviar = async (valores: ClasePruebaFormValues) => {
    try {
      await onSubmit(valores)
    } catch (e) {
      // Rechazos del back (ClasePruebaService), cada uno debajo de su campo
      aplicarErrorDelBack(e, setError, [
        [/pendiente/i, 'actividadId'], //  "La persona ya tiene una clase de prueba pendiente para esta actividad."
        [/actividad/i, 'actividadId'], //  "No se puede registrar una clase de prueba en una actividad inactiva."
        [/persona|socio/i, 'personaId'], // "…La persona está inactiva." / "No existe socio con DNI: …"
      ])
    }
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box component="form" noValidate onSubmit={handleSubmit(enviar)}>
        {errors.root?.server && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.root.server.message}
          </Alert>
        )}

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr 1fr' }, alignItems: 'start' }}>
          <Controller
            control={control}
            name="personaId"
            render={({ field, fieldState }) => (
              <PersonaAutocomplete
                personas={personas}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                name="personaId"
                label="Persona"
                error={fieldState.error?.message}
                motivoBaja="no se le puede dar una clase de prueba"
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
                error={!!fieldState.error}
                helperText={fieldState.error?.message ?? (actividades.length === 0 ? 'No hay actividades activas' : undefined)}
              >
                {actividades.map((a) => {
                  const pendiente = conPendiente.has(a.actividadId)
                  return (
                    <MenuItem key={a.actividadId} value={a.actividadId} disabled={pendiente}>
                      {a.nombre}{pendiente ? ' — Ya tiene una pendiente' : ''}
                    </MenuItem>
                  )
                })}
              </TextField>
            )}
          />
          <FormTextField control={control} name="fecha" label="Día" type="date" required slotProps={{ htmlInput: { min: hoyISO() } }} />
          <FormTextField control={control} name="hora" label="Hora" type="time" required slotProps={{ inputLabel: { shrink: true } }} />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          ¿La persona todavía no está cargada?{' '}
          <MuiLink component={Link} to="/personas/nueva">Dala de alta primero</MuiLink>: la clase de prueba se registra con su DNI.
        </Typography>

        <Box sx={{ mt: 3, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button component={Link} to={cancelarA} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Registrando...' : 'Registrar clase de prueba'}
          </Button>
        </Box>
      </Box>
    </Paper>
  )
}
