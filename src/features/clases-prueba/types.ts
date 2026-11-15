import type { InscripcionPersona } from '../inscripciones/types'

// Contrato con el back: /api/clases-prueba (ver docs/api-spec.md del back).
// ClasePruebaResponse: la persona viene como PersonaResponse y la actividad tal cual la entidad.
// Se tipa solo lo que usa el front.
export interface ClasePrueba {
  clasePruebaId: string
  persona: InscripcionPersona
  actividad: { actividadId: string; nombre: string; activo: boolean }
  fechaSolicitada: string // LocalDateTime "aaaa-mm-ddTHH:mm:ss"
  // El back no distingue "no vino" de "todavía no vino": asistio = false es "pendiente",
  // y mientras haya una pendiente no se puede registrar otra de la misma actividad para esa persona.
  asistio: boolean
  costo: number | null // el back no tiene cómo cargarlo
  // Notas separadas por " | Nota: " (agregar una observación concatena). Máximo 500 caracteres:
  // el back rechaza (400) una nota vacía o lo que pase ese largo.
  observaciones: string | null
  fechaCreacion: string
}

// POST /api/clases-prueba/registrar?dni=&actividadId=&fecha=aaaa-mm-ddTHH:mm:ss
export interface ClasePruebaCreateRequest {
  dni: string
  actividadId: string
  fecha: string
}
