import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import { Box, Button, InputAdornment, LinearProgress, MenuItem, Paper, TextField } from '@mui/material'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../../auth/AuthContext'
import { EmptyState } from '../../../components/EmptyState'
import { ErrorState } from '../../../components/ErrorState'
import { PageHeader } from '../../../components/PageHeader'
import { TableSkeleton } from '../../../components/TableSkeleton'
import { useToast } from '../../../components/toast/ToastContext'
import { normalizarTexto } from '../../../lib/paginar'
import { useParamsUrl } from '../../../lib/useParamsUrl'
import { CambiarPasswordDialog } from '../components/CambiarPasswordDialog'
import { COLUMNAS } from '../components/columnas'
import { DesactivarUsuarioDialog } from '../components/DesactivarUsuarioDialog'
import { UsuariosTable } from '../components/UsuariosTable'
import { useActualizarUsuario, useUsuarios } from '../hooks'
import type { Usuario } from '../types'

type Estado = 'activos' | 'inactivos' | 'todos'
type RolFiltro = 'todos' | 'ADMIN' | 'USER'

export function UsuariosListPage() {
  const { usuario: logueado } = useAuth()
  const toast = useToast()
  const { params, cambiar, limpiar } = useParamsUrl()
  const q = params.get('q') ?? ''
  const estado = (params.get('estado') as Estado) || 'activos'
  const rol = (params.get('rol') as RolFiltro) || 'todos'
  const pagina = Number(params.get('pagina') ?? 0)
  const [porPagina, setPorPagina] = useState(10)
  const [aDesactivar, setADesactivar] = useState<Usuario | null>(null)
  const [aCambiarPassword, setACambiarPassword] = useState<Usuario | null>(null)

  const query = useUsuarios()
  const reactivar = useActualizarUsuario()

  const usuarios = useMemo(() => {
    const texto = normalizarTexto(q)
    return (query.data ?? [])
      .filter((u) => estado === 'todos' || u.activo === (estado === 'activos'))
      .filter((u) => rol === 'todos' || u.rol === rol)
      .filter((u) => !texto || normalizarTexto(`${u.nombre} ${u.email}`).includes(texto))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [query.data, q, estado, rol])

  const hayFiltros = !!q || estado !== 'activos' || rol !== 'todos'

  return (
    <>
      <PageHeader
        titulo="Usuarios"
        acciones={
          <Button variant="contained" startIcon={<AddIcon />} component={Link} to="/usuarios/nuevo">
            Nuevo usuario
          </Button>
        }
      />

      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          label="Buscar por nombre o email"
          size="small"
          value={q}
          onChange={(e) => cambiar({ q: e.target.value })}
          sx={{ flex: '1 1 240px' }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
        />
        <TextField select label="Rol" size="small" value={rol}
          onChange={(e) => cambiar({ rol: e.target.value === 'todos' ? null : e.target.value })} sx={{ minWidth: 120 }}>
          <MenuItem value="todos">Todos</MenuItem>
          <MenuItem value="ADMIN">ADMIN</MenuItem>
          <MenuItem value="USER">USER</MenuItem>
        </TextField>
        <TextField select label="Estado" size="small" value={estado}
          onChange={(e) => cambiar({ estado: e.target.value === 'activos' ? null : e.target.value })} sx={{ minWidth: 140 }}>
          <MenuItem value="activos">Activos</MenuItem>
          <MenuItem value="inactivos">Inactivos</MenuItem>
          <MenuItem value="todos">Todos</MenuItem>
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
        ) : usuarios.length === 0 ? (
          // Siempre existe al menos un usuario (el ADMIN logueado): vacío solo puede ser por los filtros
          <EmptyState titulo="No hay usuarios que coincidan" accion={hayFiltros && <Button onClick={limpiar}>Limpiar filtros</Button>} />
        ) : (
          <UsuariosTable
            usuarios={usuarios}
            idLogueado={logueado?.usuarioId ?? ''}
            pagina={pagina}
            porPagina={porPagina}
            onPagina={(p) => cambiar({ pagina: p === 0 ? null : String(p) })}
            onPorPagina={(n) => {
              setPorPagina(n)
              cambiar({ pagina: null })
            }}
            onCambiarPassword={setACambiarPassword}
            onDesactivar={setADesactivar}
            onReactivar={(u) =>
              reactivar.mutate(
                { id: u.usuarioId, data: { activo: true } },
                { onSuccess: () => toast.exito(`Se reactivó a ${u.nombre}`), onError: (e) => toast.error(e.message) },
              )
            }
          />
        )}
      </Paper>

      <DesactivarUsuarioDialog usuario={aDesactivar} onClose={() => setADesactivar(null)} />
      <CambiarPasswordDialog usuario={aCambiarPassword} onClose={() => setACambiarPassword(null)} />
    </>
  )
}
