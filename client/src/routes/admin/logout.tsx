import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

function LogoutPage() {
  const navigate = useNavigate()

  useEffect(() => {
    localStorage.removeItem('token')
    navigate({ to: '/admin/login', replace: true })
  }, [navigate])

  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-white font-arabic">
      <p className="text-gray-500 text-lg">جاري تسجيل الخروج...</p>
    </div>
  )
}

export const Route = createFileRoute('/admin/logout')({
  component: LogoutPage,
})
