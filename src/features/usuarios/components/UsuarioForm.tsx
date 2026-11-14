import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, MenuItem, Paper } from '@mui/material'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { aplicarErrorDelBack } from '../../../components/form/errorDelBack'
import { FormTextField } from '../../../components/form/FormTextField'
import { usuarioSchema, valoresVacios, type UsuarioFormValues } from '../schema'

interface Props {
  modo: 'alta' | 'edicion'
  valoresIniciales?: Partial<UsuarioFormValues>
  // El ADMIN editándose a sí mismo: no puede quitarse el rol (regla del back)
  esUnoMismo?: boolean
  onSubmit: (valores: UsuarioFormValues) => Promise<unknown>
  cancelarA: string
}

export function UsuarioForm({ modo, valoresIniciales, esUnoMismo = false, onSubmit, cancelarA }: Props) {
  const esAlta = modo === 'alta'
  const schema = useMemo(() => usuarioSchema(modo), [modo])
  const { control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<UsuarioFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ...valoresVacios, ...valoresIniciales },
  })

  const enviar = async (valores: UsuarioFormValues) => {
    try {
      await onSubmit(valores)
    } catch (e) {
      // "Ya existe un usuario con el email: …", "La contraseña debe tener al menos 8 caracteres."…
      aplicarErrorDelBack(e, setError, [[/email/i, 'email'], [/contraseña/i, 'password'], [/rol/i, 'rol'], [/nombre/i, 'nombre']])
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

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <FormTextField control={control} name="nombre" label="Nombre" required autoFocus />
          <FormTextField control={control} name="email" label="Email" type="email" required autoComplete="off" helperText="Es con el que inicia sesión" />
          <FormTextField
            control={control}
            name="rol"
            label="Rol"
            select
            required
            disabled={esUnoMismo}
            helperText={
              esUnoMismo
                ? 'No podés quitarte el rol de ADMIN a vos mismo: el sistema tiene que tener siempre un ADMIN'
                : 'ADMIN: todo, incluidos los usuarios · USER: todo menos usuarios e importación'
            }
          >
            <MenuItem value="USER">USER</MenuItem>
            <MenuItem value="ADMIN">ADMIN</MenuItem>
          </FormTextField>
          {esAlta && <Box sx={{ display: { xs: 'none', sm: 'block' } }} />}
          {esAlta && (
            <>
              <FormTextField control={control} name="password" label="Contraseña" type="password" required autoComplete="new-password" helperText="Mínimo 8 caracteres" />
              <FormTextField control={control} name="confirmar" label="Repetí la contraseña" type="password" required autoComplete="new-password" />
            </>
          )}
        </Box>

        <Box sx={{ mt: 3, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button component={Link} to={cancelarA} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : esAlta ? 'Crear usuario' : 'Guardar cambios'}
          </Button>
        </Box>
      </Box>
    </Paper>
  )
}
