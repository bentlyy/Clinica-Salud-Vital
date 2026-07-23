import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/useAuth'
import type { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles?: string[]
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ 
          width: 40, height: 40, border: '3px solid var(--gray-200)', 
          borderTopColor: 'var(--teal-500)', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite' 
        }} />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/?openLogin=1" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
