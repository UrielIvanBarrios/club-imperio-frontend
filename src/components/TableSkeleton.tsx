import { Skeleton, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'

// Estado "cargando" de un listado: la forma de la tabla con barras grises.
// Ocupa el mismo lugar que la tabla real, así la pantalla no "salta" cuando llegan los datos.
export function TableSkeleton({ columnas, filas = 5 }: { columnas: string[]; filas?: number }) {
  return (
    <Table aria-busy="true" aria-label="Cargando">
      <TableHead>
        <TableRow>
          {columnas.map((c) => (
            <TableCell key={c}>{c}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {Array.from({ length: filas }, (_, i) => (
          <TableRow key={i}>
            {columnas.map((c) => (
              <TableCell key={c}>
                <Skeleton />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
