import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import LandingPage from '@/pages/LandingPage'
import LoginModal from '@/components/LoginModal'

export default function LandingPageWrapper() {
  const [loginOpen, setLoginOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    if (searchParams.get('openLogin') === '1') {
      setLoginOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  return (
    <>
      <LandingPage onOpenLogin={() => setLoginOpen(true)} />
      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  )
}
