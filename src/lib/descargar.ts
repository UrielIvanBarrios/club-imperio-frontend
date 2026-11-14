// Guarda un Blob como archivo: el navegador lo baja como cualquier descarga.
// (No alcanza con un <a href> al back: la descarga necesita el header Authorization con el token.)
export function guardarArchivo(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
