import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, LogOut, Shield, User, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'

export default function Dashboard() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  // Guard: if unauthenticated redirect to '/'
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: 'Sessão expirada.',
        description: 'Faça login novamente.',
        className: 'border-l-4 border-l-[#E10613] bg-[#121216] text-white',
      })
      navigate('/', { replace: true })
    }
  }, [isLoading, isAuthenticated, navigate, toast])

  const handleLogout = () => {
    logout()
    toast({
      title: 'Você saiu da sessão.',
      description: 'Até logo!',
      className: 'border-l-4 border-l-[#E10613] bg-[#121216] text-white',
    })
    navigate('/', { replace: true })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#08080B] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#E10613]" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  // First name extraction
  const firstName = user.name ? user.name.split(' ')[0] : 'Usuário'
  const initial = firstName.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen w-full bg-[#08080B] text-white flex flex-col justify-between">
      {/* HEADER */}
      <header className="w-full border-b border-white/[0.08] bg-[#0D0D11]/90 backdrop-blur-md px-6 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E10613] flex items-center justify-center shadow-[0_0_16px_rgba(225,6,19,0.4)] border border-white/20">
              <TrendingUp className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="text-white text-xl font-extrabold tracking-[0.2em] leading-none">
                RUBRA
              </span>
              <span className="text-[9px] tracking-[0.14em] uppercase text-white/40 font-bold mt-0.5">
                Financial Suite
              </span>
            </div>
          </div>

          {/* User Chip & Sair Button */}
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#E10613] border border-white/20 text-white font-extrabold flex items-center justify-center shadow-[0_0_12px_rgba(225,6,19,0.3)] text-sm">
                {initial}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-sm font-bold text-white leading-tight">Olá, {firstName}</span>
                <span className="text-xs text-[#A0A0AA] truncate max-w-[180px]">{user.email}</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="h-10 px-4 rounded-xl border border-[#E10613]/80 hover:bg-[#E10613] text-[#E10613] hover:text-white font-semibold text-sm transition-all duration-150 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#E10613]"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* BODY / PLACEHOLDER STUB */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-12 flex flex-col items-center justify-center text-center">
        <div className="max-w-md w-full bg-[#0D0D11] border border-white/10 rounded-2xl p-8 sm:p-10 shadow-[0_24px_80px_rgba(0,0,0,0.6)] animate-rise-in">
          <div className="w-16 h-16 rounded-2xl bg-[#E10613]/10 border border-[#E10613]/30 text-[#E10613] flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
            Bem-vindo, {firstName}.
          </h1>

          <p className="text-[#A0A0AA] text-sm sm:text-base leading-relaxed mb-6">
            Seu painel financeiro será exibido aqui em breve.
          </p>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-[#63636D] text-left space-y-1">
            <div className="text-white/80 font-semibold">Conta ativa:</div>
            <div className="text-[#A0A0AA]">{user.email}</div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full border-t border-white/[0.08] py-4 px-6 text-center text-xs text-[#63636D]">
        Rubra Financial Suite &copy; {new Date().getFullYear()} &mdash; Todos os direitos
        reservados.
      </footer>
    </div>
  )
}
