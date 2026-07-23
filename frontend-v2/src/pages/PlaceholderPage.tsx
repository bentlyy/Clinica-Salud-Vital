import { useNavigate } from 'react-router-dom'

export default function PlaceholderPage({ title }: { title: string }) {
  const navigate = useNavigate()
  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', 
      height: '100vh', background: 'var(--gray-50)', fontFamily: 'var(--font-family)' 
    }}>
      <div style={{ 
        width: 64, height: 64, marginBottom: 24,
        background: 'linear-gradient(135deg, var(--teal-500), var(--teal-700))',
        borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32
      }}>💚</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 8 }}>{title}</h1>
      <p style={{ color: 'var(--gray-400)', fontSize: 14, marginBottom: 24 }}>Esta página está en construcción</p>
      <button onClick={() => navigate('/')} style={{
        padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600,
        background: 'linear-gradient(135deg, var(--teal-600), var(--teal-700))',
        color: 'white', border: 'none', cursor: 'pointer'
      }}>Volver al Inicio</button>
    </div>
  )
}
