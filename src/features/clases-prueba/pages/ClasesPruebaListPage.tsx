import AddIcon from '@mui/icons-material/Add'
import { Box, Button, LinearProgress, MenuItem, Paper, TextField } from '@mui/material'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { EmptyState } from '../../../components/EmptyState'
import { ErrorState } from '../../../components/ErrorState'
import { PageHeader } from '../../../components/PageHeader'
import { TableSkeleton } from '../../../components/TableSkeleton'
import { normalizarTexto } from '../../../lib/paginar'
import { useParamsUrl } from '../../../lib/useParamsUrl'
import { ClasesPruebaTable } from '../components/ClasesPruebaTable'
import { COLUMNAS } from '../components/columnas'
import { MarcarAsistenciaDialog } from '../components/MarcarAsistenciaDialog'
import { ObservacionDialog } from '../components/ObservacionDialog'
import { useClasesPrueba } from '../hooks'
import type { ClasePrueba } from '../types'

type Estado = 'pendientes' | 'asistieron' | 'todas'

// Pendientes: la próxima primero (es lo que hay que atender). El resto: lo más reciente primero.
const porFechaAsc = (a: ClasePrueba, b: ClasePrueba) => a.fechaSolicitada.localeCompare(b.fechaSolicitada)
const porFechaDesc = (a: ClasePrueba, b: ClasePrueba) => b.fechaSolicitada.localeCompare(a.fechaSolicitada)

export function ClasesPruebaListPage() {
  // Filtro, búsqueda y página en la URL, como en el resto de los listados
  const { params, cambiar, limpiar } = useParamsUrl()
  const estado = (params.get('estado') as Estado) || 'pendientes'
  const q = params.get('q') ?? ''
  const pagina = Number(params.get('pagina') ?? 0)
  const [porPagina, setPorPagina] = useState(10)
  const [aMarcar, setAMarcar] = useState<ClasePrueba | null>(null)
  const [aObservar, setAObservar] = useState<ClasePrueba | null>(null)

  const query = useClasesPrueba()
  const clases = useMemo(() => {
    const busqueda = normalizarTexto(q)
    return (query.data ?? [])
      .filter((c) => (estado === 'todas' ? true : estado === 'pendientes' ? !c.asistio : c.asistio))
      .filter((c) => !busqueda || normalizarTexto(`${c.persona.dni} ${c.persona.nombre} ${c.persona.apellido} ${c.actividad.nombre}`).includes(busqueda))
      .sort(estado === 'pendientes' ? porFechaAsc : porFechaDesc)
  }, [query.data, estado, q])

  const hayFiltros = estado !== 'pendientes' || !!q

  return (
    <>
      <PageHeader
        titulo="Clases de prueba"
        acciones={
          <Button variant="contained" startIcon={<AddIcon />} component={Link} to="/clases-prueba/nueva">
            Nueva clase de prueba
          </Button>
        }
      />

      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          name="q"
          label="Buscar"
          size="small"
          value={q}
          onChange={(e) => cambiar({ q: e.target.value })}
          placeholder="DNI, nombre o actividad"
          sx={{ flex: '1 1 260px' }}
        />
        <TextField select name="estado" label="Estado" size="small" value={estado}
          onChange={(e) => cambiar({ estado: e.target.value === 'pendientes' ? null : e.target.value })} sx={{ minWidth: 160 }}>
          <MenuItem value="pendientes">Pendientes</MenuItem>
          <MenuItem value="asistieron">Asistieron</MenuItem>
          <MenuItem value="todas">Todas</MenuItem>
        </TextField>
      </Paper>

      <Paper sx={{ overflow: 'hidden' }}>
        {query.isFetching && !query.isPending && <LinearProgress />}

        {query.isPending ? (
          <TableSkeleton columnas={COLUMNAS} />
        ) : query.isError && !query.data ? (
          <Box sx={{ p: 2 }}>
            <ErrorState error={query.error} titulo="No se pudieron cargar las clases de prueba" onRetry={() => query.refetch()} />
          </Box>
        ) : clases.length === 0 ? (
          hayFiltros ? (
            <EmptyState titulo="No hay clases de prueba que coincidan" accion={<Button onClick={limpiar}>Limpiar filtros</Button>} />
          ) : (
            <EmptyState
              titulo={query.data.length === 0 ? 'Todavía no hay clases de prueba' : 'No hay clases de prueba pendientes'}
              descripcion="Registrá la clase que pide alguien que quiere conocer una actividad."
              accion={
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                  <Button variant="contained" startIcon={<AddIcon />} component={Link} to="/clases-prueba/nueva">Nueva clase de prueba</Button>
                  {query.data.length > 0 && <Button onClick={() => cambiar({ estado: 'todas' })}>Ver todas</Button>}
                </Box>
              }
            />
          )
        ) : (
          <ClasesPruebaTable
            clases={clases}
            pagina={pagina}
            porPagina={porPagina}
            onPagina={(p) => cambiar({ pagina: p === 0 ? null : String(p) })}
            onPorPagina={(n) => {
              setPorPagina(n)
              cambiar({ pagina: null })
            }}
            onMarcar={setAMarcar}
            onObservacion={setAObservar}
          />
        )}
      </Paper>

      <MarcarAsistenciaDialog clase={aMarcar} onClose={() => setAMarcar(null)} />
      <ObservacionDialog clase={aObservar} onClose={() => setAObservar(null)} />
    </>
  )
}
