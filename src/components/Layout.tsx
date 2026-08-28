import { Outlet } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'

export default function Layout() {
  return (
    <AuthProvider>
      <main className="flex flex-col min-h-screen bg-[#08080B] text-white font-sans selection:bg-[#E10613] selection:text-white">
        <Outlet />
      </main>
    </AuthProvider>
  )
}
