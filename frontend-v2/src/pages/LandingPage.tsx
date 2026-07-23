import React, { useState } from 'react';
import './LandingPage.css';

/* ==========================================================================
   LandingPage.tsx — Salud Vital SaaS Landing Page
   All sections inline (no separate components).
   ========================================================================== */

interface LandingPageProps {
  onOpenLogin: () => void;
}

/* ---- Static data ---- */

const NAV_LINKS = [
  { label: 'Funcionalidades', href: '#features' },
  { label: 'Cómo funciona', href: '#how-it-works' },
  { label: 'Precios', href: '#pricing' },
  { label: 'Testimonios', href: '#testimonials' },
  { label: 'FAQ', href: '#faq' },
];

const FEATURES = [
  {
    icon: '📅',
    title: 'Gestión de Citas',
    description:
      'Agenda, modifica y cancela citas en tiempo real. Recordatorios automáticos por SMS y email para reducir inasistencias.',
    bgColor: 'var(--teal-50)',
  },
  {
    icon: '👨‍⚕️',
    title: 'Panel del Doctor',
    description:
      'Dashboard personalizado con agenda del día, historial de pacientes y métricas de rendimiento individual.',
    bgColor: 'var(--blue-50)',
  },
  {
    icon: '🧪',
    title: 'Laboratorio Integrado',
    description:
      'Solicita, recibe y archiva resultados de laboratorio directamente desde la plataforma. Sin papeles.',
    bgColor: 'var(--green-50)',
  },
  {
    icon: '📊',
    title: 'Analytics Predictivo',
    description:
      'Inteligencia artificial que predice demanda, optimiza turnos y detecta patrones de ausentismo.',
    bgColor: 'var(--orange-50)',
  },
  {
    icon: '🔒',
    title: 'Seguridad HIPAA',
    description:
      'Encriptación de extremo a extremo, auditoría completa de accesos y cumplimiento total con normativas.',
    bgColor: 'var(--red-50)',
  },
  {
    icon: '🏢',
    title: 'Multi-Tenant',
    description:
      'Gestiona múltiples sucursales o clínicas desde una sola cuenta con datos completamente aislados.',
    bgColor: 'var(--yellow-50)',
  },
];

const STEPS = [
  {
    number: 1,
    title: 'Crea tu cuenta',
    description: 'Regístrate en menos de 2 minutos. Sin tarjeta de crédito, sin compromisos.',
  },
  {
    number: 2,
    title: 'Configura tu equipo',
    description: 'Invita doctores, personal y configura las especialidades de tu clínica.',
  },
  {
    number: 3,
    title: '¡Listo!',
    description: 'Tu clínica ya está en línea. Empieza a recibir pacientes de inmediato.',
  },
];

const PRICING_PLANS = [
  {
    name: 'Básico',
    price: '299',
    description: 'Ideal para consultorios pequeños',
    popular: false,
    features: [
      '5 doctores',
      '200 pacientes',
      'Agenda básica',
      'Recordatorios SMS',
      'Reportes mensuales',
      'Soporte por email',
    ],
  },
  {
    name: 'Profesional',
    price: '599',
    description: 'Para clínicas en crecimiento',
    popular: true,
    features: [
      '20 doctores',
      '1,000 pacientes',
      'Agenda avanzada',
      'Laboratorio integrado',
      'Analytics predictivo',
      'Soporte prioritario 24/7',
      'API access',
    ],
  },
  {
    name: 'Enterprise',
    price: '1,299',
    description: 'Para redes de salud',
    popular: false,
    features: [
      'Doctores ilimitados',
      'Pacientes ilimitados',
      'Multi-tenant',
      'ML personalizado',
      'SLA garantizado',
      'Soporte dedicado',
      'Integración HL7/FHIR',
      'On-premise disponible',
    ],
  },
];

