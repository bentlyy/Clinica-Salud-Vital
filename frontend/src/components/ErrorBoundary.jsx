import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '60vh', padding: 40, textAlign: 'center'
        }}>
          <h2 style={{ color: 'var(--danger-600, #dc3545)', marginBottom: 12 }}>Algo salió mal</h2>
          <p style={{ color: 'var(--text-secondary, #666)', marginBottom: 24, maxWidth: 400 }}>
            Ocurrió un error inesperado. Por favor, intenta recargar la página.
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
            style={{
              padding: '10px 24px', border: 'none', borderRadius: 6,
              background: 'var(--primary-500, #2563eb)', color: '#fff',
              fontSize: 15, cursor: 'pointer'
            }}
          >
            Volver al inicio
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
