import { z } from 'zod'
import type { Comision, ComisionCreateRequest, ComisionUpdateRequest } from './types'

// Mismas reglas que el back (ComisionService): nombre y horario no vacíos, cupo entero > 0 o sin tope.
// Los largos salen de la tabla (nombre varchar(100), horario varchar(250)).
// El back no valida el vacío en el alta ni recorta espacios: lo cubre el front (trim + min 1).
//
// El schema es una función porque el cupo cambia según el caso: en el alta, vacío = "sin tope";
// en la edición, si la comisión ya tiene cupo, no se le puede quitar (el back ignora el null).
export function comisionSchema({ cupoObligatorio }: { cupoObligatorio: boolean }) {
  return z.object({
    actividadId: z.string().min(1, 'Elegí la actividad'),
    nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
    horario: z.string().trim().min(1, 'El horario es obligatorio').max(250, 'Máximo 250 caracteres'),
    cupo: z
      .string()
      .trim()
      .refine((v) => !cupoObligatorio || v !== '', 'Esta comisión ya tiene cupo: no se le puede quitar el tope')
      .refine((v) => v === '' || /^\d+$/.test(v), 'Ingresá un número entero')
      .refine((v) => v === '' || !/^\d+$/.test(v) || Number(v) > 0, 'El cupo tiene que ser mayor a 0')
      .refine((v) => v === '' || !/^\d+$/.test(v) || Number(v) <= 9999, 'Máximo 9999'),
  })
}

export type ComisionFormValues = z.infer<ReturnType<typeof comisionSchema>>

export const valoresVacios: ComisionFormValues = { actividadId: '', nombre: '', horario: '', cupo: '' }

export function aFormulario(c: Comision): ComisionFormValues {
  return {
    actividadId: c.actividad.actividadId,
    nombre: c.nombre,
    horario: c.horario,
    cupo: c.cupoMaximo === null ? '' : String(c.cupoMaximo),
  }
}

export function aCreateRequest(v: ComisionFormValues): ComisionCreateRequest {
  return { actividadId: v.actividadId, nombre: v.nombre, horario: v.horario, cupo: v.cupo === '' ? null : Number(v.cupo) }
}

// La actividad no se manda: una comisión no se cambia de actividad.
export function aUpdateRequest(v: ComisionFormValues): ComisionUpdateRequest {
  return { nombre: v.nombre, horario: v.horario, ...(v.cupo !== '' && { cupoMaximo: Number(v.cupo) }) }
}
