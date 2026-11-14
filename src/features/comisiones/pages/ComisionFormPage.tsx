import { Paper, Skeleton } from '@mui/material'
import { useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { ErrorState } from '../../../components/ErrorState'
import { PageHeader } from '../../../components/PageHeader'
import { useToast } from '../../../components/toast/ToastContext'
import { esUuid } from '../../../lib/format'
import { useActividades } from '../../actividades/hooks'
import { useInscripcionesPorComision } from '../../inscripciones/hooks'
import { ComisionForm } from '../components/ComisionForm'
import { useActualizarComision, useComision, useCrearComision } from '../hooks'
import { aCreateRequest, aFormulario, aUpdateRequest } from '../schema'

// Una sola página para /comisiones/nueva y /comisiones/:id/editar: si hay :id, es edición.
export function ComisionFormPage() {
  const { id } = useParams()
  return id ? <EditarComision id={id} /> : <NuevaComision />
}

const FormSkeleton = () => (
  <Paper sx={{ p: 3, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
    {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} variant="rounded" height={56} />)}
  </Paper>
)

function NuevaComision() {
  const navigate = useNavigate()
  const toast = useToast()
  const crear = useCrearComision()
  const actividades = useActividades()
  // Viene con ?actividad=<id> desde el filtro del listado o desde el detalle de la actividad
  const [params] = useSearchParams()

  // Solo se ofrecen las activas: el back también rechaza el alta en una actividad dada de baja,
  // pero así el usuario ni siquiera puede elegirla
  const activas = useMemo(
    () => (actividades.data ?? []).filter((a) => a.activo).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [actividades.data],
  )
  const preelegida = activas.some((a) => a.actividadId === params.get('actividad')) ? params.get('actividad')! : ''
  const volverA = preelegida ? `/actividades/${preelegida}` : '/comisiones'

  return (
    <>
      <PageHeader titulo="Nueva comisión" migas={[{ label: 'Comisiones', to: '/comisiones' }, { label: 'Nueva' }]} />
      {actividades.isPending ? (
        <FormSkeleton />
      ) : actividades.isError ? (
        <ErrorState error={actividades.error} onRetry={() => actividades.refetch()} />
      ) : (
        <ComisionForm
          // key: si cambia ?actividad= (misma ruta, mismo componente), el formulario se arma de cero
          key={preelegida}
          modo="alta"
          actividades={activas}
          valoresIniciales={{ actividadId: preelegida }}
          cancelarA={volverA}
          onSubmit={async (valores) => {
            const comision = await crear.mutateAsync(aCreateRequest(valores))
            toast.exito(`Comisión creada: ${comision.nombre}`)
            navigate(`/comisiones/${comision.comisionId}`, { replace: true })
          }}
        />
      )}
    </>
  )
}

function EditarComision({ id }: { id: string }) {
  const navigate = useNavigate()
  const toast = useToast()
  const actualizar = useActualizarComision()
  const valido = esUuid(id)
  const comision = useComision(valido ? id : undefined)
  const inscripciones = useInscripcionesPorComision(valido ? id : undefined)
  const c = comision.data
  const migas = [{ label: 'Comisiones', to: '/comisiones' }, ...(c ? [{ label: `${c.actividad.nombre} · ${c.nombre}`, to: `/comisiones/${id}` }] : []), { label: 'Editar' }]

  if (!valido) return <ErrorState titulo="No existe la comisión" error={new Error('El link no es válido.')} />

  return (
    <>
      <PageHeader titulo="Editar comisión" migas={migas} />
      {comision.isPending ? (
        <FormSkeleton />
      ) : comision.isError ? (
        <ErrorState error={comision.error} onRetry={() => comision.refetch()} />
      ) : !comision.data.activa ? (
        // El back rechaza el PUT de una comisión dada de baja: ni se muestra el formulario
        <ErrorState titulo="No se puede editar" error={new Error('Esta comisión está dada de baja.')} />
      ) : (
        <ComisionForm
          key={comision.data.comisionId}
          modo="edicion"
          actividades={[comision.data.actividad]}
          valoresIniciales={aFormulario(comision.data)}
          inscriptosActivos={inscripciones.data?.length}
          cancelarA={`/comisiones/${id}`}
          onSubmit={async (valores) => {
            await actualizar.mutateAsync({ id, data: aUpdateRequest(valores) })
            toast.exito('Cambios guardados')
            navigate(`/comisiones/${id}`, { replace: true })
          }}
        />
      )}
    </>
  )
}
