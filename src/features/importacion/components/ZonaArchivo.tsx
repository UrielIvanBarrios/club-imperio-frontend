import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { Box, Typography } from '@mui/material'
import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react'

interface Props {
  archivo: File | null
  onArchivo: (archivo: File) => void
  deshabilitada?: boolean
}

const tamanio = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`)

// Zona para elegir (click o teclado) o arrastrar un archivo. El <input type="file"> queda oculto:
// la zona entera hace de botón, que es más fácil de usar que el input del navegador.
export function ZonaArchivo({ archivo, onArchivo, deshabilitada = false }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [arrastrando, setArrastrando] = useState(false)

  const abrir = () => !deshabilitada && input.current?.click()
  const alSoltar = (e: DragEvent) => {
    e.preventDefault() // sin esto el navegador abre el archivo en otra pestaña
    setArrastrando(false)
    const f = e.dataTransfer.files[0]
    if (f && !deshabilitada) onArchivo(f)
  }
  const alTeclear = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      abrir()
    }
  }

  return (
    <Box
      role="button"
      tabIndex={deshabilitada ? -1 : 0}
      aria-label="Elegir o arrastrar el archivo de socios"
      aria-disabled={deshabilitada}
      onClick={abrir}
      onKeyDown={alTeclear}
      onDragOver={(e) => {
        e.preventDefault()
        if (!deshabilitada) setArrastrando(true)
      }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={alSoltar}
      sx={{
        border: 2,
        borderStyle: 'dashed',
        borderColor: arrastrando ? 'primary.main' : 'divider',
        bgcolor: arrastrando ? 'action.hover' : 'background.paper',
        borderRadius: 2,
        p: 4,
        textAlign: 'center',
        cursor: deshabilitada ? 'default' : 'pointer',
        opacity: deshabilitada ? 0.6 : 1,
        transition: 'border-color .15s, background-color .15s',
        '&:focus-visible': { outline: 2, outlineColor: 'primary.main', outlineOffset: 2 },
      }}
    >
      <input
        ref={input}
        type="file"
        hidden
        accept=".csv,.xlsx"
        data-testid="input-archivo"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onArchivo(f)
          e.target.value = '' // permite volver a elegir el mismo archivo después de corregirlo
        }}
      />
      {archivo ? (
        <>
          <InsertDriveFileIcon color="primary" sx={{ fontSize: 40 }} />
          <Typography sx={{ fontWeight: 500 }}>{archivo.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {tamanio(archivo.size)}{deshabilitada ? '' : ' · Hacé click o arrastrá otro para cambiarlo'}
          </Typography>
        </>
      ) : (
        <>
          <UploadFileIcon color="action" sx={{ fontSize: 40 }} />
          <Typography sx={{ fontWeight: 500 }}>Arrastrá el archivo acá o hacé click para elegirlo</Typography>
          <Typography variant="body2" color="text.secondary">.csv o .xlsx · hasta 5 MB y 5000 filas</Typography>
        </>
      )}
    </Box>
  )
}
