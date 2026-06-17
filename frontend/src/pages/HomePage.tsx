import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useTheme } from '../context/useTheme';
import { useI18n } from '../i18n/useI18n';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t } = useI18n();
  const [expandedSpecialty, setExpandedSpecialty] = useState(null);
  const [showReminderInfo, setShowReminderInfo] = useState(false);

  const specialtiesData = [
    {
      id: 'cardiologia',
      icon: '❤️',
      name: 'home.spec_cardio',
      desc: 'home.spec_cardio_desc',
      department: 'home.spec_cardio_dept',
      color: theme === 'dark' ? '#ef4444' : '#dc2626',
      bgLight: theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
      procedures: [
        'home.proc_ecg',
        'home.proc_echo',
        'home.proc_stress',
        'home.proc_holter',
        'home.proc_catheter',
        'home.proc_hypertension',
      ],
      doctors: [
        { name: 'home.doctor_1_name', sub: 'home.doctor_1_title' },
        { name: 'home.doctor_2_name', sub: 'home.doctor_2_title' },
      ],
    },
    {
      id: 'dermatologia',
      icon: '🔬',
      name: 'home.spec_derma',
      desc: 'home.spec_derma_desc',
      department: 'home.spec_derma_dept',
      color: theme === 'dark' ? '#a855f7' : '#9333ea',
      bgLight: theme === 'dark' ? 'rgba(168, 85, 247, 0.15)' : '#faf5ff',
      procedures: [
        'home.proc_dermatoscopy',
        'home.proc_biopsy',
        'home.proc_acne',
        'home.proc_mole_surgery',
        'home.proc_cryo',
        'home.proc_laser',
      ],
      doctors: [
        { name: 'home.doctor_3_name', sub: 'home.doctor_3_title' },
        { name: 'home.doctor_4_name', sub: 'home.doctor_4_title' },
      ],
    },
    {
      id: 'neurologia',
      icon: '🧠',
      name: 'home.spec_neuro',
      desc: 'home.spec_neuro_desc',
      department: 'home.spec_neuro_dept',
      color: theme === 'dark' ? '#3b82f6' : '#2563eb',
      bgLight: theme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
      procedures: [
        'home.proc_eeg',
        'home.proc_mri',
        'home.proc_evoked',
        'home.proc_migraine',
        'home.proc_epilepsy',
        'home.proc_neurorehab',
      ],
      doctors: [
        { name: 'home.doctor_5_name', sub: 'home.doctor_5_title' },
        { name: 'home.doctor_6_name', sub: 'home.doctor_6_title' },
      ],
    },
    {
      id: 'pediatria',
      icon: '👶',
      name: 'home.spec_pedia',
      desc: 'home.spec_pedia_desc',
      department: 'home.spec_pedia_dept',
      color: theme === 'dark' ? '#fbbf24' : '#f59e0b',
      bgLight: theme === 'dark' ? 'rgba(251, 191, 36, 0.15)' : '#fffbeb',
      procedures: [
        'home.proc_wellness',
        'home.proc_vaccination',
        'home.proc_growth',
        'home.proc_infections',
        'home.proc_allergies',
        'home.proc_nutrition',
      ],
      doctors: [
        { name: 'home.doctor_7_name', sub: 'home.doctor_7_title' },
        { name: 'home.doctor_8_name', sub: 'home.doctor_8_title' },
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
              <h4>{t(spec.name)}</h4>
              <p>{t(spec.desc)}</p>
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
                      <h3>{t(spec.name)}</h3>
                      <p>{t(spec.department)}</p>
                    </div>
                  </div>

                  <div className="specialty-detail-body">
                    <div className="specialty-detail-section">
                      <h4>{t('home.procedures_title')}</h4>
                      <div className="procedure-list">
                        {spec.procedures.map((proc) => (
                          <div key={proc} className="procedure-item">
                            <span className="procedure-check">✓</span>
                            <span>{t(proc)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="specialty-detail-section">
                      <h4>{t('home.specialists_title')}</h4>
                      <div className="doctor-mini-grid">
                        {spec.doctors.map((doc) => (
                          <div key={doc.name} className="doctor-mini-card">
                            <div className="doctor-mini-avatar">👨‍⚕️</div>
                            <div>
                              <strong>{t(doc.name)}</strong>
                              <span>{t(doc.sub)}</span>
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
                      {t('home.book_with_specialist', { name: t(spec.name) })}
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
