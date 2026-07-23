import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import LandingPage from '@/pages/LandingPage'

function renderLanding(onOpenLogin = vi.fn()) {
  return render(
    <BrowserRouter>
      <LandingPage onOpenLogin={onOpenLogin} />
    </BrowserRouter>,
  )
}

describe('LandingPage', () => {
  it('renders the brand name', () => {
    renderLanding()
    const brandElements = screen.getAllByText('Salud Vital')
    expect(brandElements.length).toBeGreaterThan(0)
  })

  it('renders the hero badge section', () => {
    renderLanding()
    expect(
      screen.getByText('Plataforma #1 en Gestión Médica'),
    ).toBeInTheDocument()
  })

  it('renders the hero description', () => {
    renderLanding()
    expect(
      screen.getByText(/Gestiona citas, pacientes/i),
    ).toBeInTheDocument()
  })

  it('calls onOpenLogin when login button is clicked', async () => {
    const onOpenLogin = vi.fn()
    renderLanding(onOpenLogin)
    const loginButtons = screen.getAllByText(/iniciar sesión/i)
    loginButtons[0].click()
    expect(onOpenLogin).toHaveBeenCalledTimes(1)
  })

  it('renders feature cards with their titles', () => {
    renderLanding()
    expect(screen.getByText('Gestión de Citas')).toBeInTheDocument()
    expect(screen.getByText('Laboratorio Integrado')).toBeInTheDocument()
    expect(screen.getByText('Analytics Predictivo')).toBeInTheDocument()
    expect(screen.getByText('Multi-Tenant')).toBeInTheDocument()
  })

  it('renders pricing section with plan names', () => {
    renderLanding()
    expect(screen.getByText('Básico')).toBeInTheDocument()
    expect(screen.getByText('Profesional')).toBeInTheDocument()
    expect(screen.getByText('Enterprise')).toBeInTheDocument()
  })

  it('renders how it works steps', () => {
    renderLanding()
    expect(screen.getByText('Crea tu cuenta')).toBeInTheDocument()
    expect(screen.getByText('Configura tu equipo')).toBeInTheDocument()
  })

  it('renders testimonial cards', () => {
    renderLanding()
    expect(screen.getByText('Dr. Manuel García')).toBeInTheDocument()
    expect(screen.getByText('Dra. Sofía Rodríguez')).toBeInTheDocument()
    expect(screen.getByText('Dr. Andrés López')).toBeInTheDocument()
  })

  it('renders FAQ section with questions', () => {
    renderLanding()
    expect(
      screen.getByText('¿Necesito tarjeta de crédito para empezar?'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('¿Puedo migrar mis datos actuales?'),
    ).toBeInTheDocument()
  })

  it('renders the footer', () => {
    renderLanding()
    expect(
      screen.getByText(/todos los derechos reservados/i),
    ).toBeInTheDocument()
  })
})