const TESTIMONIALS = [
  {
    name: 'Dr. Manuel García',
    role: 'Director, Clínica Norte',
    avatar: { initials: 'MG', bg: 'linear-gradient(135deg, var(--teal-500), var(--teal-600))' },
    quote:
      'Salud Vital transformó completamente nuestra operación. Redujimos un 40% las inasistencias con los recordatorios automáticos y nuestra eficiencia se disparó.',
  },
  {
    name: 'Dra. Sofía Rodríguez',
    role: 'Gerente, Hospital Central',
    avatar: { initials: 'SR', bg: 'linear-gradient(135deg, var(--blue-500), var(--blue-600))' },
    quote:
      'El panel de analytics nos dio visibilidad que nunca tuvimos. Ahora tomamos decisiones basadas en datos y mejoramos la experiencia del paciente enormemente.',
  },
  {
    name: 'Dr. Andrés López',
    role: 'CEO, Médica Sur',
    avatar: { initials: 'AL', bg: 'linear-gradient(135deg, var(--green-500), var(--green-600))' },
    quote:
      'Implementar Salud Vital fue sorprendentemente fácil. En una semana ya teníamos todo funcionando. El soporte en español es excepcional.',
  },
];

const FAQ_ITEMS = [
  {
    question: '¿Necesito tarjeta de crédito para empezar?',
    answer:
      'No. Ofrecemos 14 días de prueba gratuita sin necesidad de tarjeta de crédito. Puedes explorar todas las funciones premium durante el periodo de prueba y decidir si deseas continuar.',
  },
  {
    question: '¿Puedo migrar mis datos actuales?',
    answer:
      'Sí. Nuestro equipo de implementación te ayuda a migrar todos tus datos de pacientes, agendas y historiales clínicos de forma gratuita y segura. El proceso típico toma entre 3 y 5 días hábiles.',
  },
  {
    question: '¿Cumple con las normativas HIPAA?',
    answer:
      'Absolutamente. Salud Vital cumple con HIPAA, GDPR y las normativas locales de protección de datos de salud de cada país. Utilizamos encriptación AES-256 de extremo a extremo y auditoría completa de accesos.',
  },
  {
    question: '¿Cuántos usuarios puedo tener por plan?',
    answer:
      'El plan Básico incluye hasta 5 doctores, el Profesional hasta 20, y Enterprise es ilimitado. Todos los planes incluyen usuarios de administración y personal de soporte sin costo adicional.',
  },
  {
    question: '¿Ofrecen soporte en español?',
    answer:
      'Sí, todo nuestro equipo de soporte habla español. Ofrecemos soporte por email en todos los planes, chat en vivo en el plan Profesional, y soporte telefónico 24/7 en Enterprise.',
  },
];

const AVATAR_COLORS = [
  'linear-gradient(135deg, #f97066, #d92d20)',
  'linear-gradient(135deg, #44c9ca, #28adaf)',
  'linear-gradient(135deg, #53b1fd, #1570ef)',
  'linear-gradient(135deg, #32d583, #12b76a)',
  'linear-gradient(135deg, #f9b32b, #dc5805)',
];

/* ==========================================================================
   Component
   ========================================================================== */

