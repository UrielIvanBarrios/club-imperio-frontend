import { alpha, createTheme, type PaletteMode, type Shadows, type ThemeOptions } from '@mui/material'
import { esES } from '@mui/material/locale'
// Tipografía instalada con npm (@fontsource): viaja dentro del build, sin depender de Google Fonts
import '@fontsource/outfit/400.css'
import '@fontsource/outfit/500.css'
import '@fontsource/outfit/600.css'
import '@fontsource/outfit/700.css'

// Colores propios del menú lateral (la "marca"). MUI no los trae: se agregan a la paleta
// para que el menú también cambie con el modo y nada quede escrito a mano en el componente.
declare module '@mui/material/styles' {
  interface Palette {
    marca: { fondo: string; texto: string; textoSuave: string; acento: string }
  }
  interface PaletteOptions {
    marca?: Palette['marca']
  }
}

// Una paleta por modo. Azul marino y dorado son los colores del club; en oscuro se aclaran,
// porque un azul marino sobre fondo oscuro no se lee. Los de estado (success, warning, error, info)
// también se ajustan por modo: los usan los chips, la barra de cupo, los avisos y los toasts.
const paletas: Record<PaletteMode, ThemeOptions['palette']> = {
  light: {
    mode: 'light',
    primary: { main: '#1E3A8A', light: '#3B5BB5', dark: '#152A66', contrastText: '#FFFFFF' },
    // El dorado con texto blanco no llega al contraste mínimo: va con texto oscuro
    secondary: { main: '#D4A017', light: '#E8C25A', dark: '#8A6508', contrastText: '#1F1600' },
    success: { main: '#2E7D4F' },
    warning: { main: '#A85800' },
    error: { main: '#C62828' },
    info: { main: '#1F6FB2' },
    background: { default: '#F4F6FB', paper: '#FFFFFF' },
    text: { primary: '#141B2D', secondary: '#5B6478' },
    divider: '#E3E7EF',
    marca: { fondo: '#152A66', texto: '#FFFFFF', textoSuave: 'rgba(255,255,255,0.72)', acento: '#E8C25A' },
  },
  dark: {
    mode: 'dark',
    primary: { main: '#8EA8F5', light: '#B4C6FA', dark: '#5F7FD9', contrastText: '#0B1530' },
    secondary: { main: '#E5B83A', light: '#F0D07A', dark: '#B88D17', contrastText: '#1F1600' },
    success: { main: '#5CC98A' },
    warning: { main: '#F2A93B' },
    error: { main: '#F07474' },
    info: { main: '#62B4EE' },
    background: { default: '#0D1220', paper: '#151B2C' },
    text: { primary: '#E7EAF2', secondary: '#9AA3B8' },
    divider: 'rgba(255,255,255,0.08)',
    marca: { fondo: '#0A0F1B', texto: '#E7EAF2', textoSuave: 'rgba(231,234,242,0.65)', acento: '#E5B83A' },
  },
}

// Sombras suaves y difusas en vez de las de MUI (más duras). MUI pide 25 niveles: 0 es "sin sombra".
const sombras = (modo: PaletteMode): Shadows => {
  const tinte = modo === 'light' ? '20, 30, 60' : '0, 0, 0'
  const fuerza = modo === 'light' ? 1 : 3
  return ['none', ...Array.from({ length: 24 }, (_, i) => {
    const n = i + 1
    return `0 ${Math.ceil(n / 2)}px ${n * 3}px rgba(${tinte}, ${(0.05 * fuerza).toFixed(2)}), 0 1px 2px rgba(${tinte}, ${(0.04 * fuerza).toFixed(2)})`
  })] as Shadows
}

export function crearTema(modo: PaletteMode) {
  const base = createTheme({ palette: paletas[modo] })
  const { palette: p } = base

  return createTheme(
    {
      palette: paletas[modo],
      shape: { borderRadius: 10 },
      shadows: sombras(modo),
      typography: {
        fontFamily: '"Outfit", "Segoe UI", system-ui, sans-serif',
        h4: { fontWeight: 700, letterSpacing: '-0.02em' },
        h5: { fontWeight: 700, letterSpacing: '-0.01em' },
        h6: { fontWeight: 600 },
        button: { fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
        overline: { fontWeight: 600, letterSpacing: '0.12em' },
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: { body: { WebkitFontSmoothing: 'antialiased' } },
        },
        // Barra superior: del color del fondo, con una línea abajo, en vez del bloque azul de MUI
        MuiAppBar: {
          defaultProps: { elevation: 0, color: 'inherit' },
          styleOverrides: {
            root: {
              backgroundColor: alpha(p.background.paper, 0.85),
              backdropFilter: 'blur(8px)',
              color: p.text.primary,
              borderBottom: `1px solid ${p.divider}`,
            },
          },
        },
        // Paneles: en oscuro MUI les suma un degradé blanco según la elevación; se saca y se usa un borde
        MuiPaper: {
          styleOverrides: {
            root: { backgroundImage: 'none' },
            elevation1: { border: `1px solid ${p.divider}` },
          },
        },
        MuiButton: {
          defaultProps: { disableElevation: true },
          styleOverrides: {
            root: { borderRadius: 8, paddingInline: 16 },
            sizeSmall: { paddingInline: 10 },
          },
        },
        MuiIconButton: {
          styleOverrides: { root: { borderRadius: 8 } },
        },
        MuiChip: {
          styleOverrides: { root: { fontWeight: 500, borderRadius: 6 } },
        },
        MuiTableCell: {
          styleOverrides: {
            root: { borderColor: p.divider },
            // Encabezados: chicos, en mayúsculas y sobre un fondo apenas teñido del primario
            head: {
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: p.text.secondary,
              backgroundColor: alpha(p.primary.main, modo === 'light' ? 0.04 : 0.08),
            },
          },
        },
        MuiTableRow: {
          styleOverrides: {
            root: {
              '&.MuiTableRow-hover:hover': { backgroundColor: alpha(p.primary.main, modo === 'light' ? 0.04 : 0.08) },
              '&:last-child td': { borderBottom: 0 },
            },
          },
        },
        MuiTablePagination: {
          styleOverrides: { root: { borderTop: `1px solid ${p.divider}` } },
        },
        MuiAlert: {
          styleOverrides: { root: { borderRadius: 10 } },
        },
        MuiLinearProgress: {
          styleOverrides: { root: { borderRadius: 4 } },
        },
        MuiDialog: {
          styleOverrides: { paper: { borderRadius: 14 } },
        },
        MuiTooltip: {
          styleOverrides: { tooltip: { fontSize: '0.8rem', borderRadius: 6 } },
        },
      },
    },
    esES, // textos de MUI en español (paginación: "Filas por página", "1–10 de 25")
  )
}
