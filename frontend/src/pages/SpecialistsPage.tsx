import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/useI18n';
import { extractList } from '../utils/extract-list';
import { getDoctors } from '../api/doctors';
import { getSpecialties } from '../api/specialties';

const specialtyIcons = {
  Cardiología: '❤️',
  Dermatología: '🔬',
  Neurología: '🧠',
  Pediatría: '👶',
  Traumatología: '🦴',
  Oftalmología: '👁️',
  Ginecología: '👩',
  Urología: '🩺',
  Medicina: '💊',
};

const specialtyKeyMap = {
  Cardiología: 'specialists.spec_cardio',
  Dermatología: 'specialists.spec_derma',
  Neurología: 'specialists.spec_neuro',
  Pediatría: 'specialists.spec_pedia',
  Traumatología: 'specialists.spec_trauma',
  Oftalmología: 'specialists.spec_oftal',
  Ginecología: 'specialists.spec_gineco',
  Urología: 'specialists.spec_uro',
  Medicina: 'specialists.spec_med',
};

const doctorColors = [
  '#1976D2', '#388E3C', '#E65100', '#7B1FA2',
  '#C62828', '#00838F', '#1565C0', '#6A1B9A',
  '#2E7D32', '#D84315', '#4527A0', '#01579B',
];

function getInitials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function getColorForDoctor(id) {
  return doctorColors[id % doctorColors.length];
}

export default function SpecialistsPage() {
  const { t } = useI18n();
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [docs, specs] = await Promise.all([
          getDoctors(),
          getSpecialties(),
        ]);
        setDoctors(extractList(docs));
        setSpecialties(extractList(specs));
      } catch {
        setError(t('specialists.error'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const specialtiesFromDoctors = [...new Set(doctors.map(d => d.specialty))].sort();
  const filteredDoctors = selectedSpecialty
    ? doctors.filter(d => d.specialty === selectedSpecialty)
    : doctors;

  if (loading) {
    return (
      <div className="page-container-wide">
        <div className="sp-loading">
          <div className="sp-spinner" />
          <p>{t('specialists.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container-wide">
      <section className="sp-hero">
        <h1 className="sp-hero-title">
          {t('specialists.title')} <span className="text-accent">{t('specialists.title_accent')}</span>
        </h1>
        <p className="sp-hero-subtitle">
          {t('specialists.subtitle')}
        </p>
      </section>

      {error && <div className="alert alert-error">{error}</div>}

      <section className="sp-section">
        <div className="sp-filter-bar">
          <button
            className={`sp-filter-pill ${!selectedSpecialty ? 'sp-filter-active' : ''}`}
            onClick={() => setSelectedSpecialty(null)}
          >
            {t('specialists.all')}
          </button>
          {specialtiesFromDoctors.map(spec => (
            <button
              key={spec}
              className={`sp-filter-pill ${selectedSpecialty === spec ? 'sp-filter-active' : ''}`}
              onClick={() => setSelectedSpecialty(spec)}
            >
              {specialtyIcons[spec] || '🩺'} {t(specialtyKeyMap[spec] || spec)}
            </button>
          ))}
        </div>

        <div className="sp-doctor-grid">
          {filteredDoctors.length === 0 && !loading && (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state-icon">👨‍⚕️</div>
              <h3>{t('specialists.empty_title')}</h3>
              <p>{selectedSpecialty ? t('specialists.empty_desc_filter', { specialty: t(specialtyKeyMap[selectedSpecialty] || selectedSpecialty) }) : t('specialists.empty_desc_none')}</p>
            </div>
          )}
          {filteredDoctors.map(doc => (
            <div key={doc.id} className="sp-doctor-card">
              <div
                className="sp-doctor-avatar"
                style={{ background: getColorForDoctor(doc.id) }}
              >
                {getInitials(doc.name)}
              </div>
              <div className="sp-doctor-info">
                <h4 className="sp-doctor-name">{doc.name}</h4>
                <span className="sp-doctor-specialty">
                  {specialtyIcons[doc.specialty] || '🩺'} {t(specialtyKeyMap[doc.specialty] || doc.specialty)}
                </span>
              </div>
              <button
                className="btn btn-primary btn-sm sp-book-btn"
                onClick={() => navigate(`/booking?doctor=${doc.id}`)}
              >
                {t('specialists.book')}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
