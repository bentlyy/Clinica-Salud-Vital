/**
 * Credenciales derivadas para usuarios seed.
 *
 * Cada usuario seed recibe una contraseña ÚNICA derivada por regla a partir de
 * su email, en vez de compartir un único `SEED_PASSWORD` para todos. Esto
 * permite crear por rol de prueba (doctor, paciente, lab, admin de tenants)
 * con claves distintas sin depender de una sola variable de entorno.
 *
 * Regla:  `Vitaria.<slug>.<year>!`
 *   - slug = parte local del email (antes de `@`)
 *   - year = año en curso
 *   Ej. juan@clinic.com -> Vitaria.juan.2026!
 *
 * El superadmin y el admin de la clínica default quedan EXCLUIDOS de esta
 * regla: usan `SUPERADMIN_PASSWORD` y `ADMIN_PASSWORD` del entorno.
 */

const SEED_YEAR = new Date().getFullYear();

export const deriveSeedPassword = (email: string): string => {
  const slug = (email.split('@')[0] || email).toLowerCase();
  return `Vitaria.${slug}.${SEED_YEAR}!`;
};
