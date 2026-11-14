// Paginación en el front: el back devuelve las listas completas.
// Si la página pedida quedó fuera de rango (ej: una baja vació la última), se muestra la última que existe.
export function paginar<T>(items: T[], paginaPedida: number, porPagina: number) {
  const ultima = Math.max(0, Math.ceil(items.length / porPagina) - 1)
  const pagina = Math.min(Math.max(0, paginaPedida), ultima)
  return { pagina, visibles: items.slice(pagina * porPagina, (pagina + 1) * porPagina) }
}

// Para búsquedas: "Fútbol" encuentra "futbol" y viceversa.
export const normalizarTexto = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
