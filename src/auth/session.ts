import type { Usuario } from '../api/types'

// La sesión se guarda en localStorage para que sobreviva a un F5.
// El token no es secreto para el usuario (está firmado, no cifrado) y vence a las 8 h.
const KEY = 'club-imperio.sesion'

export interface Session {
  token: string
  expiraEn: string
  usuario: Usuario
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as Session
    // Si ya venció, ni la usamos: el back respondería 401 igual.
    if (new Date(session.expiraEn).getTime() <= Date.now()) {
      clearSession()
      return null
    }
    return session
  } catch {
    return null
  }
}

export function saveSession(session: Session) {
  localStorage.setItem(KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(KEY)
}

export function getToken(): string | null {
  return loadSession()?.token ?? null
}
