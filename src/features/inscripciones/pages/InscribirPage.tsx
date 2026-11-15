import { Paper, Skeleton } from '@mui/material'
import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { ErrorState } from '../../../components/ErrorState'
import { PageHeader, type Miga } from '../../../components/PageHeader'
import { useToast } from '../../../components/toast/ToastContext'
import { esUuid } from '../../../lib/format'
import { useActividades } from '../../actividades/hooks'
import { useComision } from '../../comisiones/hooks'
import { usePersonas } from '../../personas/hooks'
import { InscripcionForm } from '../components/InscripcionForm'
import { useInscribir } from '../hooks'

const FormSkeleton = () => (
  <Paper sx={{ p: 3, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 2fr' } }} aria-busy="true">
    {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} variant="rounded" height={56} />)}
  </Paper>
)

// /inscripciones                  → se elige todo
// /inscripciones?persona=<id>     → desde el detalle del socio: el socio ya viene elegido
// /inscripciones?comision=<id>    → desde el detalle de la comisión: actividad y comisión ya vienen elegidas
// Al terminar (o cancelar) se vuelve a la pantalla de origen.
export function InscribirPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const inscribir = useInscribir()
  const [params] = useSearchParams()
  const personaParam = params.get('persona')
  const comisionParam = params.get('comision')

  const personas = usePersonas({})
  const actividades = useActividades()
  const comision = useComision(esUuid(comisionParam ?? undefined) ? comisionParam! : undefined)

  // Solo se precarga lo que se puede elegir: una persona o comisión dada de baja no
  const personaOrigen = personas.data?.find((p) => p.personaId === personaParam && p.activo)
  const comisionOrigen = comision.data?.activa ? comision.data : undefined
  const activas = useMemo(
    () => (actividades.data ?? []).filter((a) => a.activo).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [actividades.data],
  )

  const volverA = comisionOrigen ? `/comisiones/${comisionOrigen.comisionId}` : personaOrigen ? `/personas/${personaOrigen.personaId}` : '/personas'
  const migas: Miga[] = comisionOrigen
    ? [{ label: 'Comisiones', to: '/comisiones' }, { label: `${comisionOrigen.actividad.nombre} · ${comisionOrigen.nombre}`, to: volverA }, { label: 'Inscribir socio' }]
    : personaOrigen
      ? [{ label: 'Personas', to: '/personas' }, { label: `${personaOrigen.apellido}, ${personaOrigen.nombre}`, to: volverA }, { label: 'Inscribir' }]
      : [{ label: 'Inscribir socio' }]

  // Solo cuenta el error de la carga inicial: si falla un refresco (ej: después de un rechazo del back),
  // se sigue con los datos que ya había y el formulario no se pierde
  const error = [personas, actividades, comision].find((q) => q.isError && !q.data)?.error ?? null
  const cargando = personas.isPending || actividades.isPending || (!!comisionParam && esUuid(comisionParam) && comision.isPending)

  return (
    <>
      <PageHeader titulo="Inscribir socio" migas={migas} />
      {error ? (
        <ErrorState
          error={error}
          onRetry={() => {
            personas.refetch()
            actividades.refetch()
            if (comision.isError) comision.refetch()
          }}
        />
      ) : cargando ? (
        <FormSkeleton />
      ) : (
        <InscripcionForm
          // key: si cambia el origen (misma ruta, mismo componente), el formulario se arma de cero
          key={`${personaParam}-${comisionParam}`}
          personas={personas.data!}
          actividades={activas}
          valoresIniciales={{
            personaId: personaOrigen?.personaId ?? '',
            actividadId: comisionOrigen?.actividad.actividadId ?? '',
            comisionId: comisionOrigen?.comisionId ?? '',
          }}
          cancelarA={volverA}
          onSubmit={async ({ personaId, comisionId }) => {
            const p = personas.data!.find((x) => x.personaId === personaId)!
            const i = await inscribir.mutateAsync({ dni: p.dni, comisionId })
            toast.exito(`Se inscribió a ${p.nombre} ${p.apellido} en ${i.comision.actividad.nombre} · ${i.comision.nombre}`)
            // Sin origen, se va al socio: ahí se ve la inscripción nueva
            navigate(comisionOrigen || personaOrigen ? volverA : `/personas/${p.personaId}`, { replace: true })
          }}
        />
      )}
    </>
  )
}
