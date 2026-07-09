import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useI18n } from '../i18n/useI18n';
import api from '../api/axios';
import { getDoctors } from '../api/doctors';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { PageContainer } from '../components/ui/PageContainer';

interface Specialty {
  id: number;
  name: string;
  icon: string;
  description: string;
  department: string;
  procedures: string[];
  color: string;
}

interface Doctor {
  id: number;
  name: string;
  specialty: string;
}

const HomePage = React.memo(function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const [expandedSpecialty, setExpandedSpecialty] = useState<number | null>(null);
  const [showReminderInfo, setShowReminderInfo] = useState(false);
  const [showSurgeryInfo, setShowSurgeryInfo] = useState(false);
  const [showLabInfo, setShowLabInfo] = useState(false);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [doctorsBySpecialty, setDoctorsBySpecialty] = useState<Record<string, Doctor[]>>({});
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

  const toggleSpecialty = (id: number) => {
    setExpandedSpecialty(expandedSpecialty === id ? null : id);
  };

  return (
    <PageContainer maxWidth="xl">
      {/* Hero */}
      <section className="hero">
        <div className="hero-decoration hero-decoration-1">+</div>
        <div className="hero-decoration hero-decoration-2">+</div>
        <div className="hero-content">
          <h1 className="hero-title">{t('home.hero_title')}</h1>
          <p className="hero-subtitle">{t('home.hero_subtitle')}</p>
          <div className="hero-actions">
            <Button variant="primary" size="lg" onClick={() => navigate('/booking')}>
              {t('home.book_appointment')}
            </Button>
            {!user && (
              <Link to="/login" className="ds-btn ds-btn--outline ds-btn--lg">{t('home.login')}</Link>
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
            className="feature-card-clickable"
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
            className="feature-card-clickable"
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
            className="feature-card-clickable"
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

          <div
            className="feature-card-clickable"
            onClick={() => setShowSurgeryInfo(!showSurgeryInfo)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setShowSurgeryInfo(!showSurgeryInfo)}
          >
            <div className="feature-icon">🏥</div>
            <h3>{t('home.feature_surgeries_title')}</h3>
            <p>{t('home.feature_surgeries_desc')}</p>
            <span className="feature-link">{showSurgeryInfo ? t('home.feature_surgeries_hide') : t('home.feature_surgeries_link')}</span>
          </div>

          <div
            className="feature-card-clickable"
            onClick={() => setShowLabInfo(!showLabInfo)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setShowLabInfo(!showLabInfo)}
          >
            <div className="feature-icon">🔬</div>
            <h3>{t('home.feature_exams_title')}</h3>
            <p>{t('home.feature_exams_desc')}</p>
            <span className="feature-link">{showLabInfo ? t('home.feature_exams_hide') : t('home.feature_exams_link')}</span>
          </div>
        </div>

        {showReminderInfo && (
          <div className="reminder-detail-card info-card">
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

        {showSurgeryInfo && (
          <div className="reminder-detail-card info-card">
            <div className="reminder-steps">
              <div className="reminder-step">
                <div className="reminder-step-number">1</div>
                <div>
                  <strong>{t('home.surgery_step1_title')}</strong>
                  <p>{t('home.surgery_step1_desc')}</p>
                </div>
              </div>
              <div className="reminder-step">
                <div className="reminder-step-number">2</div>
                <div>
                  <strong>{t('home.surgery_step2_title')}</strong>
                  <p>{t('home.surgery_step2_desc')}</p>
                </div>
              </div>
              <div className="reminder-step">
                <div className="reminder-step-number">3</div>
                <div>
                  <strong>{t('home.surgery_step3_title')}</strong>
                  <p>{t('home.surgery_step3_desc')}</p>
                </div>
              </div>
              <div className="reminder-step">
                <div className="reminder-step-number">4</div>
                <div>
                  <strong>{t('home.surgery_step4_title')}</strong>
                  <p>{t('home.surgery_step4_desc')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {showLabInfo && (
          <div className="reminder-detail-card info-card">
            <div className="reminder-steps">
              <div className="reminder-step">
                <div className="reminder-step-number">1</div>
                <div>
                  <strong>{t('home.exam_step1_title')}</strong>
                  <p>{t('home.exam_step1_desc')}</p>
                </div>
              </div>
              <div className="reminder-step">
                <div className="reminder-step-number">2</div>
                <div>
                  <strong>{t('home.exam_step2_title')}</strong>
                  <p>{t('home.exam_step2_desc')}</p>
                </div>
              </div>
              <div className="reminder-step">
                <div className="reminder-step-number">3</div>
                <div>
                  <strong>{t('home.exam_step3_title')}</strong>
                  <p>{t('home.exam_step3_desc')}</p>
                </div>
              </div>
              <div className="reminder-step">
                <div className="reminder-step-number">4</div>
                <div>
                  <strong>{t('home.exam_step4_title')}</strong>
                  <p>{t('home.exam_step4_desc')}</p>
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
              <div key={i} className="specialty-card-skeleton">
                <div className="skeleton-icon">🔬</div>
                <div className="skeleton-line skeleton-line-60" />
                <div className="skeleton-line skeleton-line-80" />
              </div>
            ))}
          </div>
        ) : specialties.length === 0 ? (
          <p className="text-center text-muted-lg">
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
                            <p className="text-muted-sm">
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

                        <Button
                          variant="primary"
                          size="lg"
                          onClick={() => navigate('/booking')}
                          style={{ width: '100%', backgroundColor: spec.color }}
                          className="specialty-btn"
                        >
                          {t('home.book_with_specialist', { name: spec.name })}
                        </Button>
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
        <div className="policy-card">
          <h3>{t('home.policy_title')}</h3>
          <p>{t('home.policy_desc')}</p>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="cta-card">
          <h3>{t('home.already_booked_title')}</h3>
          <p>{t('home.already_booked_desc')}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>{t('home.footer_text')}</p>
        <p className="footer-detail">{t('home.footer_address')}</p>
      </footer>
    </PageContainer>
  );
});

export default HomePage;
