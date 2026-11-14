import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Paper } from '@mui/material'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router'
import { aplicarErrorDelBack } from '../../../components/form/errorDelBack'
import { FormTextField } from '../../../components/form/FormTextField'
import type { Actividad } from '../../actividades/types'
import { comisionSchema, valoresVacios, type ComisionFormValues } from '../schema'

interface Props {
  modo: 'alta' | 'edicion'
  // Alta: las actividades activas para elegir. Edición: solo la de la comisión (no se puede cambiar).
  actividades: Actividad[]
  valoresIniciales?: Partial<ComisionFormValues>
  // Edición: inscriptos activos, para orientar al achicar el cupo (el back valida que no quede por debajo)
  inscriptosActivos?: number
  onSubmit: (valores: ComisionFormValues) => Promise<unknown>
  cancelarA: string
}

export function ComisionForm({ modo, actividades, valoresIniciales, inscriptosActivos, onSubmit, cancelarA }: Props) {
  const esEdicion = modo === 'edicion'
  const { control, handleSubmit, setError, setValue, clearErrors, formState: { errors, isSubmitting } } = useForm<ComisionFormValues>({
    resolver: zodResolver(comisionSchema),
    defaultValues: { ...valoresVacios, ...valoresIniciales },
  })
  const sinTope = useWatch({ control, name: 'sinTope' })

  const enviar = async (valores: ComisionFormValues) => {
    try {
      await onSubmit(valores)
    } catch (e) {
      // El orden importa: gana la primera regla que coincide. "Ya existe una comisión … con el nombre '…'
      // en el horario '…'" repite el nombre tipeado (que podría contener "cupo"), por eso va primero.
      aplicarErrorDelBack(e, setError, [
        [/^ya existe/i, 'nombre'], //       nombre + horario repetidos en la misma actividad
        [/cupo/i, 'cupo'], //               "El cupo no puede ser menor a los 3 inscriptos activos…"
        [/horario/i, 'horario'],
        [/nombre/i, 'nombre'],
        [/actividad/i, 'actividadId'], //   "No se puede crear una comisión en una actividad dada de baja."
      ])
    }
  }

  const ayudaCupo = sinTope
    ? 'Sin límite de inscriptos'
    : esEdicion
      ? `Inscriptos activos: ${inscriptosActivos ?? '…'}`
      : 'Cantidad máxima de inscriptos'

  return (
    <Paper sx={{ p: 3 }}>
      <Box component="form" noValidate onSubmit={handleSubmit(enviar)}>
        {errors.root?.server && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.root.server.message}
          </Alert>
        )}

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, alignItems: 'start' }}>
          <FormTextField
            control={control}
            name="actividadId"
            label="Actividad"
            select
            required={!esEdicion}
            disabled={esEdicion}
            helperText={esEdicion ? 'Una comisión no se puede cambiar de actividad' : actividades.length === 0 ? 'No hay actividades activas: creá una primero' : undefined}
          >
            {actividades.map((a) => (
              <MenuItem key={a.actividadId} value={a.actividadId}>{a.nombre}</MenuItem>
            ))}
          </FormTextField>
          <FormTextField control={control} name="nombre" label="Nombre" required autoFocus={esEdicion} helperText="Ej: Turno Mañana, Sub-12" />
          <FormTextField control={control} name="horario" label="Horario" required helperText="Ej: Lunes y Miércoles 18:00" />
          <Box>
            <FormTextField
              control={control}
              name="cupo"
              label="Cupo máximo"
              required={!sinTope}
              disabled={sinTope}
              helperText={ayudaCupo}
              slotProps={{ htmlInput: { inputMode: 'numeric' } }}
            />
            <Controller
              control={control}
              name="sinTope"
              render={({ field }) => (
                <FormControlLabel
                  label="Sin tope de cupo"
                  control={
                    <Checkbox
                      name={field.name}
                      checked={field.value}
                      onChange={(e) => {
                        field.onChange(e.target.checked)
                        // Al marcarlo, el cupo deja de usarse: se vacía y se borra su error
                        if (e.target.checked) {
                          setValue('cupo', '')
                          clearErrors('cupo')
                        }
                      }}
                    />
                  }
                />
              )}
            />
          </Box>
        </Box>

        <Box sx={{ mt: 3, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button component={Link} to={cancelarA} disabled={isSubmitting}>
            Cancelar
          </Button>
          {/* Deshabilitado mientras espera al back: evita el doble envío */}
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear comisión'}
          </Button>
        </Box>
      </Box>
    </Paper>
  )
}
