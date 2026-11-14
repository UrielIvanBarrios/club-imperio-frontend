import { TextField, type TextFieldProps } from '@mui/material'
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form'

type Props<T extends FieldValues> = Omit<TextFieldProps, 'name' | 'error'> & {
  name: Path<T>
  control: Control<T>
}

// TextField de MUI conectado a React Hook Form: muestra el valor, y el error de Zod
// (o del back) debajo del campo. Si no hay error, muestra el helperText normal.
export function FormTextField<T extends FieldValues>({ name, control, helperText, type, slotProps, ...props }: Props<T>) {
  const { field, fieldState } = useController({ name, control })
  const { ref, ...campo } = field
  return (
    <TextField
      {...props}
      {...campo}
      type={type}
      inputRef={ref} // al enviar con errores, RHF hace foco en el primer campo inválido
      error={!!fieldState.error}
      helperText={fieldState.error?.message ?? helperText}
      fullWidth
      // En los date la etiqueta va siempre arriba, si no se superpone con "dd/mm/aaaa"
      slotProps={type === 'date' ? { ...slotProps, inputLabel: { shrink: true } } : slotProps}
    />
  )
}
