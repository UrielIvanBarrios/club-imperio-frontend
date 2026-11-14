import { z } from 'zod'
import type { Comision, ComisionCreateRequest, ComisionUpdateRequest } from './types'

// Mismas reglas que el back (ComisionService), que también las valida: actividad obligatoria,
// nombre y horario no vacíos (se recortan los espacios), cupo entero > 0 o "sin tope".
// Los largos salen de la tabla (nombre varchar(100), horario varchar(250)).
//
// El sin tope es una casilla aparte: si está marcada, el cupo no se usa; si no, el cupo es obligatorio.
// Así nunca se manda cupoMaximo junto con sinTope (el back rechaza esa combinación).
const ENTERO = /^\d+$/

export const comisionSchema = z
  .object({
    actividadId: z.string().min(1, 'Elegí la actividad'),
    nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
    horario: z.string().trim().min(1, 'El horario es obligatorio').max(250, 'Máximo 250 caracteres'),
    sinTope: z.boolean(),
    cupo: z.string().trim(),
  })
  .refine((v) => v.sinTope || v.cupo !== '', { path: ['cupo'], message: 'Ingresá el cupo o marcá "Sin tope de cupo"' })
  .refine((v) => v.sinTope || v.cupo === '' || ENTERO.test(v.cupo), { path: ['cupo'], message: 'Ingresá un número entero' })
  .refine((v) => v.sinTope || !ENTERO.test(v.cupo) || Number(v.cupo) > 0, { path: ['cupo'], message: 'El cupo tiene que ser mayor a 0' })
  .refine((v) => v.sinTope || !ENTERO.test(v.cupo) || Number(v.cupo) <= 9999, { path: ['cupo'], message: 'Máximo 9999' })

export type ComisionFormValues = z.infer<typeof comisionSchema>

export const valoresVacios: ComisionFormValues = { actividadId: '', nombre: '', horario: '', sinTope: false, cupo: '' }

export function aFormulario(c: Comision): ComisionFormValues {
  return {
    actividadId: c.actividad.actividadId,
    nombre: c.nombre,
    horario: c.horario,
    sinTope: c.cupoMaximo === null,
    cupo: c.cupoMaximo === null ? '' : String(c.cupoMaximo),
  }
}

// Sin tope en el alta = no mandar el parámetro cupo
export function aCreateRequest(v: ComisionFormValues): ComisionCreateRequest {
  return { actividadId: v.actividadId, nombre: v.nombre, horario: v.horario, cupo: v.sinTope ? null : Number(v.cupo) }
}

// La actividad no se manda: una comisión no se cambia de actividad.
// Cupo: o sinTope: true, o cupoMaximo: N. Nunca los dos.
export function aUpdateRequest(v: ComisionFormValues): ComisionUpdateRequest {
  return { nombre: v.nombre, horario: v.horario, ...(v.sinTope ? { sinTope: true } : { cupoMaximo: Number(v.cupo) }) }
}
