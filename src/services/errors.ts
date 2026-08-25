function getCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    return (error as { code?: string }).code ?? undefined;
  }
  return undefined;
}

export function traducirErrorAuth(error: unknown): string {
  const mensaje = error instanceof Error ? error.message : String(error);
  const codigo = getCode(error);

  if (/network request failed|fetch failed|failed to fetch/i.test(mensaje)) {
    return 'Sin conexión a internet. Revisá tu conexión e intentá de nuevo.';
  }
  if (codigo === 'invalid_credentials' || /invalid login credentials/i.test(mensaje)) {
    return 'Email o contraseña incorrectos.';
  }
  if (codigo === 'user_already_exists' || /already registered|already exists/i.test(mensaje)) {
    return 'Ese email ya está registrado.';
  }
  if (codigo === 'weak_password' || /password should be at least/i.test(mensaje)) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (codigo === 'email_not_confirmed' || /email not confirmed/i.test(mensaje)) {
    return 'Confirmá tu email antes de iniciar sesión. Revisá tu casilla de correo.';
  }
  if (codigo === 'over_email_send_rate_limit' || /rate limit/i.test(mensaje)) {
    return 'Hiciste demasiados intentos. Esperá unos minutos e intentá de nuevo.';
  }
  if (codigo === 'invalid_email' || codigo === 'email_address_invalid' || /invalid email|email address .* is invalid/i.test(mensaje)) {
    return 'El email no es válido.';
  }
  if (codigo === 'same_password') {
    return 'La nueva contraseña tiene que ser distinta a la actual.';
  }

  return 'Ocurrió un error. Intentá de nuevo en unos minutos.';
}

export function traducirErrorDatos(error: unknown): string {
  const mensaje = error instanceof Error ? error.message : String(error);

  if (/network request failed|fetch failed|failed to fetch/i.test(mensaje)) {
    return 'Sin conexión a internet. No se guardaron los cambios, intentá de nuevo.';
  }
  if (/violates check constraint|check_violation/i.test(mensaje)) {
    return 'Los datos ingresados no son válidos.';
  }
  if (/violates foreign key constraint/i.test(mensaje)) {
    return 'No se pudo completar la operación: hay datos relacionados inválidos.';
  }
  if (/row-level security/i.test(mensaje)) {
    return 'No tenés permiso para hacer esta operación.';
  }

  return 'Ocurrió un error al guardar. Intentá de nuevo.';
}
