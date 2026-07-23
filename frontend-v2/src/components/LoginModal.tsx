import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/useAuth'
import { getRedirectPath } from '@/context/AuthContext'
import './LoginModal.css'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const emailRef = useRef<HTMLInputElement>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [totpCode, setTotpCode] = useState('')
  const [is2FARequired, setIs2FARequired] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setEmail('')
      setPassword('')
      setShowPassword(false)
      setTotpCode('')
      setIs2FARequired(false)
      setIsLoading(false)
      setError('')
    }
  }, [isOpen])

  // Focus email input when modal opens
  useEffect(() => {
    if (isOpen && !is2FARequired) {
      const timer = setTimeout(() => emailRef.current?.focus(), 150)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [isOpen, is2FARequired])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
    return undefined
  }, [isOpen])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Basic validation
    if (!is2FARequired && (!email.trim() || !password)) {
      setError('Por favor completa todos los campos.')
      return
    }
    if (is2FARequired && totpCode.length !== 6) {
      setError('El código debe tener 6 dígitos.')
      return
    }

    setIsLoading(true)
    try {
      const result = await login(email, password, is2FARequired ? totpCode : undefined)

      if (result.requires2FA) {
        setIs2FARequired(true)
        setError('')
        setTotpCode('')
        return
      }

      // Login successful — redirect by role
      // The user is now set in context. We need to read it from context.
      // Since login sets user in AuthContext, we can use getRedirectPath with the stored user.
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const parsed = JSON.parse(storedUser)
        navigate(getRedirectPath(parsed.role))
      } else {
        navigate('/patient')
      }
      onClose()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; code?: string } } }
      const msg = axiosErr.response?.data?.error || 'Error al iniciar sesión. Intenta nuevamente.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [email, password, totpCode, is2FARequired, login, navigate, onClose])

  const handleGuestBooking = useCallback(() => {
    navigate('/booking')
    onClose()
  }, [navigate, onClose])

  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  if (!isOpen) return null

  return (
    <div
      className="lm-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Iniciar sesión"
    >
      <div className="lm-card">
        {/* Close button */}
        <button className="lm-close" onClick={onClose} aria-label="Cerrar">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        {/* Brand */}
        <div className="lm-brand">
          <div className="lm-brand-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <span className="lm-brand-text">Salud Vital</span>
        </div>

        {/* Title */}
        <h2 className="lm-title">Bienvenido de nuevo</h2>
        <p className="lm-subtitle">Ingresa para acceder a tu panel de control</p>

        {/* Error alert */}
        {error && (
          <div className="lm-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form className="lm-form" onSubmit={handleSubmit}>
          {/* Email field — hidden during 2FA */}
          {!is2FARequired && (
            <>
              <div className="lm-field">
                <label className="lm-label" htmlFor="lm-email">Correo electrónico</label>
                <div className="lm-input-wrapper">
                  <svg className="lm-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M22 4L12 13 2 4" />
                  </svg>
                  <input
                    ref={emailRef}
                    id="lm-email"
                    type="email"
                    className="lm-input"
                    placeholder="doctor@clinica.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="lm-field">
                <label className="lm-label" htmlFor="lm-password">Contraseña</label>
                <div className="lm-input-wrapper">
                  <svg className="lm-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    id="lm-password"
                    type={showPassword ? 'text' : 'password'}
                    className="lm-input"
                    placeholder="Ingresa tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="lm-toggle-pw"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* 2FA field — shown when required */}
          {is2FARequired && (
            <div className="lm-field lm-field-2fa">
              <label className="lm-label" htmlFor="lm-totp">Código 2FA</label>
              <input
                id="lm-totp"
                type="text"
                className="lm-input lm-input-2fa"
                placeholder="000000"
                value={totpCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                  setTotpCode(val)
                }}
                maxLength={6}
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
              />
              <p className="lm-2fa-hint">
                Ingresa el código de 6 dígitos desde tu aplicación de autenticación.
              </p>
            </div>
          )}

          {/* Options row — only visible in credential step */}
          {!is2FARequired && (
            <div className="lm-options">
              <label className="lm-checkbox">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="lm-checkbox-mark" />
                <span className="lm-checkbox-text">Recordarme</span>
              </label>
              <a href="/forgot-password" className="lm-forgot" onClick={(e) => { e.preventDefault(); onClose(); navigate('/forgot-password') }}>
                ¿Olvidaste tu contraseña?
              </a>
            </div>
          )}

          {/* Back button during 2FA */}
          {is2FARequired && (
            <button
              type="button"
              className="lm-back"
              onClick={() => {
                setIs2FARequired(false)
                setTotpCode('')
                setError('')
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Volver
            </button>
          )}

          {/* Submit button */}
          <button
            type="submit"
            className="lm-submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="lm-spinner" />
            ) : is2FARequired ? (
              'Verificar Código'
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="lm-divider">
          <span className="lm-divider-line" />
          <span className="lm-divider-text">o</span>
          <span className="lm-divider-line" />
        </div>

        {/* Guest button */}
        <button className="lm-guest" onClick={handleGuestBooking}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          Reservar como invitado
        </button>

        {/* Signup link */}
        <p className="lm-signup">
          ¿No tienes cuenta?{' '}
          <a href="/register" onClick={(e) => { e.preventDefault(); onClose(); navigate('/register') }}>
            Regístrate aquí
          </a>
        </p>
      </div>
    </div>
  )
}
