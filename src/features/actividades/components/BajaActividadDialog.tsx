import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { useToast } from '../../../components/toast/ToastContext'
import { useComisionesPorActividad } from '../../comisiones/hooks'
import { useDarDeBajaActividad } from '../hooks'
import type { Actividad } from '../types'

interface Props {
  actividad: Actividad | null // null = cerrado
  onClose: () => void
}

// Confirmación + llamada + toast de la baja. Avisa la cascada: el back da de baja
// también las comisiones activas y sus inscripciones.
export function BajaActividadDialog({ actividad, onClose }: Props) {
  const toast = useToast()
  const baja = useDarDeBajaActividad()
  // Solo se consulta con el diálogo abierto
  const comisiones = useComisionesPorActividad(actividad?.actividadId)

  const cerrar = () => {
    baja.reset()
    onClose()
  }

  const n = comisiones.data?.length
  const cascada = comisiones.isPending
    ? 'Revisando sus comisiones...'
    : comisiones.isError
      ? 'También se van a dar de baja sus comisiones activas y las inscripciones de esas comisiones.'
      : n === 0
        ? 'No tiene comisiones activas.'
        : `También se van a dar de baja sus ${n === 1 ? 'comisión activa' : `${n} comisiones activas`} y todas sus inscripciones.`

  return (
    <ConfirmDialog
      open={!!actividad}
      titulo="Dar de baja"
      mensaje={
        <>
          ¿Dar de baja la actividad <strong>{actividad?.nombre}</strong>? {cascada} El historial de asistencias se conserva.
        </>
      }
      textoConfirmar="Dar de baja"
      textoPendiente="Dando de baja..."
      isPending={baja.isPending}
      error={baja.error}
      onConfirm={() =>
        actividad &&
        baja.mutate(actividad, {
          onSuccess: () => {
            toast.exito(`Se dio de baja la actividad ${actividad.nombre}`)
            cerrar()
          },
        })
      }
      onClose={cerrar}
    />
  )
}
