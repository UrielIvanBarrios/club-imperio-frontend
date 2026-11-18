# Club Imperio Juniors — Front

Aplicación web para la administración del club: personas y socios, actividades, comisiones, inscripciones, asistencia, clases de prueba y usuarios del sistema. Consume la API REST del back, el proyecto `club-imperio-backend` (Spring Boot + PostgreSQL), que es donde están los datos y las reglas de negocio.

## Qué se puede hacer

| Pantalla | Qué hace |
|---|---|
| **Dashboard** | Contadores reales (socios activos, actividades, comisiones, clases de prueba pendientes) y accesos rápidos |
| **Personas** | ABM de personas y socios, búsqueda por DNI, detalle con inscripciones e historial de asistencia |
| **Actividades / Comisiones** | ABM, con el cupo ocupado de cada comisión y bajas en cascada |
| **Inscripciones** | Listado de todas las inscripciones con filtros por actividad, comisión y estado (activas, dadas de baja o todas) y búsqueda por DNI o nombre, que se aplican en el back y quedan en la URL. Desde ahí, inscribir un socio en una comisión viendo el cupo libre |
| **Asistencia** | Planilla de una clase (comisión + fecha): marcar presente o ausente, guardar toda la clase junta y corregir lo cargado |
| **Clases de prueba** | Registrar la clase que pide alguien que quiere conocer una actividad, marcar si vino y agregar observaciones |
| **Importar socios** *(ADMIN)* | Carga masiva desde CSV o Excel, con vista previa y reporte de errores por fila |
| **Usuarios** *(ADMIN)* | ABM de los usuarios que operan el sistema y sus roles |
| **Mi perfil** | Datos del usuario logueado y cambio de su contraseña |

Hay dos roles: **ADMIN** ve todo, y **USER** ve todo menos Importar socios y Usuarios. El back valida el rol en cada request; el front solo oculta lo que no corresponde.

## Stack

React 19 + TypeScript, con Vite. MUI para los componentes, React Router para las rutas, TanStack Query para los datos del back (caché, reintentos e invalidación), React Hook Form + Zod para los formularios.

Tema propio en `src/theme.ts`: azul marino y dorado del club, tipografía Outfit (instalada con `@fontsource`, viaja en el build) y **modo claro y oscuro**. El botón sol/luna de la barra superior cambia el modo; la primera vez se usa la preferencia del sistema y, cuando el usuario elige, se recuerda en `localStorage`.

## Requisitos

- **Node.js 22.12 o superior** (lo pide Vite 8; desarrollado con Node 24).
- **El back levantado**, con su base PostgreSQL. Cómo levantarlo está en el README del back. Desde el punto de vista del front, importan dos cosas de su `application.properties`:
  - `app.cors.allowed-origins` tiene que incluir la URL del front, que por defecto es `http://localhost:5173`. Si no, el navegador bloquea todas las requests.
  - `app.admin.email` / `app.admin.password` es el **ADMIN inicial**: el back lo crea la primera vez, con la tabla de usuarios vacía. Es el usuario para entrar la primera vez.

## Cómo levantarlo

```bash
npm install
cp .env.example .env    # en Windows: copy .env.example .env. Ajustar si hace falta (ver abajo)
npm run dev
```

Abrir `http://localhost:5173` e iniciar sesión con el ADMIN inicial del back.

### El `.env`

| Variable | Para qué | Por defecto |
|---|---|---|
| `VITE_API_URL` | URL del back | `http://localhost:8080` |

`.env` no se versiona; `.env.example` es la plantilla. Lo que empieza con `VITE_` queda **dentro del JavaScript que descarga el navegador**: nunca poner ahí contraseñas ni claves.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Chequeo de tipos (`tsc -b`) y build de producción en `dist/` |
| `npm run preview` | Sirve el build de `dist/` para probarlo |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Pruebas de punta a punta (ver abajo) |

## Pruebas E2E

```bash
npm run test:e2e              # todas
npm run test:e2e -- personas  # solo las que tengan "personas" en el nombre
```

Recorren la app como un usuario (escriben, hacen click, navegan) **contra el back real**: no hace falta `npm run dev`, pero sí el back levantado y PostgreSQL accesible. Cada prueba crea sus propios datos (con el prefijo `TEST-FRONT` y DNI `99xxxxxx`) y **los borra al final por SQL**. No tocan los datos reales.

Necesitan las credenciales del ADMIN y de la base. Si el back está en la carpeta hermana `../club-imperio-backend`, se leen de su `application.properties`. Si no, van por variables de entorno (`E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, `E2E_DB_PASSWORD`, …).

El detalle está en [scripts/e2e/README.md](scripts/e2e/README.md): cómo funcionan, qué cubre cada archivo, las variables y qué hacer si una corrida se corta a la mitad.

## Estructura

```
src/
  api/          cliente HTTP: token, manejo de 401/403 y mensajes de error del back
  auth/         sesión, login y rutas protegidas por rol
  layout/       menú lateral y barra superior (menu.tsx: una sola lista para el menú y los permisos)
  theme.ts      tema de MUI: paleta de cada modo, tipografía, sombras y estilo de tablas, botones y menú
  components/   piezas compartidas: encabezado, estados vacío / error / cargando, formularios, toasts, modo claro / oscuro
  lib/          utilidades: fechas, paginación, filtros en la URL
  features/     un módulo por pantalla
    <módulo>/
      types.ts    contrato con el back
      api.ts      una función por endpoint
      hooks.ts    TanStack Query: lecturas, escrituras y qué se invalida
      schema.ts   validaciones del formulario (Zod)
      components/ pages/ routes.tsx
scripts/
  e2e/          pruebas de punta a punta
  sql/          limpieza manual de datos de prueba
```
