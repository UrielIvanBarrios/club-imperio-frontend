import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, InputAdornment, Paper } from '@mui/material'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { aplicarErrorDelBack } from '../../../components/form/errorDelBack'
import { FormTextField } from '../../../components/form/FormTextField'
import { actividadSchema, valoresVacios, type ActividadFormValues } from '../schema'

interface Props {
  modo: 'alta' | 'edicion'
  valoresIniciales?: Partial<ActividadFormValues>
  // La página hace la llamada al back; si falla, tira el error y el form lo muestra.
  onSubmit: (valores: ActividadFormValues) => Promise<unknown>
  cancelarA: string
}

// Un solo formulario para alta y edición (en Actividades se editan los mismos campos que se cargan).
export function ActividadForm({ modo, valoresIniciales, onSubmit, cancelarA }: Props) {
  const { control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<ActividadFormValues>({
    resolver: zodResolver(actividadSchema),
    defaultValues: { ...valoresVacios, ...valoresIniciales },
  })

  const enviar = async (valores: ActividadFormValues) => {
    try {
      await onSubmit(valores)
    } catch (e) {
      // "Ya existe una actividad registrada con el nombre…" / "El nombre '…' ya está en uso." → debajo del nombre
      aplicarErrorDelBack(e, setError, [[/nombre/i, 'nombre'], [/precio/i, 'precioMensual']])
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

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' } }}>
          <FormTextField control={control} name="nombre" label="Nombre" required autoFocus helperText="Ej: Fútbol 11, Vóley femenino" />
          <FormTextField
            control={control}
            name="precioMensual"
            label="Precio mensual"
            required
            slotProps={{
              htmlInput: { inputMode: 'decimal' },
              input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
            }}
          />
          <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
            <FormTextField control={control} name="descripcion" label="Descripción" multiline minRows={2} />
          </Box>
        </Box>

        <Box sx={{ mt: 3, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button component={Link} to={cancelarA} disabled={isSubmitting}>
            Cancelar
          </Button>
          {/* Deshabilitado mientras espera al back: evita el doble envío */}
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : modo === 'edicion' ? 'Guardar cambios' : 'Crear actividad'}
          </Button>
        </Box>
      </Box>
    </Paper>
  )
}
