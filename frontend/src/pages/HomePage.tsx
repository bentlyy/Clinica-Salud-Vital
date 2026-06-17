import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useI18n } from '../i18n/useI18n';
import api from '../api/axios';
import { getDoctors } from '../api/doctors';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const [expandedSpecialty, setExpandedSpecialty] = useState(null);
  const [showReminderInfo, setShowReminderInfo] = useState(false);
  const [specialties, setSpecialties] = useState([]);
  const [doctorsBySpecialty, setDoctorsBySpecialty] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/specialties').then(res => Array.isArray(res) ? res : (res.data || [])),
      getDoctors().catch(() => []),
    ]).then(([specs, docs]) => {
      setSpecialties(specs);
      const grouped = {};
      const docArray = Array.isArray(docs) ? docs : (docs.data || []);
      for (const doc of docArray) {
        const key = doc.specialty;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(doc);
      }
      setDoctorsBySpecialty(grouped);
    }).finally(() => setLoading(false));
  }, []);

  const toggleSpecialty = (id) => {
    setExpandedSpecialty(expandedSpecialty === id ? null : id);
  };

  return (
    <div className="page-container-wide">
      {/* Hero */}
      <section className="hero">
        <div className="hero-decoration hero-decoration-1">+</div>
        <div className="hero-decoration hero-decoration-2">+</div>
        <div className="hero-content">
          <h1 className="hero-title">{t('home.hero_title')}</h1>
          <p className="hero-subtitle">{t('home.hero_subtitle')}</p>
          <div className="hero-actions">
            <button onClick={() => navigate('/booking')} className="btn btn-primary btn-lg">
              {t('home.book_appointment')}
            </button>
            {!user && (
              <Link to="/login" className="btn btn-outline btn-lg">{t('home.login')}</Link>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section features-section">
        <div className="features-decoration features-decoration-1">+</div>
        <div className="features-decoration features-decoration-2">+</div>
        <div className="grid grid-3">
          <div
            className="card card-subtle feature-card feature-card-clickable"
            onClick={() => navigate('/specialists')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/specialists')}
          >
            <div className="feature-icon">👨‍⚕️</div>
            <h3>{t('home.feature_specialists_title')}</h3>
            <p>{t('home.feature_specialists_desc')}</p>
            <span className="feature-link">{t('home.feature_specialists_link')}</span>
          </div>

          <div
            className="card card-subtle feature-card feature-card-clickable"
            onClick={() => navigate('/booking')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/booking')}
          >
            <div className="feature-icon">📅</div>
            <h3>{t('home.feature_online_title')}</h3>
            <p>{t('home.feature_online_desc')}</p>
            <span className="feature-link">{t('home.feature_online_link')}</span>
          </div>

          <div
            className="card card-subtle feature-card feature-card-clickable"
            onClick={() => setShowReminderInfo(!showReminderInfo)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setShowReminderInfo(!showReminderInfo)}
          >
            <div className="feature-icon">🔔</div>
            <h3>{t('home.feature_reminders_title')}</h3>
            <p>{t('home.feature_reminders_desc')}</p>
            <span className="feature-link">{showReminderInfo ? t('home.feature_reminders_hide') : t('home.feature_reminders_link')}</span>
          </div>
        </div>

        {showReminderInfo && (
          <div className="card reminder-detail-card" style={{ marginTop: 20 }}>
            <div className="reminder-steps">
              <div className="reminder-step">
                <div className="reminder-step-number">1</div>
                <div>
                  <strong>{t('home.reminder_step1_title')}</strong>
                  <p>{t('home.reminder_step1_desc')}</p>
                </div>
              </div>
              <div className="reminder-step">
                <div className="reminder-step-number">2</div>
                <div>
                  <strong>{t('home.reminder_step2_title')}</strong>
                  <p>{t('home.reminder_step2_desc')}</p>
                </div>
              </div>
              <div className="reminder-step">
                <div className="reminder-step-number">3</div>
                <div>
                  <strong>{t('home.reminder_step3_title')}</strong>
                  <p>{t('home.reminder_step3_desc')}</p>
                </div>
              </div>
              <div className="reminder-step">
                <div className="reminder-step-number">4</div>
                <div>
                  <strong>{t('home.reminder_step4_title')}</strong>
                  <p>{t('home.reminder_step4_desc')}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Specialties */}
      <section className="section">
        <h2 className="section-title">{t('home.specialties_title')}</h2>
        <p className="section-subtitle">{t('home.specialties_subtitle')}</p>
        {loading ? (
          <div className="grid grid-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="card specialty-card" style={{ opacity: 0.5, textAlign: 'center', padding: 28 }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔬</div>
                <div style={{ height: 16, background: 'var(--gray-200)', borderRadius: 4, marginBottom: 8, width: '60%', margin: '0 auto 8px' }} />
                <div style={{ height: 12, background: 'var(--gray-200)', borderRadius: 4, width: '80%', margin: '0 auto' }} />
              </div>
            ))}
          </div>
        ) : specialties.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
            No hay especialidades disponibles
          </p>
        ) : (
          <>
            <div className="grid grid-4">
              {specialties.map((spec) => {
                const specDoctors = doctorsBySpecialty[spec.name] || [];
                const isExpanded = expandedSpecialty === spec.id;
                const bgLight = spec.color + '1F';
                return (
                  <div
                    key={spec.id}
                    className={`card specialty-card specialty-card-expanded ${isExpanded ? 'specialty-expanded' : ''}`}
                    onClick={() => toggleSpecialty(spec.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && toggleSpecialty(spec.id)}
                    style={{ '--spec-color': spec.color, '--spec-bg': bgLight }}
                  >
                    <div className="specialty-icon">{spec.icon}</div>
                    <h4>{spec.name}</h4>
                    <p>{spec.description}</p>
                    <span className="specialty-expand-icon">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                );
              })}
            </div>

            {expandedSpecialty && (
              <div className="specialty-detail-panel">
                {(() => {
                  const spec = specialties.find((s) => s.id === expandedSpecialty);
                  if (!spec) return null;
                  const specDoctors = doctorsBySpecialty[spec.name] || [];
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
                          <h4>{t('home.procedures_title')}</h4>
                          <div className="procedure-list">
                            {(spec.procedures || []).map((proc) => (
                              <div key={proc} className="procedure-item">
                                <span className="procedure-check">✓</span>
                                <span>{proc}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="specialty-detail-section">
                          <h4>{t('home.specialists_title')}</h4>
                          {specDoctors.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                              No hay doctores disponibles para esta especialidad
                            </p>
                          ) : (
                            <div className="doctor-mini-grid">
                              {specDoctors.map((doc) => (
                                <div key={doc.id} className="doctor-mini-card">
                                  <div className="doctor-mini-avatar">👨‍⚕️</div>
                                  <div>
                                    <strong>{doc.name}</strong>
                                    <span>{spec.name}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => navigate('/booking')}
                          className="btn btn-primary btn-lg btn-block"
                          style={{ backgroundColor: spec.color, marginTop: 8 }}
                        >
                          {t('home.book_with_specialist', { name: spec.name })}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        )}
      </section>

      {/* Policy */}
      <section className="section">
        <div className="card card-subtle policy-card">
          <h3>{t('home.policy_title')}</h3>
          <p>{t('home.policy_desc')}</p>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="card cta-card">
          <h3>{t('home.already_booked_title')}</h3>
          <p>{t('home.already_booked_desc')}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>{t('home.footer_text')}</p>
        <p className="footer-detail">{t('home.footer_address')}</p>
      </footer>
    </div>
  );
}
