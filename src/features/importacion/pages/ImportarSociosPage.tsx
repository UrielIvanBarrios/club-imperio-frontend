import DownloadIcon from '@mui/icons-material/Download'
import { Alert, AlertTitle, Box, Button, LinearProgress, Paper, Step, StepLabel, Stepper, Typography } from '@mui/material'
import { useState } from 'react'
import { Link } from 'react-router'
import { ApiError } from '../../../api/client'
import { PageHeader } from '../../../components/PageHeader'
import { useToast } from '../../../components/toast/ToastContext'
import { ReporteImportacion } from '../components/ReporteImportacion'
import { ZonaArchivo } from '../components/ZonaArchivo'
import { useDescargarPlantilla, useImportarSocios } from '../hooks'

// Pantalla 17 (solo ADMIN). Tres pasos: elegir el archivo → revisar la simulación → importar de verdad.
// La simulación (?simular=true) valida todo sin guardar nada: es la vista previa antes de confirmar.
const PASOS = ['Elegir archivo', 'Revisar', 'Importar']
const EXTENSIONES = /\.(csv|xlsx)$/i

export function ImportarSociosPage() {
  const toast = useToast()
  const [archivo, setArchivo] = useState<File | null>(null)
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null)
  const simulacion = useImportarSocios()
  const importacion = useImportarSocios()
  const plantilla = useDescargarPlantilla()

  const paso = importacion.data ? 2 : simulacion.data ? 1 : 0
  const ocupado = simulacion.isPending || importacion.isPending

  const elegir = (f: File) => {
    simulacion.reset()
    importacion.reset()
    // Chequeo inmediato de la extensión (el back también lo valida). El tamaño lo controla el back
    // (413): el límite es configuración suya y así no hay dos números que mantener iguales.
    if (!EXTENSIONES.test(f.name)) {
      setArchivo(null)
      setErrorArchivo(`"${f.name}" no es un .csv ni un .xlsx. Elegí la planilla de socios en uno de esos formatos.`)
      return
    }
    setErrorArchivo(null)
    setArchivo(f)
  }

  const empezarDeNuevo = () => {
    setArchivo(null)
    setErrorArchivo(null)
    simulacion.reset()
    importacion.reset()
  }

  return (
    <>
      <PageHeader
        titulo="Importar socios"
        acciones={
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            disabled={plantilla.isPending}
            onClick={() => plantilla.mutate(undefined, { onError: (e) => toast.error(e.message) })}
          >
            {plantilla.isPending ? 'Descargando...' : 'Descargar plantilla'}
          </Button>
        }
      />

      <Stepper activeStep={paso} sx={{ mb: 3 }} alternativeLabel>
        {PASOS.map((p, i) => (
          <Step key={p} completed={paso > i || (i === 2 && !!importacion.data)}>
            <StepLabel>{p}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {paso < 2 && (
        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Columnas obligatorias: <strong>dni</strong>, <strong>nombre</strong> y <strong>apellido</strong>. Opcionales:
            fecha_nacimiento, telefono, email y socio (SI/NO). Sirve el CSV que exporta Excel (con ; o ,) o un .xlsx. Si no
            sabés cómo armarlo, descargá la plantilla.
          </Typography>
          <ZonaArchivo archivo={archivo} onArchivo={elegir} deshabilitada={ocupado} />

          {errorArchivo && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <AlertTitle>Formato no soportado</AlertTitle>
              {errorArchivo}
            </Alert>
          )}
          <ErrorDelArchivo error={simulacion.error} onRetry={() => archivo && simulacion.mutate({ archivo, simular: true })} />

          {paso === 0 && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" disabled={!archivo || ocupado} onClick={() => archivo && simulacion.mutate({ archivo, simular: true })}>
                {simulacion.isPending ? 'Validando...' : 'Validar archivo'}
              </Button>
            </Box>
          )}
          {simulacion.isPending && <LinearProgress sx={{ mt: 2 }} />}
        </Paper>
      )}

      {paso === 1 && simulacion.data && (
        <Paper sx={{ p: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <AlertTitle>Vista previa: todavía no se guardó nada</AlertTitle>
            {simulacion.data.filasValidas === 0
              ? 'Ninguna fila es válida. Corregí los errores en el archivo y volvé a elegirlo.'
              : `Si confirmás, se importan las ${simulacion.data.filasValidas} filas válidas, todas juntas.` +
                (simulacion.data.filasConError ? ` Las ${simulacion.data.filasConError} filas con error se saltean: corregilas en el archivo y volvé a importarlo.` : '')}
          </Alert>
          <ReporteImportacion reporte={simulacion.data} />
          <ErrorDelArchivo error={importacion.error} titulo="No se pudo importar" onRetry={() => archivo && importacion.mutate({ archivo, simular: false })} />
          <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Button onClick={empezarDeNuevo} disabled={ocupado}>Elegir otro archivo</Button>
            <Button
              variant="contained"
              disabled={simulacion.data.filasValidas === 0 || ocupado}
              onClick={() => archivo && importacion.mutate({ archivo, simular: false })}
            >
              {importacion.isPending
                ? 'Importando...'
                : `Importar ${simulacion.data.filasValidas} ${simulacion.data.filasValidas === 1 ? 'socio' : 'socios'}`}
            </Button>
          </Box>
          {importacion.isPending && <LinearProgress sx={{ mt: 2 }} />}
        </Paper>
      )}

      {paso === 2 && importacion.data && (
        <Paper sx={{ p: 3 }}>
          <Alert severity={importacion.data.importadas > 0 ? 'success' : 'warning'} sx={{ mb: 2 }}>
            <AlertTitle>
              {importacion.data.importadas === 1 ? 'Se importó 1 socio' : `Se importaron ${importacion.data.importadas} socios`}
            </AlertTitle>
            {/* Entre la vista previa y la confirmación alguien pudo haber cargado uno de esos DNIs */}
            {simulacion.data && importacion.data.importadas !== simulacion.data.filasValidas
              ? `La vista previa tenía ${simulacion.data.filasValidas} filas válidas: algo cambió en el medio (por ejemplo, alguien cargó uno de esos DNIs). Abajo está el detalle.`
              : importacion.data.filasConError
                ? `Las ${importacion.data.filasConError} filas con error no se importaron.`
                : 'Todas las filas del archivo se importaron.'}
          </Alert>
          <ReporteImportacion reporte={importacion.data} />
          <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button onClick={empezarDeNuevo}>Importar otro archivo</Button>
            <Button variant="contained" component={Link} to="/personas">Ver socios</Button>
          </Box>
        </Paper>
      )}
    </>
  )
}

// Errores del archivo entero (no de una fila): 413 por tamaño, 400 por formato, columnas faltantes,
// archivo dañado o vacío. El mensaje del back ya explica qué pasó; acá se le pone un título claro.
function ErrorDelArchivo({ error, titulo, onRetry }: { error: Error | null; titulo?: string; onRetry: () => void }) {
  if (!error) return null
  const status = error instanceof ApiError ? error.status : 0
  const encabezado =
    status === 413 ? 'El archivo es demasiado grande' : status === 400 ? (titulo ?? 'No se pudo procesar el archivo') : (titulo ?? 'No se pudo validar el archivo')
  const ayuda =
    status === 413
      ? ' Dividí la planilla en partes más chicas.'
      : status === 400
        ? ' Corregí el archivo (o usá la plantilla) y volvé a elegirlo.'
        : ''
  return (
    <Alert
      severity="error"
      sx={{ mt: 2 }}
      // Reintentar solo tiene sentido si falló la conexión: con un 400/413 el mismo archivo da lo mismo
      action={status === 0 || status >= 500 ? <Button color="inherit" size="small" onClick={onRetry}>Reintentar</Button> : undefined}
    >
      <AlertTitle>{encabezado}</AlertTitle>
      {error.message}
      {ayuda}
    </Alert>
  )
}
