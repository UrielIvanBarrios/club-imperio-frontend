import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { useToast } from '../../../components/toast/ToastContext'
import { useInscripcionesPorComision } from '../../inscripciones/hooks'
import { useDarDeBajaComision } from '../hooks'
import type { Comision } from '../types'

interface Props {
  comision: Comision | null // null = cerrado
  onClose: () => void
}

// Confirmación + llamada + toast de la baja. Avisa la cascada: el back da de baja
// también las inscripciones activas de la comisión.
export function BajaComisionDialog({ comision, onClose }: Props) {
  const toast = useToast()
  const baja = useDarDeBajaComision()
  // Solo se consulta con el diálogo abierto
  const inscripciones = useInscripcionesPorComision(comision?.comisionId)

  const cerrar = () => {
    baja.reset()
    onClose()
  }

  const n = inscripciones.data?.length
  const cascada = inscripciones.isPending
    ? 'Revisando sus inscripciones...'
    : inscripciones.isError
      ? 'También se van a dar de baja sus inscripciones activas.'
      : n === 0
        ? 'No tiene inscriptos activos.'
        : `También se ${n === 1 ? 'va a dar de baja su inscripción activa' : `van a dar de baja sus ${n} inscripciones activas`}.`

  return (
    <ConfirmDialog
      open={!!comision}
      titulo="Dar de baja"
      mensaje={
        <>
          ¿Dar de baja la comisión <strong>{comision?.nombre}</strong> de {comision?.actividad.nombre} ({comision?.horario})? {cascada} El
          historial de asistencias se conserva. Una comisión dada de baja no se puede reactivar.
        </>
      }
      textoConfirmar="Dar de baja"
      textoPendiente="Dando de baja..."
      isPending={baja.isPending}
      error={baja.error}
      onConfirm={() =>
        comision &&
        baja.mutate(comision, {
          onSuccess: () => {
            toast.exito(`Se dio de baja la comisión ${comision.nombre}`)
            cerrar()
          },
        })
      }
      onClose={cerrar}
    />
  )
}
