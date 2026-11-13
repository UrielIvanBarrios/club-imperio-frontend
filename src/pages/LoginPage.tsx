import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { login } from '../api/auth'
import { useAuth } from '../auth/AuthContext'

// Reglas del formulario: Zod valida y React Hook Form muestra el error debajo de cada campo.
const schema = z.object({
  email: z.string().trim().min(1, 'Ingresá tu email').pipe(z.email('El email no es válido')),
  password: z.string().min(1, 'Ingresá tu contraseña'),
})
type LoginForm = z.infer<typeof schema>

export function LoginPage() {
  const { usuario, sesionVencida, iniciarSesion } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
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

        {sesionVencida && !mutation.isError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Tu sesión venció. Iniciá sesión nuevamente.
          </Alert>
        )}
        {mutation.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {mutation.error.message}
          </Alert>
        )}

        <Box component="form" noValidate onSubmit={handleSubmit((data) => mutation.mutate(data))}>
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            autoFocus
            fullWidth
            margin="normal"
            error={!!errors.email}
            helperText={errors.email?.message}
            {...register('email')}
          />
          <TextField
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            fullWidth
            margin="normal"
            error={!!errors.password}
            helperText={errors.password?.message}
            {...register('password')}
          />
          <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 2 }} disabled={mutation.isPending}>
            {mutation.isPending ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}
