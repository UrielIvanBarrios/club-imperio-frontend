import EditIcon from '@mui/icons-material/Edit'
import KeyIcon from '@mui/icons-material/Key'
import PersonOffIcon from '@mui/icons-material/PersonOff'
import RestoreIcon from '@mui/icons-material/Restore'
import { Chip, IconButton, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, Tooltip } from '@mui/material'
import { useNavigate } from 'react-router'
import { paginar } from '../../../lib/paginar'
import type { Usuario } from '../types'
import { COLUMNAS } from './columnas'
import { ChipEstadoUsuario, ChipRol } from './UsuarioChips'

const soloDesktop = { display: { xs: 'none', md: 'table-cell' } }

interface Props {
  usuarios: Usuario[] // ya filtrados y ordenados: la tabla solo pagina y dibuja
  idLogueado: string
  pagina: number
  porPagina: number
  onPagina: (pagina: number) => void
  onPorPagina: (porPagina: number) => void
  onCambiarPassword: (usuario: Usuario) => void
  onDesactivar: (usuario: Usuario) => void
  onReactivar: (usuario: Usuario) => void
}

export function UsuariosTable({ usuarios, idLogueado, pagina: paginaPedida, porPagina, onPagina, onPorPagina, onCambiarPassword, onDesactivar, onReactivar }: Props) {
  const navigate = useNavigate()
  const { pagina, visibles } = paginar(usuarios, paginaPedida, porPagina)

  return (
    <>
      <Table>
        <TableHead>
          <TableRow>
            {COLUMNAS.map((c) => (
              <TableCell key={c} sx={c === 'Email' ? soloDesktop : undefined} align={c === 'Acciones' ? 'right' : 'left'}>{c}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {visibles.map((u) => {
            const esUnoMismo = u.usuarioId === idLogueado
            return (
              <TableRow key={u.usuarioId} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/usuarios/${u.usuarioId}/editar`)}>
                <TableCell>
                  {u.nombre} {esUnoMismo && <Chip label="Vos" size="small" color="primary" sx={{ ml: 1 }} />}
                </TableCell>
                <TableCell sx={soloDesktop}>{u.email}</TableCell>
                <TableCell><ChipRol rol={u.rol} /></TableCell>
                <TableCell><ChipEstadoUsuario activo={u.activo} /></TableCell>
                {/* stopPropagation: el click en un botón no tiene que abrir también la edición */}
                <TableCell align="right" onClick={(e) => e.stopPropagation()} sx={{ whiteSpace: 'nowrap' }}>
                  <Tooltip title="Editar">
                    <IconButton size="small" aria-label={`Editar a ${u.nombre}`} onClick={() => navigate(`/usuarios/${u.usuarioId}/editar`)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {/* La propia contraseña se cambia en Mi perfil, donde se pide la actual */}
                  <Tooltip title={esUnoMismo ? 'Tu contraseña se cambia en Mi perfil' : 'Cambiar contraseña'}>
                    <IconButton
                      size="small"
                      aria-label={`Cambiar la contraseña de ${u.nombre}`}
                      onClick={() => (esUnoMismo ? navigate('/perfil') : onCambiarPassword(u))}
                    >
                      <KeyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {u.activo ? (
                    // Regla del back: un ADMIN no puede desactivarse a sí mismo (el sistema nunca queda sin ADMIN)
                    <Tooltip title={esUnoMismo ? 'No podés desactivar tu propio usuario: el sistema tiene que tener siempre un ADMIN activo' : 'Desactivar'}>
                      <span>
                        <IconButton size="small" aria-label={`Desactivar a ${u.nombre}`} disabled={esUnoMismo} onClick={() => onDesactivar(u)}>
                          <PersonOffIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Reactivar">
                      <IconButton size="small" aria-label={`Reactivar a ${u.nombre}`} onClick={() => onReactivar(u)}>
                        <RestoreIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={usuarios.length}
        page={pagina}
        rowsPerPage={porPagina}
        rowsPerPageOptions={[10, 25, 50]}
        onPageChange={(_, p) => onPagina(p)}
        onRowsPerPageChange={(e) => onPorPagina(Number(e.target.value))}
      />
    </>
  )
}
