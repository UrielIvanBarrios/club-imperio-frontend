import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, Paper, Skeleton, Stack, Typography } from '@mui/material'
import { useEffect, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../../auth/AuthContext'
import { ErrorState } from '../../../components/ErrorState'
import { aplicarErrorDelBack } from '../../../components/form/errorDelBack'
import { FormTextField } from '../../../components/form/FormTextField'
import { PageHeader } from '../../../components/PageHeader'
import { useToast } from '../../../components/toast/ToastContext'
import { formatFecha } from '../../../lib/format'
import { ChipRol } from '../../usuarios/components/UsuarioChips'
import { useCambiarMiPassword, useMe } from '../hooks'
import { cambioPasswordSchema, valoresVacios, type CambioPasswordValues } from '../schema'

// Pantalla 2: datos del usuario logueado y cambio de su propia contraseña. Para ADMIN y USER.
export function PerfilPage() {
  const me = useMe()
  const { actualizarUsuario } = useAuth()

  // /me trae los datos al día: si un ADMIN cambió el nombre mientras la sesión estaba abierta,
  // se refresca también la barra superior.
  useEffect(() => {
    if (me.data) actualizarUsuario(me.data)
  }, [me.data, actualizarUsuario])

  return (
    <>
      <PageHeader titulo="Mi perfil" />
      <Stack spacing={2} sx={{ maxWidth: 720 }}>
        <Seccion titulo="Mis datos">
          {me.isPending ? (
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} height={44} />)}
            </Box>
          ) : me.isError ? (
            <ErrorState error={me.error} onRetry={() => me.refetch()} />
          ) : (
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              <Dato label="Nombre">{me.data.nombre}</Dato>
              <Dato label="Email">{me.data.email}</Dato>
              <Dato label="Rol"><ChipRol rol={me.data.rol} /></Dato>
              <Dato label="Usuario desde">{formatFecha(me.data.fechaCreacion)}</Dato>
            </Box>
          )}
          {me.data && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              El nombre, el email y el rol los cambia un ADMIN desde Usuarios.
            </Typography>
          )}
        </Seccion>

        <Seccion titulo="Cambiar contraseña">
          <CambiarPassword />
        </Seccion>
      </Stack>
    </>
  )
}

function CambiarPassword() {
  const toast = useToast()
  const cambiar = useCambiarMiPassword()
  const { control, handleSubmit, setError, reset, formState: { errors, isSubmitting } } = useForm<CambioPasswordValues>({
    resolver: zodResolver(cambioPasswordSchema),
    defaultValues: valoresVacios,
  })

  const enviar = async ({ passwordActual, passwordNueva }: CambioPasswordValues) => {
    try {
      await cambiar.mutateAsync({ passwordActual, passwordNueva })
      toast.exito('Contraseña actualizada. La próxima vez, iniciá sesión con la nueva.')
      reset(valoresVacios) // no dejar contraseñas escritas en pantalla
    } catch (e) {
      // "La contraseña actual es incorrecta." → actual · "…al menos 8…" / "…distinta de la actual." → nueva
      aplicarErrorDelBack(e, setError, [[/actual es incorrecta/i, 'passwordActual'], [/nueva|caracteres/i, 'passwordNueva']])
    }
  }

  return (
    <Box component="form" noValidate onSubmit={handleSubmit(enviar)}>
      {errors.root?.server && <Alert severity="error" sx={{ mb: 2 }}>{errors.root.server.message}</Alert>}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        <FormTextField control={control} name="passwordActual" label="Contraseña actual" type="password" autoComplete="current-password" />
        <Box sx={{ display: { xs: 'none', sm: 'block' } }} />
        <FormTextField control={control} name="passwordNueva" label="Contraseña nueva" type="password" autoComplete="new-password" helperText="Mínimo 8 caracteres" />
        <FormTextField control={control} name="confirmar" label="Repetí la contraseña nueva" type="password" autoComplete="new-password" />
      </Box>
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="submit" variant="contained" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Cambiar contraseña'}
        </Button>
      </Box>
    </Box>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" component="h2" sx={{ mb: 2 }}>{titulo}</Typography>
      {children}
    </Paper>
  )
}

function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Box>{children}</Box>
    </Box>
  )
}
