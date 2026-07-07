import { useEffect, useState, useMemo } from 'react';
import { getLabTests } from '../api/laboratory';
import { useI18n } from '../i18n/useI18n';
import { getLabIcon, getLabColor } from '../components/lab-icons/LabIcons';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

interface LabTestItem {
  id: string | number;
  name: string;
  description?: string;
  code?: string;
  category?: string;
  unit?: string;
  price?: number;
  reference_ranges?: Record<string, { min?: number; max?: number }>;
  active?: boolean;
}

const CATEGORY_MAP: Record<string, { icon: string; label: string }> = {
  HEM: { icon: '🩸', label: 'Hematología' },
  GLU: { icon: '🧬', label: 'Bioquímica' },
  LIP: { icon: '❤️', label: 'Perfil Lipídico' },
  CRE: { icon: '🫘', label: 'Función Renal' },
  TSH: { icon: '🦋', label: 'Hormonas y Tiroides' },
  URO: { icon: '💧', label: 'Microbiología y Orina' },
  HBA: { icon: '🩸', label: 'Diabetes' },
  PCR: { icon: '🛡️', label: 'Inmunología e Inflamación' },
  ALT: { icon: '🫁', label: 'Función Hepática' },
};

function getCategory(code: string): { prefix: string; icon: string; label: string } {
  const prefix = (code || '').slice(0, 3).toUpperCase();
  const cat = CATEGORY_MAP[prefix];
  return cat
    ? { prefix, ...cat }
    : { prefix, icon: '🔬', label: 'Otros Análisis' };
}

function getTurnaround(code: string): string {
  const prefix = (code || '').slice(0, 3).toUpperCase();
  const times: Record<string, string> = {
    HEM: '24 horas',
    GLU: '6 horas',
    LIP: '24 horas',
    CRE: '12 horas',
    TSH: '48 horas',
    URO: '72 horas',
    HBA: '24 horas',
    PCR: '12 horas',
    ALT: '24 horas',
  };
  return times[prefix] || '24-48 horas';
}

function getPreparation(code: string): string | null {
  const prefix = (code || '').slice(0, 3).toUpperCase();
  const preps: Record<string, string> = {
    GLU: 'Ayuno de 8 horas requerido',
    LIP: 'Ayuno de 12 horas requerido',
    HBA: 'No requiere ayuno',
    TSH: 'No requiere preparación especial',
  };
  return preps[prefix] || null;
}

