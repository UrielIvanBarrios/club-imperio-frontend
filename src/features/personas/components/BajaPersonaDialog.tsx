import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { useToast } from '../../../components/toast/ToastContext'
import { useDarDeBajaPersona } from '../hooks'
import type { Persona } from '../types'

interface Props {
  persona: Persona | null // null = cerrado
  onClose: () => void
}

// Confirmación + llamada + toast de la baja. Se usa desde el listado y desde el detalle.
export function BajaPersonaDialog({ persona, onClose }: Props) {
  const toast = useToast()
  const baja = useDarDeBajaPersona()

  const cerrar = () => {
    baja.reset() // que el error de un intento anterior no aparezca al abrirlo de nuevo
    onClose()
  }

  return (
    <ConfirmDialog
      open={!!persona}
      titulo="Dar de baja"
      mensaje={
        <>
          ¿Dar de baja a <strong>{persona?.nombre} {persona?.apellido}</strong> (DNI {persona?.dni})? Va a quedar inactiva,
          pero se conserva su historial. Se puede reactivar después.
        </>
      }
      textoConfirmar="Dar de baja"
      textoPendiente="Dando de baja..."
      isPending={baja.isPending}
      error={baja.error}
      onConfirm={() =>
        persona &&
        baja.mutate(persona, {
          onSuccess: () => {
            toast.exito(`Se dio de baja a ${persona.nombre} ${persona.apellido}`)
            cerrar()
          },
        })
      }
      onClose={cerrar}
    />
  )
}
