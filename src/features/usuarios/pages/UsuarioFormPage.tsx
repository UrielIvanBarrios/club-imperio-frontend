import KeyIcon from '@mui/icons-material/Key'
import PersonOffIcon from '@mui/icons-material/PersonOff'
import RestoreIcon from '@mui/icons-material/Restore'
import { Alert, Button, Paper, Skeleton, Tooltip } from '@mui/material'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../../../api/client'
import { useAuth } from '../../../auth/AuthContext'
import { ErrorState } from '../../../components/ErrorState'
import { PageHeader } from '../../../components/PageHeader'
import { useToast } from '../../../components/toast/ToastContext'
import { esUuid } from '../../../lib/format'
import { CambiarPasswordDialog } from '../components/CambiarPasswordDialog'
import { DesactivarUsuarioDialog } from '../components/DesactivarUsuarioDialog'
import { ChipEstadoUsuario } from '../components/UsuarioChips'
import { UsuarioForm } from '../components/UsuarioForm'
import { useActualizarUsuario, useCrearUsuario, useUsuario } from '../hooks'
import { aCreateRequest, aFormulario, aUpdateRequest } from '../schema'
import type { Usuario } from '../types'

// Una sola página para /usuarios/nuevo y /usuarios/:id/editar: si hay :id, es edición.
// (Usuarios no tiene pantalla de detalle: todo lo que hay para ver está en el formulario.)
export function UsuarioFormPage() {
  const { id } = useParams()
  return id ? <EditarUsuario id={id} /> : <NuevoUsuario />
}

function NuevoUsuario() {
  const navigate = useNavigate()
  const toast = useToast()
  const crear = useCrearUsuario()

  return (
    <>
      <PageHeader titulo="Nuevo usuario" migas={[{ label: 'Usuarios', to: '/usuarios' }, { label: 'Nuevo' }]} />
      <UsuarioForm
        modo="alta"
        cancelarA="/usuarios"
        onSubmit={async (valores) => {
          const usuario = await crear.mutateAsync(aCreateRequest(valores))
          toast.exito(`Usuario creado: ${usuario.nombre} (${usuario.rol})`)
          navigate('/usuarios', { replace: true })
        }}
      />
    </>
  )
}

function EditarUsuario({ id }: { id: string }) {
  const valido = esUuid(id)
  const usuario = useUsuario(valido ? id : undefined)
  const volver = <Button color="inherit" size="small" component={Link} to="/usuarios">Volver al listado</Button>

  if (!valido) return <ErrorState titulo="No existe el usuario" error={new Error('El link no es válido.')} accion={volver} />
  if (usuario.isPending) {
    return (
      <>
        <PageHeader titulo="Editar usuario" migas={[{ label: 'Usuarios', to: '/usuarios' }, { label: 'Editar' }]} />
        <Paper sx={{ p: 3, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} variant="rounded" height={56} />)}
        </Paper>
      </>
    )
  }
  if (usuario.isError) {
    const noExiste = usuario.error instanceof ApiError && usuario.error.status === 400
    return <ErrorState error={usuario.error} onRetry={noExiste ? undefined : () => usuario.refetch()} accion={noExiste ? volver : undefined} />
  }
  return <Edicion usuario={usuario.data} />
}

function Edicion({ usuario: u }: { usuario: Usuario }) {
  const navigate = useNavigate()
  const toast = useToast()
  const { usuario: logueado } = useAuth()
  const actualizar = useActualizarUsuario()
  const [desactivarAbierto, setDesactivarAbierto] = useState(false)
  const [passwordAbierto, setPasswordAbierto] = useState(false)
  const esUnoMismo = u.usuarioId === logueado?.usuarioId

  return (
    <>
      <PageHeader
        titulo={`Editar usuario: ${u.nombre}`}
        migas={[{ label: 'Usuarios', to: '/usuarios' }, { label: u.nombre }]}
        acciones={
          <>
            <ChipEstadoUsuario activo={u.activo} />
            {esUnoMismo ? (
              <Button variant="outlined" startIcon={<KeyIcon />} component={Link} to="/perfil">Cambiar mi contraseña</Button>
            ) : (
              <Button variant="outlined" startIcon={<KeyIcon />} onClick={() => setPasswordAbierto(true)}>Cambiar contraseña</Button>
            )}
            {u.activo ? (
              <Tooltip title={esUnoMismo ? 'No podés desactivar tu propio usuario' : ''}>
                <span>
                  <Button variant="outlined" color="error" startIcon={<PersonOffIcon />} disabled={esUnoMismo} onClick={() => setDesactivarAbierto(true)}>
                    Desactivar
                  </Button>
                </span>
              </Tooltip>
            ) : (
              <Button
                variant="outlined"
                color="success"
                startIcon={<RestoreIcon />}
                disabled={actualizar.isPending}
                onClick={() =>
                  actualizar.mutate(
                    { id: u.usuarioId, data: { activo: true } },
                    { onSuccess: () => toast.exito(`Se reactivó a ${u.nombre}`), onError: (e) => toast.error(e.message) },
                  )
                }
              >
                {actualizar.isPending ? 'Reactivando...' : 'Reactivar'}
              </Button>
            )}
          </>
        }
      />

      {/* El tooltip no se ve en el celular: la explicación también queda escrita */}
      {esUnoMismo && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Este es tu usuario. No podés quitarte el rol de ADMIN ni desactivarte: así el sistema siempre tiene al menos un ADMIN.
          Tu contraseña se cambia en Mi perfil, donde se pide la actual.
        </Alert>
      )}
      {!u.activo && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Este usuario está desactivado: no puede iniciar sesión.
        </Alert>
      )}

      <UsuarioForm
        key={u.usuarioId}
        modo="edicion"
        esUnoMismo={esUnoMismo}
        valoresIniciales={aFormulario(u)}
        cancelarA="/usuarios"
        onSubmit={async (valores) => {
          await actualizar.mutateAsync({ id: u.usuarioId, data: aUpdateRequest(valores) })
          toast.exito('Cambios guardados')
          navigate('/usuarios', { replace: true })
        }}
      />

      <DesactivarUsuarioDialog usuario={desactivarAbierto ? u : null} onClose={() => setDesactivarAbierto(false)} />
      <CambiarPasswordDialog usuario={passwordAbierto ? u : null} onClose={() => setPasswordAbierto(false)} />
    </>
  )
}
