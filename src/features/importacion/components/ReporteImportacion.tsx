import { Box, Paper, Tab, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, Tabs, Typography } from '@mui/material'
import { useState } from 'react'
import { paginar } from '../../../lib/paginar'
import type { ReporteImportacion as Reporte } from '../types'

const POR_PAGINA = 25

// Totales + detalle por fila. Se usa para la vista previa (simulación) y para el resultado real.
export function ReporteImportacion({ reporte }: { reporte: Reporte }) {
  // Si hay errores, se abre en esa pestaña: es lo que el usuario tiene que corregir
  const [pestania, setPestania] = useState<'errores' | 'validas'>(reporte.filasConError > 0 ? 'errores' : 'validas')
  const [pagina, setPagina] = useState(0)

  const totales = [
    { label: 'Filas en el archivo', valor: reporte.totalFilas, color: 'text.primary' },
    { label: 'Válidas', valor: reporte.filasValidas, color: 'success.main' },
    { label: 'Con error', valor: reporte.filasConError, color: reporte.filasConError ? 'error.main' : 'text.primary' },
    ...(reporte.simulacion ? [] : [{ label: 'Importadas', valor: reporte.importadas, color: 'primary.main' }]),
  ]
  const errores = paginar(reporte.errores, pagina, POR_PAGINA)
  const validas = paginar(reporte.validas, pagina, POR_PAGINA)
  const total = pestania === 'errores' ? reporte.errores.length : reporte.validas.length
  const p = pestania === 'errores' ? errores.pagina : validas.pagina

  return (
    <Box>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', sm: `repeat(${totales.length}, 1fr)` }, mb: 2 }}>
        {totales.map((t) => (
          <Paper key={t.label} variant="outlined" sx={{ p: 2 }} aria-label={`${t.label}: ${t.valor}`}>
            <Typography variant="caption" color="text.secondary">{t.label}</Typography>
            <Typography variant="h4" component="p" sx={{ color: t.color }}>{t.valor}</Typography>
          </Paper>
        ))}
      </Box>

      <Paper variant="outlined">
        <Tabs
          value={pestania}
          onChange={(_, v) => {
            setPestania(v)
            setPagina(0)
          }}
        >
          <Tab value="errores" label={`Con error (${reporte.filasConError})`} disabled={reporte.filasConError === 0} />
          <Tab value="validas" label={`Válidas (${reporte.filasValidas})`} disabled={reporte.filasValidas === 0} />
        </Tabs>

        {total === 0 ? (
          <Typography color="text.secondary" sx={{ p: 2 }}>No hay filas en esta pestaña.</Typography>
        ) : pestania === 'errores' ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 70 }}>Fila</TableCell>
                <TableCell sx={{ width: 130 }}>DNI</TableCell>
                <TableCell>Errores</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {errores.visibles.map((f) => (
                <TableRow key={f.fila} sx={{ verticalAlign: 'top' }}>
                  <TableCell>{f.fila}</TableCell>
                  <TableCell>{f.dni || '—'}</TableCell>
                  <TableCell>
                    {/* Todos los errores de la fila, para corregirlos de una sola pasada */}
                    <Box component="ul" sx={{ m: 0, pl: 2 }}>
                      {f.errores.map((e) => <li key={e}>{e}</li>)}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 70 }}>Fila</TableCell>
                <TableCell>DNI</TableCell>
                <TableCell>Apellido y nombre</TableCell>
                <TableCell>Socio</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {validas.visibles.map((f) => (
                <TableRow key={f.fila}>
                  <TableCell>{f.fila}</TableCell>
                  <TableCell>{f.dni}</TableCell>
                  <TableCell>{f.apellido}, {f.nombre}</TableCell>
                  <TableCell>{f.socio ? 'Sí' : 'No'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {total > POR_PAGINA && (
          <TablePagination
            component="div"
            count={total}
            page={p}
            rowsPerPage={POR_PAGINA}
            rowsPerPageOptions={[POR_PAGINA]}
            onPageChange={(_, n) => setPagina(n)}
          />
        )}
      </Paper>
    </Box>
  )
}
