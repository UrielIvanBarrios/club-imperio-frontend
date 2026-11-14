import { Paper, Skeleton } from '@mui/material'
import { useNavigate, useParams } from 'react-router'
import { ErrorState } from '../../../components/ErrorState'
import { PageHeader } from '../../../components/PageHeader'
import { useToast } from '../../../components/toast/ToastContext'
import { esUuid } from '../../../lib/format'
import { ActividadForm } from '../components/ActividadForm'
import { useActividad, useActualizarActividad, useCrearActividad } from '../hooks'
import { aCreateRequest, aFormulario, aUpdateRequest } from '../schema'

// Una sola página para /actividades/nueva y /actividades/:id/editar: si hay :id, es edición.
export function ActividadFormPage() {
  const { id } = useParams()
  return id ? <EditarActividad id={id} /> : <NuevaActividad />
}

function NuevaActividad() {
  const navigate = useNavigate()
  const toast = useToast()
  const crear = useCrearActividad()

  return (
    <>
      <PageHeader titulo="Nueva actividad" migas={[{ label: 'Actividades', to: '/actividades' }, { label: 'Nueva' }]} />
      <ActividadForm
        modo="alta"
        cancelarA="/actividades"
        onSubmit={async (valores) => {
          const actividad = await crear.mutateAsync(aCreateRequest(valores))
          toast.exito(`Actividad creada: ${actividad.nombre}`)
          navigate(`/actividades/${actividad.actividadId}`, { replace: true })
        }}
      />
    </>
  )
}

function EditarActividad({ id }: { id: string }) {
  const navigate = useNavigate()
  const toast = useToast()
  const actualizar = useActualizarActividad()
  const valido = esUuid(id)
  const actividad = useActividad(valido ? id : undefined)
  const migas = [
    { label: 'Actividades', to: '/actividades' },
    ...(actividad.data ? [{ label: actividad.data.nombre, to: `/actividades/${id}` }] : []),
    { label: 'Editar' },
  ]

  if (!valido) return <ErrorState titulo="No existe la actividad" error={new Error('El link no es válido.')} />

  return (
    <>
      <PageHeader titulo="Editar actividad" migas={migas} />
      {actividad.isPending ? (
        <Paper sx={{ p: 3, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' } }}>
          {[56, 56, 80].map((h, i) => <Skeleton key={i} variant="rounded" height={h} sx={i === 2 ? { gridColumn: { sm: '1 / -1' } } : undefined} />)}
        </Paper>
      ) : actividad.isError ? (
        <ErrorState error={actividad.error} onRetry={() => actividad.refetch()} />
      ) : (
        <ActividadForm
          key={actividad.data.actividadId}
          modo="edicion"
          valoresIniciales={aFormulario(actividad.data)}
          cancelarA={`/actividades/${id}`}
          onSubmit={async (valores) => {
            await actualizar.mutateAsync({ id, data: aUpdateRequest(valores) })
            toast.exito('Cambios guardados')
            navigate(`/actividades/${id}`, { replace: true })
          }}
        />
      )}
    </>
  )
}
