/* ==========================================================================
   Translations — ES / EN
   Scope: Landing, Login, Common UI, Features, Pricing, Testimonials, FAQ
   ========================================================================== */

export type TranslationKeys = typeof translations.es;

export const translations = {
  es: {
    /* =======================================================================
       AUTH — Login
       ======================================================================= */
    'auth.login':                  'Iniciar Sesión',
    'auth.email':                  'Correo electrónico',
    'auth.password':               'Contraseña',
    'auth.forgotPassword':         '¿Olvidaste tu contraseña?',
    'auth.noAccount':              '¿No tienes cuenta?',
    'auth.register':               'Regístrate aquí',
    'auth.rememberMe':             'Recuérdame',
    'auth.showPassword':           'Mostrar contraseña',
    'auth.hidePassword':           'Ocultar contraseña',
    'auth.loginButton':            'Iniciar Sesión',
    'auth.loginError':             'Correo o contraseña incorrectos',
    'auth.twoFactor':              'Verificación en dos pasos',
    'auth.twoFactorCode':          'Código de verificación',
    'auth.twoFactorSend':          'Enviar código',
    'auth.twoFactorResend':        'Reenviar código',
    'auth.twoFactorError':         'Código inválido',
    'auth.guestBooking':           'Reservar como invitado',
    'auth.welcomeBack':            'Bienvenido de vuelta',
    'auth.loginSubtitle':          'Accede a tu panel de gestión clínica',
    'auth.loggingIn':              'Iniciando sesión...',
    'auth.orContinueWith':         'O continúa con',
    'auth.socialGoogle':           'Google',
    'auth.socialMicrosoft':        'Microsoft',

    /* =======================================================================
       LANDING — Hero
       ======================================================================= */
    'landing.heroBadge':           'Plataforma #1 para clínicas modernas',
    'landing.heroTitle':           'Gestiona tu clínica con inteligencia',
    'landing.heroTitleHighlight':  'inteligencia',
    'landing.heroDesc':            'Agenda automática, recordatorios inteligentes ypanel administrativo completo. Reduce un 70% el tiempo en tareas administrativas.',
    'landing.ctaStart':            'Comenzar gratis',
    'landing.ctaDemo':             'Ver demo',
    'landing.heroTrustedBy':       'Más de 500 clínicas confían en nosotros',

    /* =======================================================================
       LANDING — Features Section
       ======================================================================= */
    'landing.features':            'Funcionalidades',
    'landing.featuresSubtitle':    'Todo lo que necesitas para gestionar tu clínica en un solo lugar',
    'landing.feature1Title':       'Agenda Inteligente',
    'landing.feature1Desc':        'Automatiza la reserva de citas con recordatorios por SMS y email. Los pacientes pueden reservar 24/7 desde cualquier dispositivo.',
    'landing.feature2Title':       'Panel Administrativo',
    'landing.feature2Desc':        'Visualiza métricas clave en tiempo real: citas del día, ingresos, ocupación y satisfacción del paciente.',
    'landing.feature3Title':       'Gestión de Doctores',
    'landing.feature3Desc':        'Administra horarios, especialidades y disponibilidad de cada doctor con un calendario visual intuitivo.',
    'landing.feature4Title':       'Historial Clínico',
    'landing.feature4Desc':        'Accede al historial completo del paciente en segundos. Diagnósticos, tratamientos y notas clínicas centralizadas.',
    'landing.feature5Title':       'Multi-sucursal',
    'landing.feature5Desc':        'Gestiona múltiples sedes desde una sola cuenta. Reportes consolidados y comparativos entre sucursales.',
    'landing.feature6Title':       'Seguridad Avanzada',
    'landing.feature6Desc':        'Cifrado de extremo a extremo, autenticación en dos factores y cumplimiento total con normativas de protección de datos.',

    /* =======================================================================
       LANDING — How It Works
       ======================================================================= */
    'landing.howItWorks':          '¿Cómo funciona?',
    'landing.howItWorksSubtitle':  'Comienza en 3 simples pasos',
    'landing.step1Title':          'Crea tu cuenta',
    'landing.step1Desc':           'Registra tu clínica en menos de 2 minutos. Sin tarjeta de crédito, sin compromiso.',
    'landing.step2Title':          'Configura tu clínica',
    'landing.step2Desc':           'Agrega doctores, especialidades, horarios y personaliza el sistema a tu medida.',
    'landing.step3Title':          'Recibe pacientes',
    'landing.step3Desc':           'Comparte el link de reserva con tus pacientes y comienza a recibir citas automáticamente.',

    /* =======================================================================
       LANDING — Pricing
       ======================================================================= */
    'landing.pricing':             'Planes y precios',
    'landing.pricingSubtitle':     'Elige el plan perfecto para tu clínica. Sin costos ocultos.',
    'landing.pricingMonthly':      'Mensual',
    'landing.pricingYearly':       'Anual',
    'landing.pricingSave':         'Ahorra 20%',
    'landing.pricingPopular':      'Más popular',
    'landing.pricingPerMonth':     '/mes',
    'landing.pricingGetStarted':   'Comenzar',
    'landing.pricingContactSales': 'Contactar ventas',
    'landing.pricingIncluded':     'Incluido en todos los planes',
    'landing.planFree':            'Gratis',
    'landing.planFreePrice':       '$0',
    'landing.planFreeDesc':        'Ideal para clínicas pequeñas que están comenzando',
    'landing.planFreeFeature1':    'Hasta 50 citas/mes',
    'landing.planFreeFeature2':    '1 doctor',
    'landing.planFreeFeature3':    'Agenda básica',
    'landing.planFreeFeature4':    'Recordatorios por email',
    'landing.planPro':             'Profesional',
    'landing.planProPrice':        '$49',
    'landing.planProDesc':         'Para clínicas en crecimiento que necesitan más',
    'landing.planProFeature1':     'Citas ilimitadas',
    'landing.planProFeature2':     'Hasta 10 doctores',
    'landing.planProFeature3':     'Panel administrativo',
    'landing.planProFeature4':     'Recordatorios SMS + email',
    'landing.planProFeature5':     'Historial clínico digital',
    'landing.planProFeature6':     'Soporte prioritario',
    'landing.planEnterprise':      'Empresa',
    'landing.planEnterprisePrice': '$149',
    'landing.planEnterpriseDesc':  'Para grandes clínicas y redes de salud',
    'landing.planEnterpriseFeature1': 'Doctores ilimitados',
    'landing.planEnterpriseFeature2': 'Multi-sucursal',
    'landing.planEnterpriseFeature3': 'API personalizada',
    'landing.planEnterpriseFeature4': 'SSO & 2FA',
    'landing.planEnterpriseFeature5': 'SLA garantizado',
    'landing.planEnterpriseFeature6': 'Gerente de cuenta dedicado',

    /* =======================================================================
       LANDING — Testimonials
       ======================================================================= */
    'landing.testimonials':        'Lo que dicen nuestros clientes',
    'landing.testimonialsSubtitle':'Más de 500 clínicas ya confían en nosotros',
    'testimonial1Name':            'Dra. María González',
    'testimonial1Role':            'Directora, Clínica Santa María',
    'testimonial1Text':            'Reducimos las consultas telefónicas en un 60%. Nuestros pacientes adoran poder reservar citas en línea. La plataforma es increíblemente intuitiva.',
    'testimonial2Name':            'Dr. Carlos Mendoza',
    'testimonial2Role':            'Director Médico, Salud Integral',
    'testimonial2Text':            'El panel administrativo nos da visibilidad total sobre las operaciones. Los reportes automatizados nos ahorran horas cada semana.',
    'testimonial3Name':            'Ana Luisa Fernández',
    'testimonial3Role':            'Gerente, Centro Médico Vida',
    'testimonial3Text':            'La gestión multi-sucursal cambió nuestra operación. Ahora podemos comparar rendimiento entre sedes en tiempo real.',

    /* =======================================================================
       LANDING — FAQ
       ======================================================================= */
    'landing.faq':                 'Preguntas frecuentes',
    'landing.faqSubtitle':         'Resolvemos tus dudas',
    'landing.faq1Q':               '¿Necesito conocimientos técnicos para usar la plataforma?',
    'landing.faq1A':               'No. Nuestra plataforma está diseñada para ser intuitiva. Cualquier persona puede configurar y usar el sistema sin necesidad de conocimientos técnicos. Además, ofrecemos capacitación gratuita.',
    'landing.faq2Q':               '¿Puedo migrar los datos de mi sistema actual?',
    'landing.faq2A':               'Sí. Ofrecemos migración gratuita de datos para todos los planes. Nuestro equipo se encarga de importar la información de pacientes, doctores y citas históricas.',
    'landing.faq3Q':               '¿Los pacientes pueden reservar citas sin crear cuenta?',
    'landing.faq3A':               'Sí. Los pacientes pueden reservar como invitados ingresando solo su nombre, email y teléfono. No es necesario crear una cuenta para agendar una cita.',
    'landing.faq4Q':               '¿Qué métodos de pago aceptan?',
    'landing.faq4A':               'Aceptamos tarjetas de crédito y débito (Visa, Mastercard, Amex), transferencia bancaria y PayPal. Los planes de empresa pueden pagar por factura.',
    'landing.faq5Q':               '¿Puedo cancelar mi suscripción en cualquier momento?',
    'landing.faq5A':               'Sí. No hay contratos ni penalizaciones. Puedes cancelar o cambiar de plan en cualquier momento desde tu panel de configuración.',
    'landing.faq6Q':               '¿Mis datos están seguros?',
    'landing.faq6A':               'Absolutamente. Usamos cifrado AES-256, autenticación en dos factores y cumplimos con GDPR, HIPAA y la Ley de Protección de Datos Personales. Tus datos nunca se comparten con terceros.',

    /* =======================================================================
       LANDING — Footer
       ======================================================================= */
    'landing.footerDesc':          'Plataforma integral de gestión para clínicas modernas. Agenda, administración y pacientes en un solo lugar.',
    'landing.footerProduct':       'Producto',
    'landing.footerFeatures':      'Funcionalidades',
    'landing.footerPricing':       'Precios',
    'landing.footerIntegrations':  'Integraciones',
    'landing.footerChangelog':     'Cambios recientes',
    'landing.footerCompany':       'Empresa',
    'landing.footerAbout':         'Sobre nosotros',
    'landing.footerBlog':          'Blog',
    'landing.footerCareers':       'Carreras',
    'landing.footerContact':       'Contacto',
    'landing.footerSupport':       'Soporte',
    'landing.footerHelpCenter':    'Centro de ayuda',
    'landing.footerDocumentation': 'Documentación',
    'landing.footerStatus':        'Estado del sistema',
    'landing.footerLegal':         'Legal',
    'landing.footerPrivacy':       'Privacidad',
    'landing.footerTerms':         'Términos',
    'landing.footerCookies':       'Cookies',
    'landing.footerCopyright':     '© 2026 ClínicaPro. Todos los derechos reservados.',

    /* =======================================================================
       NAVIGATION
       ======================================================================= */
    'nav.features':      'Funcionalidades',
    'nav.howItWorks':    'Cómo funciona',
    'nav.pricing':       'Precios',
    'nav.faq':           'FAQ',
    'nav.login':         'Iniciar sesión',
    'nav.startFree':     'Comenzar gratis',
    'nav.logo':          'ClínicaPro',

    /* =======================================================================
       COMMON UI
       ======================================================================= */
    'common.loading':    'Cargando...',
    'common.error':      'Ha ocurrido un error',
    'common.retry':      'Reintentar',
    'common.back':       'Volver',
    'common.save':       'Guardar',
    'common.cancel':     'Cancelar',
    'common.delete':     'Eliminar',
    'common.edit':       'Editar',
    'common.search':     'Buscar...',
    'common.noData':     'No hay datos disponibles',
    'common.close':      'Cerrar',
    'common.confirm':    'Confirmar',
    'common.submit':     'Enviar',
    'common.next':       'Siguiente',
    'common.previous':   'Anterior',
    'common.viewMore':   'Ver más',
    'common.viewLess':   'Ver menos',
    'common.required':   'Requerido',
    'common.optional':   'Opcional',
    'common.success':    'Operación exitosa',
    'common.warning':    'Advertencia',
    'common.info':       'Información',
    'common.copy':       'Copiar',
    'common.copied':     '¡Copiado!',
    'common.yes':        'Sí',
    'common.no':         'No',
    'common.all':        'Todos',
    'common.none':       'Ninguno',
    'common.today':      'Hoy',
    'common.yesterday':  'Ayer',
    'common.dateFormat': 'DD/MM/YYYY',
    'common.currency':   'CLP',
  },

  en: {
    /* =======================================================================
       AUTH — Login
       ======================================================================= */
    'auth.login':                  'Sign In',
    'auth.email':                  'Email',
    'auth.password':               'Password',
    'auth.forgotPassword':         'Forgot your password?',
    'auth.noAccount':              "Don't have an account?",
    'auth.register':               'Sign up here',
    'auth.rememberMe':             'Remember me',
    'auth.showPassword':           'Show password',
    'auth.hidePassword':           'Hide password',
    'auth.loginButton':            'Sign In',
    'auth.loginError':             'Invalid email or password',
    'auth.twoFactor':              'Two-factor verification',
    'auth.twoFactorCode':          'Verification code',
    'auth.twoFactorSend':          'Send code',
    'auth.twoFactorResend':        'Resend code',
    'auth.twoFactorError':         'Invalid code',
    'auth.guestBooking':           'Book as guest',
    'auth.welcomeBack':            'Welcome back',
    'auth.loginSubtitle':          'Access your clinic management dashboard',
    'auth.loggingIn':              'Signing in...',
    'auth.orContinueWith':         'Or continue with',
    'auth.socialGoogle':           'Google',
    'auth.socialMicrosoft':        'Microsoft',

    /* =======================================================================
       LANDING — Hero
       ======================================================================= */
    'landing.heroBadge':           '#1 platform for modern clinics',
    'landing.heroTitle':           'Manage your clinic with intelligence',
    'landing.heroTitleHighlight':  'intelligence',
    'landing.heroDesc':            'Smart scheduling, intelligent reminders, and a complete admin panel. Reduce administrative tasks by 70%.',
    'landing.ctaStart':            'Get started free',
    'landing.ctaDemo':             'View demo',
    'landing.heroTrustedBy':       'Trusted by 500+ clinics',

    /* =======================================================================
       LANDING — Features Section
       ======================================================================= */
    'landing.features':            'Features',
    'landing.featuresSubtitle':    'Everything you need to manage your clinic in one place',
    'landing.feature1Title':       'Smart Scheduling',
    'landing.feature1Desc':        'Automate appointment booking with SMS and email reminders. Patients can book 24/7 from any device.',
    'landing.feature2Title':       'Admin Dashboard',
    'landing.feature2Desc':        'View key metrics in real-time: daily appointments, revenue, occupancy, and patient satisfaction.',
    'landing.feature3Title':       'Doctor Management',
    'landing.feature3Desc':        'Manage schedules, specialties, and availability for each doctor with an intuitive visual calendar.',
    'landing.feature4Title':       'Clinical Records',
    'landing.feature4Desc':        'Access complete patient history in seconds. Diagnoses, treatments, and clinical notes centralized.',
    'landing.feature5Title':       'Multi-branch',
    'landing.feature5Desc':        'Manage multiple locations from a single account. Consolidated reports and cross-branch comparisons.',
    'landing.feature6Title':       'Advanced Security',
    'landing.feature6Desc':        'End-to-end encryption, two-factor authentication, and full compliance with data protection regulations.',

    /* =======================================================================
       LANDING — How It Works
       ======================================================================= */
    'landing.howItWorks':          'How it works',
    'landing.howItWorksSubtitle':  'Get started in 3 simple steps',
    'landing.step1Title':          'Create your account',
    'landing.step1Desc':           'Register your clinic in under 2 minutes. No credit card, no commitment.',
    'landing.step2Title':          'Set up your clinic',
    'landing.step2Desc':           'Add doctors, specialties, schedules and customize the system to your needs.',
    'landing.step3Title':          'Start receiving patients',
    'landing.step3Desc':           'Share the booking link with your patients and start receiving appointments automatically.',

    /* =======================================================================
       LANDING — Pricing
       ======================================================================= */
    'landing.pricing':             'Plans & Pricing',
    'landing.pricingSubtitle':     'Choose the perfect plan for your clinic. No hidden fees.',
    'landing.pricingMonthly':      'Monthly',
    'landing.pricingYearly':       'Yearly',
    'landing.pricingSave':         'Save 20%',
    'landing.pricingPopular':      'Most popular',
    'landing.pricingPerMonth':     '/mo',
    'landing.pricingGetStarted':   'Get started',
    'landing.pricingContactSales': 'Contact sales',
    'landing.pricingIncluded':     'Included in all plans',
    'landing.planFree':            'Free',
    'landing.planFreePrice':       '$0',
    'landing.planFreeDesc':        'Ideal for small clinics getting started',
    'landing.planFreeFeature1':    'Up to 50 appointments/month',
    'landing.planFreeFeature2':    '1 doctor',
    'landing.planFreeFeature3':    'Basic scheduling',
    'landing.planFreeFeature4':    'Email reminders',
    'landing.planPro':             'Professional',
    'landing.planProPrice':        '$49',
    'landing.planProDesc':         'For growing clinics that need more',
    'landing.planProFeature1':     'Unlimited appointments',
    'landing.planProFeature2':     'Up to 10 doctors',
    'landing.planProFeature3':     'Admin dashboard',
    'landing.planProFeature4':     'SMS + email reminders',
    'landing.planProFeature5':     'Digital clinical records',
    'landing.planProFeature6':     'Priority support',
    'landing.planEnterprise':      'Enterprise',
    'landing.planEnterprisePrice': '$149',
    'landing.planEnterpriseDesc':  'For large clinics and healthcare networks',
    'landing.planEnterpriseFeature1': 'Unlimited doctors',
    'landing.planEnterpriseFeature2': 'Multi-branch',
    'landing.planEnterpriseFeature3': 'Custom API',
    'landing.planEnterpriseFeature4': 'SSO & 2FA',
    'landing.planEnterpriseFeature5': 'Guaranteed SLA',
    'landing.planEnterpriseFeature6': 'Dedicated account manager',

    /* =======================================================================
       LANDING — Testimonials
       ======================================================================= */
    'landing.testimonials':        'What our clients say',
    'landing.testimonialsSubtitle':'Trusted by 500+ clinics',
    'testimonial1Name':            'Dr. María González',
    'testimonial1Role':            'Director, Clínica Santa María',
    'testimonial1Text':            'We reduced phone consultations by 60%. Our patients love being able to book appointments online. The platform is incredibly intuitive.',
    'testimonial2Name':            'Dr. Carlos Mendoza',
    'testimonial2Role':            'Medical Director, Salud Integral',
    'testimonial2Text':            'The admin dashboard gives us full visibility into operations. Automated reports save us hours every week.',
    'testimonial3Name':            'Ana Luisa Fernández',
    'testimonial3Role':            'Manager, Centro Médico Vida',
    'testimonial3Text':            'Multi-branch management changed our operation. We can now compare performance across locations in real-time.',

    /* =======================================================================
       LANDING — FAQ
       ======================================================================= */
    'landing.faq':                 'Frequently asked questions',
    'landing.faqSubtitle':         'We answer your questions',
    'landing.faq1Q':               'Do I need technical knowledge to use the platform?',
    'landing.faq1A':               "No. Our platform is designed to be intuitive. Anyone can set up and use the system without technical knowledge. We also offer free training.",
    'landing.faq2Q':               'Can I migrate data from my current system?',
    'landing.faq2A':               "Yes. We offer free data migration for all plans. Our team handles importing patient information, doctors, and historical appointments.",
    'landing.faq3Q':               'Can patients book appointments without creating an account?',
    'landing.faq3A':               "Yes. Patients can book as guests by entering only their name, email, and phone number. No account is needed to schedule an appointment.",
    'landing.faq4Q':               'What payment methods do you accept?',
    'landing.faq4A':               'We accept credit and debit cards (Visa, Mastercard, Amex), bank transfer, and PayPal. Enterprise plans can pay by invoice.',
    'landing.faq5Q':               'Can I cancel my subscription at any time?',
    'landing.faq5A':               "Yes. There are no contracts or penalties. You can cancel or change plans at any time from your settings panel.",
    'landing.faq6Q':               'Is my data secure?',
    'landing.faq6A':               'Absolutely. We use AES-256 encryption, two-factor authentication, and comply with GDPR, HIPAA, and data protection laws. Your data is never shared with third parties.',

    /* =======================================================================
       LANDING — Footer
       ======================================================================= */
    'landing.footerDesc':          'Comprehensive management platform for modern clinics. Scheduling, administration, and patients in one place.',
    'landing.footerProduct':       'Product',
    'landing.footerFeatures':      'Features',
    'landing.footerPricing':       'Pricing',
    'landing.footerIntegrations':  'Integrations',
    'landing.footerChangelog':     'Changelog',
    'landing.footerCompany':       'Company',
    'landing.footerAbout':         'About us',
    'landing.footerBlog':          'Blog',
    'landing.footerCareers':       'Careers',
    'landing.footerContact':       'Contact',
    'landing.footerSupport':       'Support',
    'landing.footerHelpCenter':    'Help center',
    'landing.footerDocumentation': 'Documentation',
    'landing.footerStatus':        'System status',
    'landing.footerLegal':         'Legal',
    'landing.footerPrivacy':       'Privacy',
    'landing.footerTerms':         'Terms',
    'landing.footerCookies':       'Cookies',
    'landing.footerCopyright':     '© 2026 ClínicaPro. All rights reserved.',

    /* =======================================================================
       NAVIGATION
       ======================================================================= */
    'nav.features':      'Features',
    'nav.howItWorks':    'How it works',
    'nav.pricing':       'Pricing',
    'nav.faq':           'FAQ',
    'nav.login':         'Sign in',
    'nav.startFree':     'Get started free',
    'nav.logo':          'ClínicaPro',

    /* =======================================================================
       COMMON UI
       ======================================================================= */
    'common.loading':    'Loading...',
    'common.error':      'An error has occurred',
    'common.retry':      'Retry',
    'common.back':       'Go back',
    'common.save':       'Save',
    'common.cancel':     'Cancel',
    'common.delete':     'Delete',
    'common.edit':       'Edit',
    'common.search':     'Search...',
    'common.noData':     'No data available',
    'common.close':      'Close',
    'common.confirm':    'Confirm',
    'common.submit':     'Submit',
    'common.next':       'Next',
    'common.previous':   'Previous',
    'common.viewMore':   'View more',
    'common.viewLess':   'View less',
    'common.required':   'Required',
    'common.optional':   'Optional',
    'common.success':    'Operation successful',
    'common.warning':    'Warning',
    'common.info':       'Information',
    'common.copy':       'Copy',
    'common.copied':     'Copied!',
    'common.yes':        'Yes',
    'common.no':         'No',
    'common.all':        'All',
    'common.none':       'None',
    'common.today':      'Today',
    'common.yesterday':  'Yesterday',
    'common.dateFormat': 'MM/DD/YYYY',
    'common.currency':   'USD',
  },
} as const;
