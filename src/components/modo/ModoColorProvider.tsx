import { CssBaseline, ThemeProvider, type PaletteMode } from '@mui/material'
import { useMemo, useState, type ReactNode } from 'react'
import { crearTema } from '../../theme'
import { ModoColorContext, type ModoColor } from './ModoColorContext'

const CLAVE = 'club-imperio:modo'

// localStorage puede fallar (navegación privada estricta, almacenamiento bloqueado o lleno):
// en ese caso se sigue sin recordar la elección, pero la app no se rompe.
function leerGuardado(): PaletteMode | null {
  try {
    const v = localStorage.getItem(CLAVE)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

function guardar(modo: PaletteMode) {
  try {
    localStorage.setItem(CLAVE, modo)
  } catch {
    // sin almacenamiento: el modo dura hasta cerrar la pestaña
  }
}

// La primera vez (nada guardado) se respeta la preferencia del sistema operativo.
// Se resuelve antes del primer render, así la app no aparece clara y después cambia a oscura.
function modoInicial(): PaletteMode {
  const guardado = leerGuardado()
  if (guardado) return guardado
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// Arma el tema de MUI según el modo y se lo da a toda la app. Solo se guarda en localStorage
// cuando el usuario elige con el botón: mientras no elija, manda la preferencia del sistema.
export function ModoColorProvider({ children }: { children: ReactNode }) {
  const [modo, setModo] = useState<PaletteMode>(modoInicial)
  const tema = useMemo(() => crearTema(modo), [modo])

  const valor = useMemo<ModoColor>(() => ({
    modo,
    alternar: () => {
      const nuevo = modo === 'light' ? 'dark' : 'light'
      guardar(nuevo)
      setModo(nuevo)
    },
  }), [modo])

  return (
    <ModoColorContext.Provider value={valor}>
      <ThemeProvider theme={tema}>
        {/* enableColorScheme: también las barras de scroll y los controles nativos siguen el modo */}
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </ModoColorContext.Provider>
  )
}
