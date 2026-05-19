export type Locale = 'es' | 'en' | 'pt' | 'fr';

const translations: Record<string, Record<string, string>> = {
  es: {
    'booking.confirmed': 'Cita confirmada',
    'booking.reminder_24h': 'Recordatorio: tienes una cita mañana',
    'booking.reminder_1h': 'Recordatorio: tienes una cita en 1 hora',
    'booking.cancelled': 'Cita cancelada',
    'auth.login_success': 'Inicio de sesión exitoso',
    'auth.register_success': 'Registro exitoso',
    'auth.password_required_change': 'Debes cambiar tu contraseña',
    'auth.invalid_credentials': 'Credenciales inválidas',
    'doctor.created': 'Doctor creado exitosamente',
    'invoice.created': 'Factura creada',
    'invoice.paid': 'Factura pagada',
    'lab.result_ready': 'Resultados de laboratorio disponibles',
    'error.not_found': 'Recurso no encontrado',
    'error.forbidden': 'Acceso denegado',
    'error.validation': 'Error de validación',
    'error.server': 'Error interno del servidor',
  },
  en: {
    'booking.confirmed': 'Appointment confirmed',
    'booking.reminder_24h': 'Reminder: you have an appointment tomorrow',
    'booking.reminder_1h': 'Reminder: you have an appointment in 1 hour',
    'booking.cancelled': 'Appointment cancelled',
    'auth.login_success': 'Login successful',
    'auth.register_success': 'Registration successful',
    'auth.password_required_change': 'You must change your password',
    'auth.invalid_credentials': 'Invalid credentials',
    'doctor.created': 'Doctor created successfully',
    'invoice.created': 'Invoice created',
    'invoice.paid': 'Invoice paid',
    'lab.result_ready': 'Lab results available',
    'error.not_found': 'Resource not found',
    'error.forbidden': 'Access denied',
    'error.validation': 'Validation error',
    'error.server': 'Internal server error',
  },
  pt: {
    'booking.confirmed': 'Consulta confirmada',
    'booking.reminder_24h': 'Lembrete: você tem uma consulta amanhã',
    'booking.reminder_1h': 'Lembrete: você tem uma consulta em 1 hora',
    'booking.cancelled': 'Consulta cancelada',
    'auth.login_success': 'Login realizado com sucesso',
    'auth.register_success': 'Registro realizado com sucesso',
    'auth.password_required_change': 'Você deve alterar sua senha',
    'auth.invalid_credentials': 'Credenciais inválidas',
    'doctor.created': 'Médico criado com sucesso',
    'invoice.created': 'Fatura criada',
    'invoice.paid': 'Fatura paga',
    'lab.result_ready': 'Resultados de laboratório disponíveis',
    'error.not_found': 'Recurso não encontrado',
    'error.forbidden': 'Acesso negado',
    'error.validation': 'Erro de validação',
    'error.server': 'Erro interno do servidor',
  },
  fr: {
    'booking.confirmed': 'Rendez-vous confirmé',
    'booking.reminder_24h': 'Rappel: vous avez un rendez-vous demain',
    'booking.reminder_1h': 'Rappel: vous avez un rendez-vous dans 1 heure',
    'booking.cancelled': 'Rendez-vous annulé',
    'auth.login_success': 'Connexion réussie',
    'auth.register_success': 'Inscription réussie',
    'auth.password_required_change': 'Vous devez changer votre mot de passe',
    'auth.invalid_credentials': 'Identifiants invalides',
    'doctor.created': 'Médecin créé avec succès',
    'invoice.created': 'Facture créée',
    'invoice.paid': 'Facture payée',
    'lab.result_ready': 'Résultats de laboratoire disponibles',
    'error.not_found': 'Ressource non trouvée',
    'error.forbidden': 'Accès refusé',
    'error.validation': 'Erreur de validation',
    'error.server': 'Erreur interne du serveur',
  },
};

let currentLocale: Locale = (process.env.APP_LOCALE as Locale) || 'es';

export const setLocale = (locale: Locale): void => {
  if (translations[locale]) {
    currentLocale = locale;
  }
};

export const getLocale = (): Locale => currentLocale;

export const t = (key: string, locale?: Locale): string => {
  const l = locale || currentLocale;
  return translations[l]?.[key] || translations['es']?.[key] || key;
};

export const tAll = (key: string): Record<Locale, string> => {
  const result = {} as Record<Locale, string>;
  for (const locale of Object.keys(translations) as Locale[]) {
    result[locale] = translations[locale]?.[key] || key;
  }
  return result;
};