export default function LabTestsCatalogPage() {
  const { t } = useI18n();
  const [tests, setTests] = useState<LabTestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    getLabTests({ active: true, limit: 100 })
      .then((res) => setTests(Array.isArray(res) ? res : []))
      .catch(() => setError(t('lab_results.error_loading') || 'Error al cargar exámenes'))
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => {
    const filtered = tests.filter((test) => {
      const matchesSearch = !search || test.name?.toLowerCase().includes(search.toLowerCase()) || test.code?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !activeCategory || getCategory(test.code || '').prefix === activeCategory;
      return matchesSearch && matchesCategory;
    });

    const groups: Record<string, LabTestItem[]> = {};
    for (const test of filtered) {
      const cat = getCategory(test.code || '');
      if (!groups[cat.prefix]) groups[cat.prefix] = [];
      groups[cat.prefix].push(test);
    }
    return groups;
  }, [tests, search, activeCategory]);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const test of tests) {
      const cat = getCategory(test.code || '');
      if (!seen.has(cat.prefix)) seen.add(cat.prefix);
    }
    return Array.from(seen).map((p) => ({ prefix: p, ...CATEGORY_MAP[p] })).filter(Boolean);
  }, [tests]);

  if (loading) return <LoadingState message="Cargando exámenes de laboratorio..." />;

  if (error) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>🔬 Exámenes de Laboratorio</h1>
          <p>Catálogo de análisis clínicos disponibles</p>
        </div>
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="page-container-wide">
      <div style={{
        background: 'linear-gradient(135deg, #0f766e, #0d9488)',
        borderRadius: 16,
        padding: '32px 36px',
        marginBottom: 28,
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -20, top: -20, fontSize: 120, opacity: 0.08, lineHeight: 1, userSelect: 'none' }}>🔬</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 26,
          }}>🔬</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'white' }}>Exámenes de Laboratorio</h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, opacity: 0.85 }}>Catálogo completo de análisis clínicos — resultados precisos y rápidos</p>
          </div>
        </div>
        <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{
            flex: 1,
            minWidth: 200,
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 10,
            padding: '0 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backdropFilter: 'blur(4px)',
          }}>
            <span>🔍</span>
            <input
              type="text"
              placeholder="Buscar examen por nombre o código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                padding: '10px 0',
                fontSize: 14,
                color: 'white',
                outline: 'none',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 16 }}>✕</button>
            )}
          </div>
        </div>
      </div>

      {categories.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          <button
            onClick={() => setActiveCategory(null)}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              border: '1px solid var(--border-light)',
              background: !activeCategory ? '#0d9488' : 'transparent',
              color: !activeCategory ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              transition: 'all 0.15s',
            }}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.prefix}
              onClick={() => setActiveCategory(activeCategory === cat.prefix ? null : cat.prefix)}
              style={{
                padding: '8px 16px',
                borderRadius: 20,
                border: '1px solid var(--border-light)',
                background: activeCategory === cat.prefix ? '#0d9488' : 'transparent',
                color: activeCategory === cat.prefix ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                transition: 'all 0.15s',
              }}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      )}

      {Object.keys(grouped).length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔬</div>
          <h3 style={{ margin: '0 0 6px' }}>{search ? 'Sin resultados' : 'No hay exámenes disponibles'}</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
            {search ? `No encontramos "${search}". Intenta con otro término.` : 'No hay exámenes publicados en el catálogo.'}
          </p>
        </div>
      )}

      {Object.entries(grouped).map(([prefix, items]) => {
        const cat = CATEGORY_MAP[prefix] || { icon: '🔬', label: 'Otros' };
        return (
          <section key={prefix} style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 22 }}>{cat.icon}</span>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{cat.label}</h2>
              <span style={{
                fontSize: 12,
                padding: '2px 10px',
                borderRadius: 10,
                background: '#f1f5f9',
                color: 'var(--text-muted)',
              }}>{items.length} examen{items.length !== 1 ? 'es' : ''}</span>
            </div>
            <div className="grid" style={{ gap: 14 }}>
              {items.map((test) => {
                const Icon = getLabIcon(test.name || '');
                const color = getLabColor(test.name || '');
                const refs = test.reference_ranges ? Object.entries(test.reference_ranges) : [];
                const preparation = getPreparation(test.code || '');

                return (
                  <div
                    key={test.id}
                    className="card"
                    style={{
                      padding: 0,
                      overflow: 'hidden',
                      border: `1px solid ${color}20`,
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex' }}>
                      <div style={{
                        width: 72,
                        minHeight: '100%',
                        background: `linear-gradient(180deg, ${color}15, ${color}05)`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '12px 0',
                        flexShrink: 0,
                      }}>
                        <div style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          background: `${color}20`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Icon size={22} color={color} />
                        </div>
                        <span style={{
                          fontSize: 10,
                          color: 'var(--text-muted)',
                          marginTop: 4,
                          fontWeight: 600,
                          letterSpacing: '0.3px',
                        }}>{test.code || ''}</span>
                      </div>
                      <div style={{ flex: 1, padding: '16px 20px', minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
                          <div>
                            <strong style={{ fontSize: 15, color: 'var(--text-primary)' }}>{test.name}</strong>
                            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                              {test.description || 'Análisis clínico de laboratorio'}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{
                              fontSize: 16,
                              fontWeight: 700,
                              color: '#0d9488',
                            }}>
                              {test.price ? `$${Number(test.price).toFixed(2)}` : ''}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                          <span style={{
                            fontSize: 11,
                            padding: '4px 10px',
                            borderRadius: 12,
                            background: `${color}12`,
                            color: color,
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}>
                            ⏱ {getTurnaround(test.code || '')}
                          </span>
                          {test.unit && (
                            <span style={{
                              fontSize: 11,
                              padding: '4px 10px',
                              borderRadius: 12,
                              background: '#f0f9ff',
                              color: '#0369a1',
                              fontWeight: 500,
                            }}>
                              📏 {test.unit}
                            </span>
                          )}
                          {preparation && (
                            <span style={{
                              fontSize: 11,
                              padding: '4px 10px',
                              borderRadius: 12,
                              background: '#fffbeb',
                              color: '#92400e',
                              fontWeight: 500,
                            }}>
                              📋 {preparation}
                            </span>
                          )}
                        </div>

                        {refs.length > 0 && (
                          <div style={{
                            marginTop: 10,
                            padding: '8px 12px',
                            background: '#f8fafc',
                            borderRadius: 8,
                            fontSize: 12,
                            color: 'var(--text-secondary)',
                          }}>
                            <strong style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Valores de Referencia</strong>
                            <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {refs.slice(0, 3).map(([key, range]) => {
                                const refStr = range.max !== undefined
                                  ? `${range.min ?? 0} – ${range.max}`
                                  : `≤ ${range.max}`;
                                return (
                                  <span key={key} style={{
                                    padding: '2px 8px',
                                    borderRadius: 6,
                                    background: 'white',
                                    border: '1px solid var(--border-light)',
                                    fontSize: 11,
                                  }}>
                                    {key.replace(/_/g, ' ')}: {refStr}
                                  </span>
                                );
                              })}
                              {refs.length > 3 && (
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '2px 8px' }}>
                                  +{refs.length - 3} más
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
