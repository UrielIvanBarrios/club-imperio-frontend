import { z } from 'zod'
import { hoyISO } from '../../lib/format'
import type { Persona, PersonaCreateRequest, PersonaUpdateRequest } from './types'

// Misma regla que el back (PersonaService.normalizarDni / esDniValido):
// se quitan espacios, puntos y guiones y quedan de 6 a 8 dígitos.
export const normalizarDni = (dni: string) => dni.trim().replace(/[.\s-]/g, '')
export const esDniValido = (dni: string) => /^\d{6,8}$/.test(normalizarDni(dni))
const esEmail = (v: string) => z.email().safeParse(v).success

// Valores del formulario: todo string/boolean, que es lo que manejan los inputs.
// Los opcionales vacíos son '' y se convierten a null al armar el request.
export const personaSchema = z
  .object({
    dni: z.string().trim().min(1, 'El DNI es obligatorio').refine(esDniValido, 'Deben ser de 6 a 8 dígitos, sin letras'),
    nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
    apellido: z.string().trim().min(1, 'El apellido es obligatorio').max(100, 'Máximo 100 caracteres'),
    fechaNacimiento: z
      .string()
      .refine((v) => !v || v <= hoyISO(), 'La fecha no puede ser futura')
      .refine((v) => !v || v >= '1900-01-01', 'Fecha inválida'),
    telefonoPrincipal: z.string().trim().max(20, 'Máximo 20 caracteres'),
    email: z.string().trim().refine((v) => !v || esEmail(v), 'El email no es válido'),
    seAsocia: z.boolean(),
    fechaAltaManual: z.string().refine((v) => !v || v <= hoyISO(), 'La fecha no puede ser futura'),
  })

export type PersonaFormValues = z.infer<typeof personaSchema>

export const valoresVacios: PersonaFormValues = {
  dni: '', nombre: '', apellido: '', fechaNacimiento: '', telefonoPrincipal: '', email: '',
  seAsocia: false, fechaAltaManual: '',
}

// Persona del back → valores del formulario (para editar)
export function aFormulario(p: Persona): PersonaFormValues {
  return {
    dni: p.dni,
    nombre: p.nombre,
    apellido: p.apellido,
    fechaNacimiento: p.fechaNacimiento ?? '',
    telefonoPrincipal: p.telefonoPrincipal ?? '',
    email: p.email ?? '',
    seAsocia: false,
    fechaAltaManual: '',
  }
}

const vacioANull = (v: string) => (v === '' ? null : v)

// Valores del formulario → body del POST
export function aCreateRequest(v: PersonaFormValues): PersonaCreateRequest {
  return {
    dni: normalizarDni(v.dni),
    nombre: v.nombre,
    apellido: v.apellido,
    fechaNacimiento: vacioANull(v.fechaNacimiento),
    telefonoPrincipal: vacioANull(v.telefonoPrincipal),
    email: v.email ? v.email.toLowerCase() : null,
    seAsocia: v.seAsocia,
    fechaAltaManual: v.seAsocia && v.fechaAltaManual ? `${v.fechaAltaManual}T00:00:00` : null,
  }
}

// Valores del formulario → body del PUT (solo lo que el back deja editar)
export function aUpdateRequest(v: PersonaFormValues): PersonaUpdateRequest {
  return {
    nombre: v.nombre,
    apellido: v.apellido,
    email: v.email.toLowerCase(),
    telefonoPrincipal: v.telefonoPrincipal,
  }
}
