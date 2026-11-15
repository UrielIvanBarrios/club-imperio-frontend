import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField, Typography } from '@mui/material'
import { useState, type FormEvent } from 'react'
import { useToast } from '../../../components/toast/ToastContext'
import { formatFechaHora } from '../../../lib/format'
import { useAgregarObservacion } from '../hooks'
import { lugarParaNota } from '../schema'
import type { ClasePrueba } from '../types'
import { Notas } from './Notas'

interface Props {
  clase: ClasePrueba | null // null = cerrado
  onClose: () => void
}

// Agregar una nota sin tocar la asistencia. El back la suma a las anteriores (no las pisa).
export function ObservacionDialog({ clase, onClose }: Props) {
  return (
    <Dialog open={!!clase} onClose={onClose} maxWidth="sm" fullWidth>
      {clase && <Formulario key={clase.clasePruebaId} clase={clase} onClose={onClose} />}
    </Dialog>
  )
}

function Formulario({ clase, onClose }: { clase: ClasePrueba; onClose: () => void }) {
  const toast = useToast()
  const agregar = useAgregarObservacion()
  const [nota, setNota] = useState('')
  const [tocado, setTocado] = useState(false)
  const lugar = lugarParaNota(clase)
  const notaLimpia = nota.trim()
  // El back rechaza una nota vacía o una que no entra; se frena antes para avisar sin ir al servidor.
  // La vacía se marca recién al intentar guardar; la que no entra, mientras se escribe.
  const sobran = notaLimpia.length - lugar
  const error = !notaLimpia ? 'Escribí la observación' : sobran > 0 ? `Te pasaste por ${sobran} caracteres` : null
  const errorVisible = sobran > 0 || tocado ? error : null

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setTocado(true)
    if (error) return
    try {
      await agregar.mutateAsync({ id: clase.clasePruebaId, nota: notaLimpia })
      toast.exito(`Se agregó la observación a la clase de prueba de ${clase.persona.nombre} ${clase.persona.apellido}`)
      onClose()
    } catch {
      // El error queda en agregar.error y se muestra arriba
    }
  }

  return (
    <Box component="form" noValidate onSubmit={enviar}>
      <DialogTitle>Agregar observación</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Clase de prueba de <strong>{clase.actividad.nombre}</strong> de <strong>{clase.persona.nombre} {clase.persona.apellido}</strong>, el{' '}
          {formatFechaHora(clase.fechaSolicitada)}.
        </DialogContentText>
        {agregar.error && <Alert severity="error" sx={{ mb: 2 }}>{agregar.error.message}</Alert>}
        <Typography variant="subtitle2">Observaciones anteriores</Typography>
        <Notas clase={clase} vacio="Todavía no tiene observaciones." />
        {lugar <= 0 ? (
          <Alert severity="warning" sx={{ mt: 2 }}>Ya no entran más observaciones: el máximo es de 500 caracteres en total.</Alert>
        ) : (
          <TextField
            name="nota"
            label="Observación nueva"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            multiline
            minRows={2}
            fullWidth
            autoFocus
            required
            sx={{ mt: 2 }}
            error={!!errorVisible}
            helperText={errorVisible ?? `Quedan ${lugar - notaLimpia.length} caracteres`}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={agregar.isPending}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={agregar.isPending || lugar <= 0}>
          {agregar.isPending ? 'Guardando...' : 'Agregar'}
        </Button>
      </DialogActions>
    </Box>
  )
}
