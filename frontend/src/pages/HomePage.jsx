import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useTheme } from '../context/useTheme';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [expandedSpecialty, setExpandedSpecialty] = useState(null);
  const [showReminderInfo, setShowReminderInfo] = useState(false);

  const specialtiesData = [
    {
      id: 'cardiologia',
      icon: '❤️',
      name: 'Cardiología',
      desc: 'Cuidado integral del corazón',
      color: theme === 'dark' ? '#ef4444' : '#dc2626',
      bgLight: theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
      department: 'Departamento de Ciencias Cardiovasculares',
      procedures: [
        'Electrocardiograma (ECG)',
        'Ecocardiograma Doppler',
        'Prueba de esfuerzo',
        'Holter de 24 horas',
        'Cateterismo cardíaco',
        'Control de hipertensión',
      ],
      doctors: [
        { name: 'Dr. Roberto Méndez', sub: 'Cardiólogo Intervencionista' },
        { name: 'Dra. Carolina Fuentes', sub: 'Arritmóloga' },
      ],
    },
    {
      id: 'dermatologia',
      icon: '🔬',
      name: 'Dermatología',
      desc: 'Salud y estética de la piel',
      color: theme === 'dark' ? '#a855f7' : '#9333ea',
      bgLight: theme === 'dark' ? 'rgba(168, 85, 247, 0.15)' : '#faf5ff',
      department: 'Departamento de Dermatología y Estética',
      procedures: [
        'Dermatoscopia digital',
        'Biopsia de piel',
        'Tratamiento de acné',
        'Cirugía de lunares',
        'Crioterapia',
        'Láser dermatológico',
      ],
      doctors: [
        { name: 'Dra. Valentina Rojas', sub: 'Dermatóloga Clínica' },
        { name: 'Dr. Felipe Contreras', sub: 'Cirujano Dermatológico' },
      ],
    },
    {
      id: 'neurologia',
      icon: '🧠',
      name: 'Neurología',
      desc: 'Sistema nervioso y cerebro',
      color: theme === 'dark' ? '#3b82f6' : '#2563eb',
      bgLight: theme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
      department: 'Departamento de Neurociencias',
      procedures: [
        'Electroencefalograma (EEG)',
        'Resonancia magnética cerebral',
        'Potenciales evocados',
        'Tratamiento de migrañas',
        'Evaluación de epilepsia',
        'Neurorehabilitación',
      ],
      doctors: [
        { name: 'Dr. Andrés Villalobos', sub: 'Neurólogo Clínico' },
        { name: 'Dra. Paula Soto', sub: 'Neurofisióloga' },
      ],
    },
    {
      id: 'pediatria',
      icon: '👶',
      name: 'Pediatría',
      desc: 'Atención médica infantil',
      color: theme === 'dark' ? '#fbbf24' : '#f59e0b',
      bgLight: theme === 'dark' ? 'rgba(251, 191, 36, 0.15)' : '#fffbeb',
      department: 'Departamento de Pediatría y Adolescencia',
      procedures: [
        'Control de niño sano',
        'Vacunación',
        'Control de crecimiento',
        'Tratamiento de infecciones',
        'Alergias pediátricas',
        'Orientación nutricional',
      ],
      doctors: [
        { name: 'Dra. Camila Espinoza', sub: 'Pediatra General' },
        { name: 'Dr. Matías Herrera', sub: 'Neonatólogo' },
      ],
    },
  ];

  const toggleSpecialty = (id) => {
    setExpandedSpecialty(expandedSpecialty === id ? null : id);
  };

  return (
    <div className="page-container-wide">
      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Clínica <span className="text-accent">Salud Vital</span>
          </h1>
          <p className="hero-subtitle">Medicina privada de excelencia — Tu salud merece la mejor atención</p>
          <div className="hero-actions">
            <button onClick={() => navigate('/booking')} className="btn btn-primary btn-lg">
              Reservar Hora Médica
            </button>
            {!user && (
              <>
                <Link to="/login" className="btn btn-outline btn-lg">Iniciar Sesión</Link>
                <Link to="/register" className="btn btn-success btn-lg">Crear Cuenta</Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features - Interactivas */}
      <section className="section">
        <div className="grid grid-3">
          <div
            className="card card-subtle feature-card feature-card-clickable"
            onClick={() => navigate('/booking')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/booking')}
          >
            <div className="feature-icon">👨‍⚕️</div>
            <h3>Especialistas de Primera</h3>
            <p>Equipo médico certificado en Cardiología, Dermatología, Neurología y Pediatría</p>
            <span className="feature-link">Ver especialistas →</span>
          </div>

          <div
            className="card card-subtle feature-card feature-card-clickable"
            onClick={() => navigate('/booking')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/booking')}
          >
            <div className="feature-icon">📅</div>
            <h3>Reserva Online 24/7</h3>
            <p>Agenda tu cita en cualquier momento, sin llamadas ni esperas</p>
            <span className="feature-link">Reservar ahora →</span>
          </div>

          <div
            className="card card-subtle feature-card feature-card-clickable"
            onClick={() => setShowReminderInfo(!showReminderInfo)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setShowReminderInfo(!showReminderInfo)}
          >
            <div className="feature-icon">🔔</div>
            <h3>Recordatorios Automáticos</h3>
            <p>Te notificamos por email para que nunca olvides tu cita</p>
            <span className="feature-link">{showReminderInfo ? 'Ocultar info ▲' : 'Saber más →'}</span>
          </div>
        </div>

        {showReminderInfo && (
          <div className="card reminder-detail-card" style={{ marginTop: 20 }}>
            <div className="reminder-steps">
              <div className="reminder-step">
                <div className="reminder-step-number">1</div>
                <div>
                  <strong>Reservas tu cita</strong>
                  <p>Al agendar tu hora médica, tu email queda registrado automáticamente</p>
                </div>
              </div>
              <div className="reminder-step">
                <div className="reminder-step-number">2</div>
                <div>
                  <strong>Recibes confirmación</strong>
                  <p>Inmediatamente recibes un correo con los detalles de tu cita</p>
                </div>
              </div>
              <div className="reminder-step">
                <div className="reminder-step-number">3</div>
                <div>
                  <strong>Recordatorio 24h antes</strong>
                  <p>Te enviamos un recordatorio un día antes para que no olvides tu compromiso</p>
                </div>
              </div>
              <div className="reminder-step">
                <div className="reminder-step-number">4</div>
                <div>
                  <strong>Confirmas tu asistencia</strong>
                  <p>Debes confirmar tu cita desde el email para evitar bloqueo de 7 días</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Specialties - Expandibles */}
      <section className="section">
        <h2 className="section-title">Nuestras Especialidades</h2>
        <p className="section-subtitle">Haz clic en una especialidad para ver más detalles</p>
        <div className="grid grid-4">
          {specialtiesData.map((spec) => (
            <div
              key={spec.id}
              className={`card specialty-card specialty-card-expanded ${expandedSpecialty === spec.id ? 'specialty-expanded' : ''}`}
              onClick={() => toggleSpecialty(spec.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && toggleSpecialty(spec.id)}
              style={{ '--spec-color': spec.color, '--spec-bg': spec.bgLight }}
            >
              <div className="specialty-icon">{spec.icon}</div>
              <h4>{spec.name}</h4>
              <p>{spec.desc}</p>
              <span className="specialty-expand-icon">{expandedSpecialty === spec.id ? '▲' : '▼'}</span>
            </div>
          ))}
        </div>

        {expandedSpecialty && (
          <div className="specialty-detail-panel">
            {(() => {
              const spec = specialtiesData.find((s) => s.id === expandedSpecialty);
              if (!spec) return null;
              return (
                <div className="specialty-detail-content">
                  <div className="specialty-detail-header" style={{ background: spec.color }}>
                    <span className="specialty-detail-icon">{spec.icon}</span>
                    <div>
                      <h3>{spec.name}</h3>
                      <p>{spec.department}</p>
                    </div>
                  </div>

                  <div className="specialty-detail-body">
                    <div className="specialty-detail-section">
                      <h4>Procedimientos y Servicios</h4>
                      <div className="procedure-list">
                        {spec.procedures.map((proc) => (
                          <div key={proc} className="procedure-item">
                            <span className="procedure-check">✓</span>
                            <span>{proc}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="specialty-detail-section">
                      <h4>Especialistas Disponibles</h4>
                      <div className="doctor-mini-grid">
                        {spec.doctors.map((doc) => (
                          <div key={doc.name} className="doctor-mini-card">
                            <div className="doctor-mini-avatar">👨‍⚕️</div>
                            <div>
                              <strong>{doc.name}</strong>
                              <span>{doc.sub}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => navigate('/booking')}
                      className="btn btn-primary btn-lg btn-block"
                      style={{ backgroundColor: spec.color, marginTop: 8 }}
                    >
                      Reservar con especialista de {spec.name}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </section>

      {/* Policy */}
      <section className="section">
        <div className="card card-subtle policy-card">
          <h3>⚠️ Política de Asistencia</h3>
          <p>Es obligatorio confirmar tu cita médica. Si no confirmas o no te presentas, tu RUT será bloqueado por <strong>7 días</strong> sin poder reservar nuevas citas.</p>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="card cta-card">
          <h3>¿Ya tienes una reserva?</h3>
          <p>Consulta el estado de tus citas ingresando tu RUT</p>
          <button onClick={() => navigate('/my-bookings/guest')} className="btn btn-success">
            Buscar mis Reservas
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>© 2026 Clínica Salud Vital. Todos los derechos reservados.</p>
        <p className="footer-detail">Av. Salud 1234, Las Condes, Santiago | +56 2 2345 6789</p>
      </footer>
    </div>
  );
}
