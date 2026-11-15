import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import NoteAddIcon from '@mui/icons-material/NoteAdd'
import {
  Box, IconButton, Link as MuiLink, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, Tooltip, Typography,
} from '@mui/material'
import { Link } from 'react-router'
import { formatFechaHora } from '../../../lib/format'
import { paginar } from '../../../lib/paginar'
import type { ClasePrueba } from '../types'
import { ChipEstadoClase } from './ChipEstadoClase'
import { COLUMNAS } from './columnas'
import { Notas } from './Notas'

interface Props {
  clases: ClasePrueba[] // ya filtradas y ordenadas: la tabla solo pagina y dibuja
  pagina: number
  porPagina: number
  onPagina: (pagina: number) => void
  onPorPagina: (porPagina: number) => void
  onMarcar: (clase: ClasePrueba) => void
  onObservacion: (clase: ClasePrueba) => void
}

export function ClasesPruebaTable({ clases, pagina: paginaPedida, porPagina, onPagina, onPorPagina, onMarcar, onObservacion }: Props) {
  const { pagina, visibles } = paginar(clases, paginaPedida, porPagina)

  return (
    <>
      <Table>
        <TableHead>
          <TableRow>
            {COLUMNAS.map((c) => (
              <TableCell key={c} align={c === 'Acciones' ? 'right' : 'left'}>{c}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {visibles.map((c) => {
            const quien = `${c.persona.apellido}, ${c.persona.nombre}`
            return (
              <TableRow key={c.clasePruebaId}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatFechaHora(c.fechaSolicitada)}</TableCell>
                <TableCell>
                  <MuiLink component={Link} to={`/personas/${c.persona.personaId}`} underline="hover">{quien}</MuiLink>
                  {/* Un socio que prueba otra actividad no es lo mismo que alguien que todavía no es del club */}
                  <Typography variant="body2" color="text.secondary">DNI {c.persona.dni}{c.persona.esSocioActivo ? ' · Socio' : ''}</Typography>
                </TableCell>
                <TableCell>{c.actividad.nombre}</TableCell>
                <TableCell><ChipEstadoClase clase={c} /></TableCell>
                <TableCell sx={{ maxWidth: 320 }}><Notas clase={c} /></TableCell>
                <TableCell align="right">
                  <Box sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="Marcar asistencia">
                      <IconButton size="small" aria-label={`Marcar asistencia de ${quien}`} onClick={() => onMarcar(c)}>
                        <EventAvailableIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Agregar observación">
                      <IconButton size="small" aria-label={`Agregar observación a ${quien}`} onClick={() => onObservacion(c)}>
                        <NoteAddIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {/* El back devuelve la lista completa (no pagina), así que se pagina acá */}
      <TablePagination
        component="div"
        count={clases.length}
        page={pagina}
        rowsPerPage={porPagina}
        rowsPerPageOptions={[10, 25, 50]}
        onPageChange={(_, p) => onPagina(p)}
        onRowsPerPageChange={(e) => onPorPagina(Number(e.target.value))}
      />
    </>
  )
}
