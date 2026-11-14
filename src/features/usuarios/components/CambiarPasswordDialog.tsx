import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material'
import { useForm } from 'react-hook-form'
import { aplicarErrorDelBack } from '../../../components/form/errorDelBack'
import { FormTextField } from '../../../components/form/FormTextField'
import { useToast } from '../../../components/toast/ToastContext'
import { useActualizarUsuario } from '../hooks'
import { resetPasswordSchema, type ResetPasswordValues } from '../schema'
import type { Usuario } from '../types'

interface Props {
  usuario: Usuario | null // null = cerrado
  onClose: () => void
}

// El ADMIN le pone una contraseña nueva a otro usuario (ej: se la olvidó). No pide la actual.
export function CambiarPasswordDialog({ usuario, onClose }: Props) {
  return (
    <Dialog open={!!usuario} onClose={onClose} maxWidth="xs" fullWidth>
      {/* key: cada vez que se abre para otro usuario, el formulario arranca vacío */}
      {usuario && <Formulario key={usuario.usuarioId} usuario={usuario} onClose={onClose} />}
    </Dialog>
  )
}

function Formulario({ usuario, onClose }: { usuario: Usuario; onClose: () => void }) {
  const toast = useToast()
  const actualizar = useActualizarUsuario()
  const { control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmar: '' },
  })

  const enviar = async ({ password }: ResetPasswordValues) => {
    try {
      await actualizar.mutateAsync({ id: usuario.usuarioId, data: { password } })
      toast.exito(`Se cambió la contraseña de ${usuario.nombre}`)
      onClose()
    } catch (e) {
      aplicarErrorDelBack(e, setError, [[/contraseña/i, 'password']])
    }
  }

  return (
    <Box component="form" noValidate onSubmit={handleSubmit(enviar)}>
      <DialogTitle>Cambiar contraseña</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Nueva contraseña para <strong>{usuario.nombre}</strong> ({usuario.email}). Avisale, porque va a tener que usarla en su próximo inicio de sesión.
        </DialogContentText>
        {errors.root?.server && <Alert severity="error" sx={{ mb: 2 }}>{errors.root.server.message}</Alert>}
        <Box sx={{ display: 'grid', gap: 2, pt: 1 }}>
          <FormTextField control={control} name="password" label="Contraseña nueva" type="password" autoFocus autoComplete="new-password" helperText="Mínimo 8 caracteres" />
          <FormTextField control={control} name="confirmar" label="Repetí la contraseña" type="password" autoComplete="new-password" />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Cambiar contraseña'}
        </Button>
      </DialogActions>
    </Box>
  )
}
