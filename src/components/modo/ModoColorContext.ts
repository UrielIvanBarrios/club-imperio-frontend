import type { PaletteMode } from '@mui/material'
import { createContext, useContext } from 'react'

export interface ModoColor {
  modo: PaletteMode
  alternar: () => void
}

export const ModoColorContext = createContext<ModoColor | null>(null)

// Uso: const { modo, alternar } = useModoColor()
export function useModoColor(): ModoColor {
  const ctx = useContext(ModoColorContext)
  if (!ctx) throw new Error('useModoColor se usa dentro de <ModoColorProvider>')
  return ctx
}
