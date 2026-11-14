import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, Paper, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { login } from '../api/auth'
import { useAuth } from '../auth/AuthContext'
import { FormTextField } from '../components/form/FormTextField'

// Reglas del formulario: Zod valida y React Hook Form muestra el error debajo de cada campo.
const schema = z.object({
  email: z.string().trim().min(1, 'Ingresá tu email').pipe(z.email('El email no es válido')),
  password: z.string().min(1, 'Ingresá tu contraseña'),
})
type LoginForm = z.infer<typeof schema>

export function LoginPage() {
  const { usuario, motivoCierre, iniciarSesion } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const { control, handleSubmit } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  // useMutation: para llamadas que modifican algo (POST). Nos da isPending y error sin useState a mano.
  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (respuesta) => {
      iniciarSesion(respuesta)
      navigate(from, { replace: true })
    },
  })

  // Si ya está logueado (ej: entra a /login a mano), lo mandamos adentro.
  if (usuario) return <Navigate to={from} replace />

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: 'grey.100', p: 2 }}>
      <Paper sx={{ p: 4, width: '100%', maxWidth: 400 }} elevation={3}>
        <Typography variant="h5" component="h1" gutterBottom>
          Club Imperio
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Iniciá sesión para continuar
        </Typography>

        {/* Por qué se cerró la sesión, con el mensaje del back (token vencido, usuario desactivado…) */}
        {motivoCierre && !mutation.isError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {motivoCierre}
          </Alert>
        )}
        {mutation.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {mutation.error.message}
          </Alert>
        )}

        <Box component="form" noValidate onSubmit={handleSubmit((data) => mutation.mutate(data))}>
          <FormTextField control={control} name="email" label="Email" type="email" autoComplete="email" autoFocus margin="normal" />
          <FormTextField control={control} name="password" label="Contraseña" type="password" autoComplete="current-password" margin="normal" />
          <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 2 }} disabled={mutation.isPending}>
            {mutation.isPending ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}
