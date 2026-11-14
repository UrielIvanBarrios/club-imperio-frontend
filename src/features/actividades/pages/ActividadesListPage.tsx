import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import { Box, Button, InputAdornment, LinearProgress, MenuItem, Paper, TextField } from '@mui/material'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { EmptyState } from '../../../components/EmptyState'
import { ErrorState } from '../../../components/ErrorState'
import { PageHeader } from '../../../components/PageHeader'
import { TableSkeleton } from '../../../components/TableSkeleton'
import { normalizarTexto } from '../../../lib/paginar'
import { useParamsUrl } from '../../../lib/useParamsUrl'
import { ActividadesTable } from '../components/ActividadesTable'
import { BajaActividadDialog } from '../components/BajaActividadDialog'
import { COLUMNAS } from '../components/columnas'
import { useActividades } from '../hooks'
import type { Actividad } from '../types'

type Estado = 'activas' | 'inactivas' | 'todas'

export function ActividadesListPage() {
  // Búsqueda, filtro y página en la URL (?q=futbol&estado=todas&pagina=1), igual que en Personas
  const { params, cambiar, limpiar } = useParamsUrl()
  const q = params.get('q') ?? ''
  const estado = (params.get('estado') as Estado) || 'activas'
  const pagina = Number(params.get('pagina') ?? 0)
  const [porPagina, setPorPagina] = useState(10)
  const [aDarDeBaja, setADarDeBaja] = useState<Actividad | null>(null)

  const query = useActividades()

  // El back devuelve todas (activas e inactivas) y no tiene búsqueda parcial: se filtra acá.
  const actividades = useMemo(() => {
    const texto = normalizarTexto(q)
    return (query.data ?? [])
      .filter((a) => estado === 'todas' || a.activo === (estado === 'activas'))
      .filter((a) => !texto || normalizarTexto(a.nombre).includes(texto))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [query.data, q, estado])

  const hayFiltros = !!q || estado !== 'activas'

  return (
    <>
      <PageHeader
        titulo="Actividades"
        acciones={
          <Button variant="contained" startIcon={<AddIcon />} component={Link} to="/actividades/nueva">
            Nueva actividad
          </Button>
        }
      />

      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {/* Filtra mientras se escribe: los datos ya están en memoria, no hay llamada al back */}
        <TextField
          label="Buscar por nombre"
          size="small"
          value={q}
          onChange={(e) => cambiar({ q: e.target.value })}
          sx={{ flex: '1 1 260px' }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
        />
        <TextField select label="Estado" size="small" value={estado}
          onChange={(e) => cambiar({ estado: e.target.value === 'activas' ? null : e.target.value })} sx={{ minWidth: 140 }}>
          <MenuItem value="activas">Activas</MenuItem>
          <MenuItem value="inactivas">Inactivas</MenuItem>
          <MenuItem value="todas">Todas</MenuItem>
        </TextField>
      </Paper>

      <Paper sx={{ overflow: 'hidden' }}>
        {query.isFetching && !query.isPending && <LinearProgress />}

        {query.isPending ? (
          <TableSkeleton columnas={COLUMNAS} />
        ) : query.isError ? (
          <Box sx={{ p: 2 }}>
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          </Box>
        ) : actividades.length === 0 ? (
          hayFiltros ? (
            <EmptyState
              titulo="No hay actividades que coincidan"
              descripcion={q ? `No se encontró ninguna actividad con "${q}".` : undefined}
              accion={<Button onClick={limpiar}>Limpiar filtros</Button>}
            />
          ) : (
            <EmptyState
              titulo="Todavía no hay actividades cargadas"
              descripcion="Cargá la primera (ej: Fútbol 11) para después armar sus comisiones."
              accion={<Button variant="contained" startIcon={<AddIcon />} component={Link} to="/actividades/nueva">Agregar actividad</Button>}
            />
          )
        ) : (
          <ActividadesTable
            actividades={actividades}
            pagina={pagina}
            porPagina={porPagina}
            onPagina={(p) => cambiar({ pagina: p === 0 ? null : String(p) })}
            onPorPagina={(n) => {
              setPorPagina(n)
              cambiar({ pagina: null })
            }}
            onBaja={setADarDeBaja}
          />
        )}
      </Paper>

      <BajaActividadDialog actividad={aDarDeBaja} onClose={() => setADarDeBaja(null)} />
    </>
  )
}
