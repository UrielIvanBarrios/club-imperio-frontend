import { z } from 'zod'
import type { Actividad, ActividadCreateRequest, ActividadUpdateRequest } from './types'

// Mismas reglas que el back (ActividadService): nombre obligatorio, precio obligatorio y >= 0.
// Los largos salen de la tabla (nombre varchar(100), descripcion varchar(255)).
// El precio se tipea como texto: así se acepta la coma decimal ("12500,50").
const PRECIO = /^\d+([.,]\d{1,2})?$/

export const actividadSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
  descripcion: z.string().trim().max(255, 'Máximo 255 caracteres'),
  precioMensual: z
    .string()
    .trim()
    .min(1, 'El precio es obligatorio')
    .refine((v) => !v.startsWith('-'), 'El precio no puede ser negativo')
    .refine((v) => v.startsWith('-') || PRECIO.test(v), 'Ingresá un número, con hasta 2 decimales'),
})

export type ActividadFormValues = z.infer<typeof actividadSchema>

export const valoresVacios: ActividadFormValues = { nombre: '', descripcion: '', precioMensual: '' }

const aNumero = (precio: string) => Number(precio.replace(',', '.'))

export function aFormulario(a: Actividad): ActividadFormValues {
  return { nombre: a.nombre, descripcion: a.descripcion ?? '', precioMensual: String(a.precioMensual).replace('.', ',') }
}

export function aCreateRequest(v: ActividadFormValues): ActividadCreateRequest {
  return { nombre: v.nombre, descripcion: v.descripcion || null, precioMensual: aNumero(v.precioMensual) }
}

// descripcion "" se manda tal cual: el back la interpreta como "borrar".
export function aUpdateRequest(v: ActividadFormValues): ActividadUpdateRequest {
  return { nombre: v.nombre, descripcion: v.descripcion, precioMensual: aNumero(v.precioMensual) }
}
