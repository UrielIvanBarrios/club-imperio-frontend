import {
  Alert, AlertTitle, Box, Button, Table, TableBody, TableCell, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material'
import { useState } from 'react'
import { Link } from 'react-router'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { EmptyState } from '../../../components/EmptyState'
import { ErrorState } from '../../../components/ErrorState'
import { TableSkeleton } from '../../../components/TableSkeleton'
import { useToast } from '../../../components/toast/ToastContext'
import { contar, formatFecha } from '../../../lib/format'
import type { Comision } from '../../comisiones/types'
import { useInscripcionesPorComision } from '../../inscripciones/hooks'
import type { Inscripcion } from '../../inscripciones/types'
import { useAsistenciaDeClase, useCorregirAsistencia, useGuardarClase } from '../hooks'
import type { Asistencia } from '../types'
import { ChipAsistencia } from './ChipAsistencia'

interface Props {
  comision: Comision
  fecha: string // "aaaa-mm-dd", ya validada (no futura)
}

const COLUMNAS = ['Inscripto', 'DNI', 'Asistencia']
const nombre = (i: Inscripcion) => `${i.persona.apellido}, ${i.persona.nombre}`

// La planilla de una clase: los inscriptos activos de la comisión, cada uno con Presente / Ausente.
// Se arma de cero para cada comisión y fecha (la página le pone key), así las marcas no pasan de una clase a otra.
export function PlanillaAsistencia({ comision, fecha }: Props) {
  const toast = useToast()
  const inscripciones = useInscripcionesPorComision(comision.comisionId)
  const clase = useAsistenciaDeClase(comision.comisionId, fecha) // lo ya cargado de esta clase
  const guardar = useGuardarClase()
  const [marcas, setMarcas] = useState<Record<string, boolean>>({}) // inscripcionId → presente
  const [rechazo, setRechazo] = useState<{ error: Error; enviadas: Inscripcion[] } | null>(null)
  const [corrigiendo, setCorrigiendo] = useState<Asistencia | null>(null)

  // Si falla un refresco pero ya había datos, se sigue con esos
  const error = [inscripciones, clase].find((q) => q.isError && !q.data)?.error
  if (error) {
    return (
      <ErrorState
        error={error}
        titulo="No se pudieron cargar los inscriptos"
        onRetry={() => Promise.all([inscripciones.refetch(), clase.refetch()])}
      />
    )
  }
  if (!inscripciones.data || !clase.data) return <TableSkeleton columnas={COLUMNAS} filas={4} />

  const cargadas = new Map(clase.data.map((a) => [a.inscripcion.inscripcionId, a]))
  // También se listan las asistencias de esta fecha de inscripciones que después se dieron de baja: son parte de la clase
  const activas = new Set(inscripciones.data.map((i) => i.inscripcionId))
  const lista = [...inscripciones.data, ...clase.data.filter((a) => !activas.has(a.inscripcion.inscripcionId)).map((a) => a.inscripcion)]
    .sort((a, b) => nombre(a).localeCompare(nombre(b), 'es'))
  if (lista.length === 0) {
    return (
      <EmptyState
        titulo="La comisión no tiene inscriptos activos"
        descripcion="Inscribí socios para poder tomar asistencia."
        accion={<Button variant="outlined" component={Link} to={`/inscripciones?comision=${comision.comisionId}`}>Inscribir socio</Button>}
      />
    )
  }

  // El back no acepta asistencias anteriores a la inscripción: quien se anotó después de esta clase no se marca
  const inscriptoDespues = (i: Inscripcion) => !cargadas.has(i.inscripcionId) && i.fechaInscripcion > fecha
  const pendientes = inscripciones.data
    .filter((i) => !cargadas.has(i.inscripcionId) && !inscriptoDespues(i))
    .sort((a, b) => nombre(a).localeCompare(nombre(b), 'es'))
  const faltan = pendientes.filter((i) => marcas[i.inscripcionId] === undefined).length
  const presentesCargados = clase.data.filter((a) => a.presente).length
  const presentesMarcados = pendientes.filter((i) => marcas[i.inscripcionId]).length

  const marcar = (i: Inscripcion, presente: boolean) => setMarcas((m) => ({ ...m, [i.inscripcionId]: presente }))
  const todosPresentes = () => setMarcas(Object.fromEntries(pendientes.map((i) => [i.inscripcionId, true])))

  const onGuardar = async () => {
    setRechazo(null)
    const enviadas = pendientes
    try {
      const guardadas = await guardar.mutateAsync({
        comisionId: comision.comisionId,
        fecha,
        asistencias: enviadas.map((i) => ({ inscripcionId: i.inscripcionId, presente: marcas[i.inscripcionId] })),
      })
      setMarcas({})
      const presentes = guardadas.filter((a) => a.presente).length
      toast.exito(`Asistencia guardada: ${contar(presentes, 'presente')} y ${contar(guardadas.length - presentes, 'ausente')}`)
    } catch (e) {
      // No se guardó nada: las marcas quedan para corregir y volver a guardar
      setRechazo({ error: e as Error, enviadas })
    }
  }

  return (
    <>
      {rechazo && <ErrorDelGuardado {...rechazo} />}

      {pendientes.length === 0 ? (
        clase.data.length > 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            <AlertTitle>La asistencia de esta clase ya se cargó</AlertTitle>
            {formatFecha(fecha)}: {contar(presentesCargados, 'presente')} y {contar(clase.data.length - presentesCargados, 'ausente')}. Para
            corregir a alguien, usá "Corregir" en su fila.
          </Alert>
        ) : (
          <Alert severity="info" sx={{ mb: 2 }}>
            Nadie estaba inscripto el {formatFecha(fecha)}: los inscriptos actuales se anotaron después.
          </Alert>
        )
      ) : clase.data.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Esta clase ya tiene cargada la asistencia de {clase.data.length} de {clase.data.length + pendientes.length} inscriptos. Marcá a los que faltan.
        </Alert>
      )}

      <Table size="small">
        <TableHead>
          <TableRow>
            {COLUMNAS.map((c) => <TableCell key={c}>{c}</TableCell>)}
          </TableRow>
        </TableHead>
        <TableBody>
          {lista.map((i) => {
            const guardada = cargadas.get(i.inscripcionId)
            return (
              <TableRow key={i.inscripcionId}>
                <TableCell>{nombre(i)}</TableCell>
                <TableCell>{i.persona.dni}</TableCell>
                <TableCell>
                  {guardada ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <ChipAsistencia presente={guardada.presente} />
                      <Typography variant="body2" color="text.secondary">
                        {activas.has(i.inscripcionId) ? 'Ya cargada' : 'Ya cargada · inscripción dada de baja'}
                      </Typography>
                      <Button size="small" onClick={() => setCorrigiendo(guardada)} disabled={guardar.isPending} aria-label={`Corregir la asistencia de ${nombre(i)}`}>
                        Corregir
                      </Button>
                    </Box>
                  ) : inscriptoDespues(i) ? (
                    <Typography variant="body2" color="text.secondary">Se inscribió el {formatFecha(i.fechaInscripcion)}</Typography>
                  ) : (
                    // Un click: el valor elegido queda marcado; volver a tocar el mismo no lo desmarca
                    <ToggleButtonGroup
                      size="small"
                      exclusive
                      aria-label={`Asistencia de ${nombre(i)}`}
                      value={marcas[i.inscripcionId] === undefined ? null : marcas[i.inscripcionId] ? 'presente' : 'ausente'}
                      onChange={(_, v: string | null) => v && marcar(i, v === 'presente')}
                      disabled={guardar.isPending}
                    >
                      <ToggleButton value="presente" color="success">Presente</ToggleButton>
                      <ToggleButton value="ausente" color="error">Ausente</ToggleButton>
                    </ToggleButtonGroup>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {pendientes.length > 0 && (
        <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button onClick={todosPresentes} disabled={guardar.isPending}>Todos presentes</Button>
          <Typography color="text.secondary" sx={{ flexGrow: 1 }} aria-live="polite">
            {faltan > 0
              ? `Faltan marcar ${faltan} de ${pendientes.length}`
              : `${contar(presentesMarcados, 'presente')} y ${contar(pendientes.length - presentesMarcados, 'ausente')}`}
          </Typography>
          {/* Se guarda todo junto: hasta no marcar a todos, no se puede guardar */}
          <Button variant="contained" onClick={onGuardar} disabled={faltan > 0 || guardar.isPending}>
            {guardar.isPending ? 'Guardando...' : 'Guardar asistencia'}
          </Button>
        </Box>
      )}

      <CorregirDialog asistencia={corrigiendo} onClose={() => setCorrigiendo(null)} />
    </>
  )
}

// El back junta todos los errores del lote en un mensaje:
// "No se guardó ninguna asistencia. Fila 2 (Pérez, Ana): <motivo>. Fila 3 (Gómez, Luis): <motivo>."
// Se separa por fila para mostrar una lista. La fila N es la N-ésima enviada, así el nombre sale de lo enviado
// (algunos errores, como "la inscripción no existe", no lo traen).
const LOTE = /^No se guardó ninguna asistencia\.\s*/
const FILA = /^Fila (\d+)(?: \(.*?\))?: (.*)$/s
const DUPLICADA = /ya existe un registro de asistencia/i

function erroresPorFila(mensaje: string, enviadas: Inscripcion[]) {
  if (!LOTE.test(mensaje)) return null // error de toda la clase (comisión dada de baja, fecha futura) o sin conexión
  return mensaje
    .replace(LOTE, '')
    .split(/\s(?=Fila \d+[ :])/)
    .map((parte) => {
      const m = FILA.exec(parte)
      if (!m) return { quien: null, motivo: parte }
      const inscripcion = enviadas[Number(m[1]) - 1]
      return { quien: inscripcion ? nombre(inscripcion) : `Fila ${m[1]}`, motivo: m[2] }
    })
}

// El guardado es todo o nada: si el back rechaza, no se guardó ninguna.
function ErrorDelGuardado({ error, enviadas }: { error: Error; enviadas: Inscripcion[] }) {
  const filas = erroresPorFila(error.message, enviadas)
  return (
    <Alert severity="error" sx={{ mb: 2 }}>
      <AlertTitle>No se guardó ninguna asistencia</AlertTitle>
      {!filas ? (
        error.message
      ) : (
        <>
          {filas.some((f) => DUPLICADA.test(f.motivo)) && (
            <Box>Mientras marcabas, alguien cargó parte de esta clase. Abajo ya se ve lo que quedó guardado: revisá a los que faltan y volvé a guardar.</Box>
          )}
          <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
            {filas.map((f, n) => <li key={n}>{f.quien ? `${f.quien}: ${f.motivo}` : f.motivo}</li>)}
          </Box>
        </>
      )}
    </Alert>
  )
}

// Corregir una asistencia ya cargada: se invierte presente / ausente, con confirmación.
function CorregirDialog({ asistencia, onClose }: { asistencia: Asistencia | null; onClose: () => void }) {
  const toast = useToast()
  const corregir = useCorregirAsistencia()
  const cerrar = () => {
    corregir.reset()
    onClose()
  }
  const quien = asistencia ? nombre(asistencia.inscripcion) : ''
  const nuevo = asistencia ? !asistencia.presente : true
  const texto = (presente: boolean) => (presente ? 'Presente' : 'Ausente')

  return (
    <ConfirmDialog
      open={!!asistencia}
      titulo="Corregir asistencia"
      mensaje={
        <>
          <strong>{quien}</strong> figura <strong>{texto(!nuevo)}</strong> en la clase del {asistencia && formatFecha(asistencia.fecha)}. ¿Cambiarlo a{' '}
          {texto(nuevo)}?
        </>
      }
      textoConfirmar={`Cambiar a ${texto(nuevo)}`}
      textoPendiente="Guardando..."
      color="primary"
      isPending={corregir.isPending}
      error={corregir.error}
      onConfirm={() =>
        asistencia &&
        corregir.mutate(
          { asistenciaId: asistencia.asistenciaId, presente: nuevo },
          {
            onSuccess: () => {
              toast.exito(`Se corrigió la asistencia de ${quien}: ${texto(nuevo)}`)
              cerrar()
            },
          },
        )
      }
      onClose={cerrar}
    />
  )
}
