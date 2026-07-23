import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { I18nProvider } from '@/i18n/I18nContext'
import LoginModal from '@/components/LoginModal'

function renderModal(isOpen = true, onClose = vi.fn()) {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <I18nProvider>
            <LoginModal isOpen={isOpen} onClose={onClose} />
          </I18nProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>,
  )
}

describe('LoginModal', () => {
  it('renders when isOpen is true', () => {
    renderModal(true)
    expect(screen.getByText('Bienvenido de nuevo')).toBeInTheDocument()
    expect(
      screen.getByText(/Ingresa para acceder/i),
    ).toBeInTheDocument()
  })

  it('does not render when isOpen is false', () => {
    renderModal(false)
    expect(screen.queryByText('Bienvenido de nuevo')).not.toBeInTheDocument()
  })

  it('has email and password inputs when not in 2FA mode', () => {
    renderModal()
    expect(
      screen.getByPlaceholderText('doctor@clinica.com'),
    ).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('Ingresa tu contraseña'),
    ).toBeInTheDocument()
  })

  it('calls onClose when clicking the overlay backdrop', () => {
    const onClose = vi.fn()
    renderModal(true, onClose)
    // The overlay has class lm-overlay and role="dialog"
    const overlay = screen.getByRole('dialog')
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when clicking the close button', () => {
    const onClose = vi.fn()
    renderModal(true, onClose)
    const closeButton = screen.getByLabelText('Cerrar')
    fireEvent.click(closeButton)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('has a guest booking button', () => {
    renderModal()
    expect(
      screen.getByText('Reservar como invitado'),
    ).toBeInTheDocument()
  })

  it('has a forgot password link', () => {
    renderModal()
    expect(
      screen.getByText('¿Olvidaste tu contraseña?'),
    ).toBeInTheDocument()
  })

  it('has a register link', () => {
    renderModal()
    expect(
      screen.getByText('Regístrate aquí'),
    ).toBeInTheDocument()
  })

  it('renders the Salud Vital brand in the modal', () => {
    renderModal()
    expect(screen.getByText('Salud Vital')).toBeInTheDocument()
  })

  it('has a submit button with Iniciar Sesión text', () => {
    renderModal()
    expect(
      screen.getByRole('button', { name: 'Iniciar Sesión' }),
    ).toBeInTheDocument()
  })
})