const LandingPage: React.FC<LandingPageProps> = ({ onOpenLogin }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq((prev) => (prev === index ? null : index));
  };

  return (
    <div className="landing">
      {/* ----------------------------------------------------------------
          1. NAVBAR
          ---------------------------------------------------------------- */}
      <nav className="landing-navbar">
        <div className="landing-navbar-inner">
          <a href="#" className="landing-logo">
            <span className="landing-logo-icon">❤</span>
            Salud Vital
          </a>

          <ul className="landing-nav-links">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>

          <div className="landing-nav-actions">
            <button className="landing-btn landing-btn-ghost" onClick={onOpenLogin}>
              Iniciar Sesión
            </button>
            <a href="#pricing" className="landing-btn landing-btn-primary">
              Empezar Gratis
            </a>
          </div>
        </div>
      </nav>

      {/* ----------------------------------------------------------------
          2. HERO
          ---------------------------------------------------------------- */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-badge">
            <span className="landing-badge-dot" />
            Plataforma #1 en Gestión Médica
          </div>

          <h1>
            La plataforma{' '}
            <span className="landing-gradient-text">SaaS</span> que tu clínica
            necesita
          </h1>

          <p className="landing-hero-description">
            Gestiona citas, pacientes, laboratorio y analytics desde una sola
            plataforma. Diseñada para clínicas modernas que quieren brindar la
            mejor experiencia.
          </p>

          <div className="landing-hero-actions">
            <a href="#pricing" className="landing-btn landing-btn-primary landing-btn-lg">
              Empezar Gratis — 14 días
            </a>
            <button
              className="landing-btn landing-btn-outline landing-btn-lg"
              onClick={onOpenLogin}
            >
              Ver Demo en Vivo
            </button>
          </div>

          <div className="landing-social-proof">
            <div className="landing-avatar-stack">
              {AVATAR_COLORS.map((bg, i) => (
                <div
                  key={i}
                  className="landing-avatar"
                  style={{ background: bg, zIndex: 5 - i }}
                >
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <span className="landing-social-proof-text">
              <strong>2,400+</strong> profesionales confían en nosotros
            </span>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------
          3. LOGOS
          ---------------------------------------------------------------- */}
      <section className="landing-logos">
        <p className="landing-logos-label">
          Utilizada por centros líderes en Latinoamérica
        </p>
        <div className="landing-logos-row">
          {[
            'Clínica San Pablo',
            'Hospital Metropolitano',
            'Centro Médico Vida',
            'Red Salud Plus',
            'Instituto Médico Norte',
            'Grupo Hospitalario Sur',
          ].map((name) => (
            <span key={name} className="landing-logo-item">
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------------
          4. FEATURES GRID
          ---------------------------------------------------------------- */}
      <section id="features" className="landing-features landing-section">
        <div className="landing-features-header">
          <span className="landing-section-label">Funcionalidades</span>
          <h2 className="landing-section-title">
            Todo lo que tu clínica necesita
          </h2>
          <p className="landing-section-desc">
            Herramientas potentes y fáciles de usar diseñadas específicamente
            para el sector salud.
          </p>
        </div>

        <div className="landing-features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="landing-feature-card">
              <div
                className="landing-feature-icon"
                style={{ background: f.bgColor }}
              >
                {f.icon}
              </div>
              <h3>{f.title}</h3>
              <p>{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------------
          5. HOW IT WORKS
          ---------------------------------------------------------------- */}
      <section id="how-it-works" className="landing-how landing-section">
        <div className="landing-how-header">
          <span className="landing-section-label">Cómo funciona</span>
          <h2 className="landing-section-title">
            En 3 pasos, tu clínica está en línea
          </h2>
          <p className="landing-section-desc">
            No necesitas experiencia técnica. Nuestro equipo te acompaña en
            cada paso del proceso.
          </p>
        </div>

        <div className="landing-steps">
          {STEPS.map((s) => (
            <div key={s.number} className="landing-step">
              <div className="landing-step-number">{s.number}</div>
              <h3>{s.title}</h3>
              <p>{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------------
          6. PRICING
          ---------------------------------------------------------------- */}
      <section id="pricing" className="landing-pricing landing-section">
        <div className="landing-pricing-header">
          <span className="landing-section-label">Precios</span>
          <h2 className="landing-section-title">
            Planes transparentes, sin sorpresas
          </h2>
          <p className="landing-section-desc">
            Elige el plan que mejor se adapte a tu clínica. Todos incluyen 14
            días de prueba gratuita.
          </p>
        </div>

        <div className="landing-pricing-grid">
          {PRICING_PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`landing-pricing-card${plan.popular ? ' popular' : ''}`}
            >
              {plan.popular && (
                <span className="landing-pricing-popular-badge">
                  Más Popular
                </span>
              )}

              <h3>{plan.name}</h3>
              <div className="landing-pricing-price">
                <span className="amount">S/{plan.price}</span>
                <span className="period">/mes</span>
              </div>
              <p className="landing-pricing-desc">{plan.description}</p>

              <ul className="landing-pricing-features">
                {plan.features.map((feat) => (
                  <li key={feat}>
                    <span className="check">✓</span>
                    {feat}
                  </li>
                ))}
              </ul>

              <button
                className={`landing-btn landing-btn-lg ${
                  plan.popular ? 'landing-btn-primary' : 'landing-btn-outline'
                }`}
                onClick={onOpenLogin}
              >
                {plan.popular ? 'Empezar Ahora' : 'Comenzar Prueba'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------------
          7. TESTIMONIALS
          ---------------------------------------------------------------- */}
      <section id="testimonials" className="landing-testimonials landing-section">
        <div className="landing-testimonials-header">
          <span className="landing-section-label">Testimonios</span>
          <h2 className="landing-section-title">
            Lo que dicen nuestros clientes
          </h2>
          <p className="landing-section-desc">
            Más de 2,400 profesionales de salud ya confían en Salud Vital para
            gestionar sus clínicas.
          </p>
        </div>

        <div className="landing-testimonials-grid">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="landing-testimonial-card">
              <div className="landing-testimonial-stars">
                {'★★★★★'.split('').map((star, i) => (
                  <span key={i}>{star}</span>
                ))}
              </div>

              <p className="landing-testimonial-quote">"{t.quote}"</p>

              <div className="landing-testimonial-author">
                <div
                  className="landing-testimonial-avatar"
                  style={{ background: t.avatar.bg }}
                >
                  {t.avatar.initials}
                </div>
                <div>
                  <div className="landing-testimonial-name">{t.name}</div>
                  <div className="landing-testimonial-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------------
          8. FAQ
          ---------------------------------------------------------------- */}
      <section id="faq" className="landing-faq landing-section">
        <div className="landing-faq-header">
          <span className="landing-section-label">Preguntas frecuentes</span>
          <h2 className="landing-section-title">¿Tenés dudas?</h2>
          <p className="landing-section-desc">
            Aquí respondemos las preguntas más comunes de nuestros clientes.
          </p>
        </div>

        <div className="landing-faq-list">
          {FAQ_ITEMS.map((item, index) => (
            <div
              key={index}
              className={`landing-faq-item${openFaq === index ? ' open' : ''}`}
            >
              <button
                className="landing-faq-question"
                onClick={() => toggleFaq(index)}
                aria-expanded={openFaq === index}
              >
                {item.question}
                <span className="landing-faq-chevron">▾</span>
              </button>
              {openFaq === index && (
                <div className="landing-faq-answer">{item.answer}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------------
          9. CTA SECTION
          ---------------------------------------------------------------- */}
      <section className="landing-cta">
        <h2>¿Listo para transformar tu clínica?</h2>
        <p>
          Únete a más de 2,400 profesionales que ya confían en Salud Vital.
          Prueba gratuita de 14 días, sin tarjeta de crédito.
        </p>
        <div className="landing-cta-actions">
          <a href="#pricing" className="landing-btn landing-btn-lg landing-btn-white">
            Empezar Gratis — 14 días
          </a>
          <button
            className="landing-btn landing-btn-lg landing-btn-ghost-white"
            onClick={onOpenLogin}
          >
            Hablar con Ventas
          </button>
        </div>
      </section>

      {/* ----------------------------------------------------------------
          10. FOOTER
          ---------------------------------------------------------------- */}
      <footer className="landing-footer">
        <div className="landing-footer-grid">
          <div className="landing-footer-brand">
            <div className="landing-logo">
              <span className="landing-logo-icon">❤</span>
              Salud Vital
            </div>
            <p>
              La plataforma SaaS integral para la gestión de clínicas y centros
              médicos en Latinoamérica.
            </p>
          </div>

          <div className="landing-footer-col">
            <h4>Producto</h4>
            <ul>
              <li><a href="#features">Funcionalidades</a></li>
              <li><a href="#pricing">Precios</a></li>
              <li><a href="#how-it-works">Cómo funciona</a></li>
              <li><a href="#">Integraciones</a></li>
              <li><a href="#">API</a></li>
            </ul>
          </div>

          <div className="landing-footer-col">
            <h4>Empresa</h4>
            <ul>
              <li><a href="#">Sobre nosotros</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Carreras</a></li>
              <li><a href="#">Prensa</a></li>
              <li><a href="#">Contacto</a></li>
            </ul>
          </div>

          <div className="landing-footer-col">
            <h4>Legal</h4>
            <ul>
              <li><a href="#">Privacidad</a></li>
              <li><a href="#">Términos</a></li>
              <li><a href="#">Cookies</a></li>
              <li><a href="#">HIPAA</a></li>
              <li><a href="#">GDPR</a></li>
            </ul>
          </div>
        </div>

        <div className="landing-footer-bottom">
          <span className="landing-footer-copyright">
            © 2026 Salud Vital. Todos los derechos reservados.
          </span>
          <div className="landing-footer-socials">
            <a href="#" aria-label="Twitter" title="Twitter">𝕏</a>
            <a href="#" aria-label="LinkedIn" title="LinkedIn">in</a>
            <a href="#" aria-label="GitHub" title="GitHub">⌘</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
