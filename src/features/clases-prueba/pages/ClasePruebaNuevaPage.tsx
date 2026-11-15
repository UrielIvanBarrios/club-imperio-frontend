import { Paper, Skeleton } from '@mui/material'
import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { ErrorState } from '../../../components/ErrorState'
import { PageHeader } from '../../../components/PageHeader'
import { useToast } from '../../../components/toast/ToastContext'
import { formatFechaHora } from '../../../lib/format'
import { useActividades } from '../../actividades/hooks'
import { usePersonas } from '../../personas/hooks'
import { ClasePruebaForm } from '../components/ClasePruebaForm'
import { useClasesPrueba, useRegistrarClasePrueba } from '../hooks'

const FormSkeleton = () => (
  <Paper sx={{ p: 3, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr 1fr' } }} aria-busy="true">
    {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} variant="rounded" height={56} />)}
  </Paper>
)

// /clases-prueba/nueva              → se elige todo
// /clases-prueba/nueva?persona=<id> → desde el detalle de la persona: ya viene elegida
export function ClasePruebaNuevaPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const registrar = useRegistrarClasePrueba()
  const [params] = useSearchParams()
  const personaParam = params.get('persona')

  const personas = usePersonas({})
  const actividades = useActividades()
  // Solo para no ofrecer actividades con una pendiente: si falla, el formulario igual se puede usar
  const clases = useClasesPrueba()
  const activas = useMemo(
    () => (actividades.data ?? []).filter((a) => a.activo).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [actividades.data],
  )
  const personaOrigen = personas.data?.find((p) => p.personaId === personaParam && p.activo)
  const volverA = personaOrigen ? `/personas/${personaOrigen.personaId}` : '/clases-prueba'

  // Si falla un refresco pero ya había datos, se sigue con esos
  const error = [personas, actividades].find((q) => q.isError && !q.data)?.error ?? null

  return (
    <>
      <PageHeader
        titulo="Nueva clase de prueba"
        migas={
          personaOrigen
            ? [{ label: 'Personas', to: '/personas' }, { label: `${personaOrigen.apellido}, ${personaOrigen.nombre}`, to: volverA }, { label: 'Clase de prueba' }]
            : [{ label: 'Clases de prueba', to: '/clases-prueba' }, { label: 'Nueva' }]
        }
      />
      {error ? (
        <ErrorState error={error} onRetry={() => Promise.all([personas.refetch(), actividades.refetch()])} />
      ) : personas.isPending || actividades.isPending ? (
        <FormSkeleton />
      ) : (
        <ClasePruebaForm
          key={personaParam}
          personas={personas.data!}
          actividades={activas}
          clases={clases.data}
          valoresIniciales={{ personaId: personaOrigen?.personaId ?? '' }}
          cancelarA={volverA}
          onSubmit={async ({ personaId, actividadId, fecha, hora }) => {
            const p = personas.data!.find((x) => x.personaId === personaId)!
            const a = activas.find((x) => x.actividadId === actividadId)!
            const fechaHora = `${fecha}T${hora}:00`
            await registrar.mutateAsync({ dni: p.dni, actividadId, fecha: fechaHora })
            toast.exito(`Se registró la clase de prueba de ${p.nombre} ${p.apellido} en ${a.nombre} para el ${formatFechaHora(fechaHora)}`)
            navigate(volverA, { replace: true })
          }}
        />
      )}
    </>
  )
}
