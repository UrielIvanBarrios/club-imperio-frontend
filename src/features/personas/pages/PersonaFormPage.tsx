import { Paper, Skeleton } from '@mui/material'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { ErrorState } from '../../../components/ErrorState'
import { PageHeader } from '../../../components/PageHeader'
import { useToast } from '../../../components/toast/ToastContext'
import { esUuid } from '../../../lib/format'
import { PersonaForm } from '../components/PersonaForm'
import { useActualizarPersona, useCrearPersona, usePersona } from '../hooks'
import { aCreateRequest, aFormulario, aUpdateRequest } from '../schema'

// Una sola página para /personas/nueva y /personas/:id/editar: si hay :id, es edición.
export function PersonaFormPage() {
  const { id } = useParams()
  return id ? <EditarPersona id={id} /> : <NuevaPersona />
}

function NuevaPersona() {
  const navigate = useNavigate()
  const toast = useToast()
  const crear = useCrearPersona()
  const [params] = useSearchParams() // viene con ?dni= desde "Darla de alta" en la búsqueda

  return (
    <>
      <PageHeader titulo="Nueva persona" migas={[{ label: 'Personas', to: '/personas' }, { label: 'Nueva' }]} />
      <PersonaForm
        modo="alta"
        valoresIniciales={{ dni: params.get('dni') ?? '' }}
        cancelarA="/personas"
        onSubmit={async (valores) => {
          const persona = await crear.mutateAsync(aCreateRequest(valores))
          toast.exito(`Persona creada: ${persona.nombre} ${persona.apellido}`)
          navigate(`/personas/${persona.personaId}`, { replace: true })
        }}
      />
    </>
  )
}

function EditarPersona({ id }: { id: string }) {
  const navigate = useNavigate()
  const toast = useToast()
  const actualizar = useActualizarPersona()
  const valido = esUuid(id)
  const persona = usePersona(valido ? id : undefined)
  const migas = [{ label: 'Personas', to: '/personas' }, ...(persona.data ? [{ label: `${persona.data.apellido}, ${persona.data.nombre}`, to: `/personas/${id}` }] : []), { label: 'Editar' }]

  if (!valido) return <ErrorState titulo="No existe la persona" error={new Error('El link no es válido.')} />

  return (
    <>
      <PageHeader titulo="Editar persona" migas={migas} />
      {persona.isPending ? (
        // Skeleton con la forma del formulario mientras llegan los datos a editar
        <Paper sx={{ p: 3, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} variant="rounded" height={56} />)}
        </Paper>
      ) : persona.isError ? (
        <ErrorState error={persona.error} onRetry={() => persona.refetch()} />
      ) : (
        <PersonaForm
          // key: si cambia la persona, el formulario se arma de cero con sus datos
          key={persona.data.personaId}
          modo="edicion"
          valoresIniciales={aFormulario(persona.data)}
          cancelarA={`/personas/${id}`}
          onSubmit={async (valores) => {
            await actualizar.mutateAsync({ id, data: aUpdateRequest(valores) })
            toast.exito('Cambios guardados')
            navigate(`/personas/${id}`, { replace: true })
          }}
        />
      )}
    </>
  )
}
