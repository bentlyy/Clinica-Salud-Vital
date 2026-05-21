import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
        setDoctors(docs);
        setSpecialties(specs);
      } catch {
        setError('Error al cargar los especialistas');
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
          <p>Cargando especialistas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container-wide">
      <section className="sp-hero">
        <h1 className="sp-hero-title">Nuestros <span className="text-accent">Especialistas</span></h1>
        <p className="sp-hero-subtitle">
          Contamos con un equipo médico de excelencia en diversas especialidades
        </p>
      </section>

      {error && <div className="alert alert-error">{error}</div>}

      <section className="sp-section">
        <div className="sp-filter-bar">
          <button
            className={`sp-filter-pill ${!selectedSpecialty ? 'sp-filter-active' : ''}`}
            onClick={() => setSelectedSpecialty(null)}
          >
            Todos
          </button>
          {specialtiesFromDoctors.map(spec => (
            <button
              key={spec}
              className={`sp-filter-pill ${selectedSpecialty === spec ? 'sp-filter-active' : ''}`}
              onClick={() => setSelectedSpecialty(spec)}
            >
              {specialtyIcons[spec] || '🩺'} {spec}
            </button>
          ))}
        </div>

        <div className="sp-doctor-grid">
          {filteredDoctors.length === 0 && !loading && (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state-icon">👨‍⚕️</div>
              <h3>No hay especialistas disponibles</h3>
              <p>{selectedSpecialty ? `No encontramos doctores en ${selectedSpecialty}` : 'No hay doctores registrados aún'}</p>
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
                  {specialtyIcons[doc.specialty] || '🩺'} {doc.specialty}
                </span>
              </div>
              <button
                className="btn btn-primary btn-sm sp-book-btn"
                onClick={() => navigate(`/booking?doctor=${doc.id}`)}
              >
                Reservar cita
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
