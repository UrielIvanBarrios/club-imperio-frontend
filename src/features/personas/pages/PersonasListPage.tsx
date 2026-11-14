import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import { Box, Button, LinearProgress, MenuItem, Paper, TextField } from '@mui/material'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { EmptyState } from '../../../components/EmptyState'
import { ErrorState } from '../../../components/ErrorState'
import { PageHeader } from '../../../components/PageHeader'
import { TableSkeleton } from '../../../components/TableSkeleton'
import { useParamsUrl } from '../../../lib/useParamsUrl'
import { BajaPersonaDialog } from '../components/BajaPersonaDialog'
import { COLUMNAS } from '../components/columnas'
import { PersonasTable } from '../components/PersonasTable'
import { usePersonaPorDni, usePersonas } from '../hooks'
import { esDniValido, normalizarDni } from '../schema'
import type { Persona, PersonaFiltros } from '../types'

type Estado = 'activos' | 'inactivos' | 'todos'
type Socio = 'todos' | 'socios' | 'noSocios'

const aFiltros = (estado: Estado, socio: Socio): PersonaFiltros => ({
  activo: estado === 'todos' ? undefined : estado === 'activos',
  esSocio: socio === 'todos' ? undefined : socio === 'socios',
})

const porApellido = (a: Persona, b: Persona) =>
  a.apellido.localeCompare(b.apellido, 'es') || a.nombre.localeCompare(b.nombre, 'es')

export function PersonasListPage() {
  // Filtros, búsqueda y página viven en la URL (?estado=todos&pagina=2): al volver
  // del detalle con "atrás" se encuentra el listado como estaba, y se puede compartir el link.
  const { params, cambiar, limpiar } = useParamsUrl()
  const estado = (params.get('estado') as Estado) || 'activos'
  const socio = (params.get('socio') as Socio) || 'todos'
  const dniBuscado = params.get('dni')
  const pagina = Number(params.get('pagina') ?? 0)
  const [porPagina, setPorPagina] = useState(10)

  const [dniInput, setDniInput] = useState(dniBuscado ?? '')
  const [dniError, setDniError] = useState<string | null>(null)
  const [aDarDeBaja, setADarDeBaja] = useState<Persona | null>(null)

  // Con DNI buscado se usa /buscar; si no, el listado con filtros. Solo una de las dos consultas corre.
  const listado = usePersonas(aFiltros(estado, socio), !dniBuscado)
  const busqueda = usePersonaPorDni(dniBuscado)
  const query = dniBuscado ? busqueda : listado

  const personas = useMemo(() => {
    if (dniBuscado) return busqueda.data ? [busqueda.data] : []
    return [...(listado.data ?? [])].sort(porApellido)
  }, [dniBuscado, busqueda.data, listado.data])

  const buscar = (e: FormEvent) => {
    e.preventDefault()
    if (!dniInput.trim()) return limpiarBusqueda()
    if (!esDniValido(dniInput)) return setDniError('Deben ser de 6 a 8 dígitos')
    setDniError(null)
    cambiar({ dni: normalizarDni(dniInput) })
  }
  const limpiarBusqueda = () => {
    setDniInput('')
    setDniError(null)
    cambiar({ dni: null })
  }

  const hayFiltros = estado !== 'activos' || socio !== 'todos'

  return (
    <>
      <PageHeader
        titulo="Personas"
        acciones={
          <Button variant="contained" startIcon={<AddIcon />} component={Link} to="/personas/nueva">
            Nueva persona
          </Button>
        }
      />

      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <Box component="form" onSubmit={buscar} sx={{ display: 'flex', gap: 1, flex: '1 1 280px' }}>
          <TextField
            label="Buscar por DNI"
            size="small"
            value={dniInput}
            onChange={(e) => setDniInput(e.target.value)}
            error={!!dniError}
            helperText={dniError}
            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
            sx={{ flexGrow: 1 }}
          />
          <Button type="submit" variant="outlined" startIcon={<SearchIcon />}>
            Buscar
          </Button>
          {dniBuscado && <Button onClick={limpiarBusqueda}>Limpiar</Button>}
        </Box>
        <TextField select label="Estado" size="small" value={estado} disabled={!!dniBuscado}
          onChange={(e) => cambiar({ estado: e.target.value === 'activos' ? null : e.target.value })} sx={{ minWidth: 140 }}>
          <MenuItem value="activos">Activos</MenuItem>
          <MenuItem value="inactivos">Inactivos</MenuItem>
          <MenuItem value="todos">Todos</MenuItem>
        </TextField>
        <TextField select label="Socio" size="small" value={socio} disabled={!!dniBuscado}
          onChange={(e) => cambiar({ socio: e.target.value === 'todos' ? null : e.target.value })} sx={{ minWidth: 140 }}>
          <MenuItem value="todos">Todos</MenuItem>
          <MenuItem value="socios">Socios</MenuItem>
          <MenuItem value="noSocios">No socios</MenuItem>
        </TextField>
      </Paper>

      <Paper sx={{ overflow: 'hidden' }}>
        {/* Barra fina cuando se refrescan datos que ya estaban en pantalla (ej: después de una baja) */}
        {query.isFetching && !query.isPending && <LinearProgress />}

        {query.isPending ? (
          <TableSkeleton columnas={COLUMNAS} />
        ) : query.isError ? (
          <Box sx={{ p: 2 }}>
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          </Box>
        ) : personas.length === 0 ? (
          dniBuscado ? (
            <EmptyState
              titulo={`No hay ninguna persona con DNI ${dniBuscado}`}
              accion={<Button variant="contained" component={Link} to={`/personas/nueva?dni=${dniBuscado}`}>Darla de alta</Button>}
            />
          ) : hayFiltros ? (
            <EmptyState
              titulo="No hay personas que coincidan con los filtros"
              accion={<Button onClick={limpiar}>Limpiar filtros</Button>}
            />
          ) : (
            <EmptyState
              titulo="Todavía no hay personas cargadas"
              descripcion="Empezá dando de alta a la primera, o importalas desde un Excel."
              accion={<Button variant="contained" startIcon={<AddIcon />} component={Link} to="/personas/nueva">Agregar persona</Button>}
            />
          )
        ) : (
          <PersonasTable
            personas={personas}
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

      <BajaPersonaDialog persona={aDarDeBaja} onClose={() => setADarDeBaja(null)} />
    </>
  )
}
