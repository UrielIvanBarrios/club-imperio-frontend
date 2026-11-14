import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { useToast } from '../../../components/toast/ToastContext'
import { useDesactivarUsuario } from '../hooks'
import type { Usuario } from '../types'

interface Props {
  usuario: Usuario | null // null = cerrado
  onClose: () => void
}

export function DesactivarUsuarioDialog({ usuario, onClose }: Props) {
  const toast = useToast()
  const desactivar = useDesactivarUsuario()

  const cerrar = () => {
    desactivar.reset()
    onClose()
  }

  return (
    <ConfirmDialog
      open={!!usuario}
      titulo="Desactivar usuario"
      mensaje={
        <>
          ¿Desactivar a <strong>{usuario?.nombre}</strong> ({usuario?.email})? Ya no va a poder iniciar sesión. Si ahora tiene la
          sesión abierta, puede seguir usándola hasta que venza (como máximo 8 horas). Se puede reactivar después.
        </>
      }
      textoConfirmar="Desactivar"
      textoPendiente="Desactivando..."
      isPending={desactivar.isPending}
      error={desactivar.error}
      onConfirm={() =>
        usuario &&
        desactivar.mutate(usuario, {
          onSuccess: () => {
            toast.exito(`Se desactivó a ${usuario.nombre}`)
            cerrar()
          },
        })
      }
      onClose={cerrar}
    />
  )
}
