import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, Checkbox, FormControlLabel, Paper } from '@mui/material'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router'
import { ApiError } from '../../../api/client'
import { FormTextField } from '../../../components/form/FormTextField'
import { personaSchema, valoresVacios, type PersonaFormValues } from '../schema'

interface Props {
  modo: 'alta' | 'edicion'
  valoresIniciales?: Partial<PersonaFormValues>
  // La página hace la llamada al back; si falla, tira el error y el form lo muestra.
  onSubmit: (valores: PersonaFormValues) => Promise<unknown>
  cancelarA: string
}

// Un solo formulario para alta y edición. En edición, DNI y fecha de nacimiento
// quedan de solo lectura (el PUT del back no los acepta) y no se muestra la membresía.
export function PersonaForm({ modo, valoresIniciales, onSubmit, cancelarA }: Props) {
  const esEdicion = modo === 'edicion'
  const { control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<PersonaFormValues>({
    resolver: zodResolver(personaSchema),
    defaultValues: { ...valoresVacios, ...valoresIniciales },
  })

  const enviar = async (valores: PersonaFormValues) => {
    try {
      await onSubmit(valores)
    } catch (e) {
      const mensaje = e instanceof ApiError ? e.message : 'Error inesperado'
      // Los errores del back son un texto suelto. Si habla del DNI (duplicado o formato),
      // lo mostramos debajo de ese campo; si no, arriba del formulario.
      if (e instanceof ApiError && e.status === 400 && /dni/i.test(mensaje)) setError('dni', { message: mensaje }, { shouldFocus: true })
      else setError('root.server', { message: mensaje })
    }
  }

  const seAsocia = useWatch({ control, name: 'seAsocia' })
  const soloLectura = { htmlInput: { readOnly: true } }

  return (
    <Paper sx={{ p: 3 }}>
      <Box component="form" noValidate onSubmit={handleSubmit(enviar)}>
        {errors.root?.server && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.root.server.message}
          </Alert>
        )}

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <FormTextField
            control={control}
            name="dni"
            label="DNI"
            required={!esEdicion}
            autoFocus={!esEdicion}
            helperText={esEdicion ? 'El DNI no se puede modificar' : 'Sin puntos ni espacios (si los ponés, se quitan)'}
            slotProps={esEdicion ? soloLectura : { htmlInput: { inputMode: 'numeric' } }}
          />
          <FormTextField
            control={control}
            name="fechaNacimiento"
            label="Fecha de nacimiento"
            type="date"
            helperText={esEdicion ? 'No se puede modificar' : undefined}
            slotProps={esEdicion ? soloLectura : undefined}
          />
          <FormTextField control={control} name="nombre" label="Nombre" required autoFocus={esEdicion} />
          <FormTextField control={control} name="apellido" label="Apellido" required />
          <FormTextField control={control} name="email" label="Email" type="email" />
          <FormTextField control={control} name="telefonoPrincipal" label="Teléfono" type="tel" />
        </Box>

        {!esEdicion && (
          <Box sx={{ mt: 2, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, alignItems: 'start' }}>
            <Controller
              control={control}
              name="seAsocia"
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                  label="Se asocia al club (crea la membresía)"
                />
              )}
            />
            {seAsocia && (
              <FormTextField
                control={control}
                name="fechaAltaManual"
                label="Fecha de alta como socio"
                type="date"
                helperText="Si queda vacía, se usa la fecha de hoy"
              />
            )}
          </Box>
        )}

        <Box sx={{ mt: 3, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button component={Link} to={cancelarA} disabled={isSubmitting}>
            Cancelar
          </Button>
          {/* Deshabilitado mientras espera al back: evita el doble envío */}
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear persona'}
          </Button>
        </Box>
      </Box>
    </Paper>
  )
}
