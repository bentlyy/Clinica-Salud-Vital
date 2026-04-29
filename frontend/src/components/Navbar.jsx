import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '10px 20px',
        borderBottom: '1px solid #ccc',
        background: '#f9f9f9'
      }}
    >
      {/* 🔥 LEFT */}
      <div>
        <button onClick={() => navigate('/doctors')}>
          Doctors
        </button>

        <button
          onClick={() => navigate('/my-bookings')}
          style={{ marginLeft: '10px' }}
        >
          Mis reservas
        </button>

        {user.role === 'doctor' && (
          <>
            <button
              onClick={() => navigate('/doctor')}
              style={{ marginLeft: '10px' }}
            >
              Panel Doctor
            </button>
          </>
        )}
      </div>

      {/* 🔥 RIGHT */}
      <div>
        <span style={{ marginRight: '10px' }}>
          {user.email}
        </span>

        <button onClick={logout}>
          Logout
        </button>
      </div>
    </div>
  );
}