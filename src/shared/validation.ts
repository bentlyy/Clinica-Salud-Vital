// Validación de entrada compartida.
//
// El límite de longitud del email (254, RFC 5321) es también la mitigación de
// ReDoS: acotar la entrada a 254 caracteres hace que el regex no pueda exhibir
// backtracking polinómico sobre cadenas adversarias arbitrariamente largas.
export const EMAIL_MAX_LENGTH = 254;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email: unknown): email is string => {
  if (typeof email !== 'string') return false;
  if (email.length < 3 || email.length > EMAIL_MAX_LENGTH) return false;
  return EMAIL_RE.test(email);
};
