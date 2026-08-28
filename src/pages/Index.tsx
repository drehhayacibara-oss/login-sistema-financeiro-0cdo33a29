import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Loader2,
  AlertCircle,
  TrendingUp,
  Check,
  ArrowRight,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { BrandPanel } from '@/components/BrandPanel'
import { ForgotPasswordModal } from '@/components/ForgotPasswordModal'
import { useToast } from '@/hooks/use-toast'
import { ClientResponseError } from 'pocketbase'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

export default function Index() {
  const navigate = useNavigate()
  const { login, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const { toast } = useToast()

  // Form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  // Validation errors
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [serverAlert, setServerAlert] = useState<string | null>(null)

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Recovery modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false)

  // Refs for focusing
  const emailInputRef = useRef<HTMLInputElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)

  // Redirect if already authenticated
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, isAuthLoading, navigate])

  const validateEmail = (val: string): boolean => {
    const trimmed = val.trim()
    if (!trimmed) {
      setEmailError('Informe seu e-mail.')
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmed)) {
      setEmailError('Informe um e-mail válido.')
      return false
    }
    setEmailError(null)
    return true
  }

  const validatePassword = (val: string): boolean => {
    if (!val) {
      setPasswordError('Informe sua senha.')
      return false
    }
    if (val.length < 8) {
      setPasswordError('A senha deve ter no mínimo 8 caracteres.')
      return false
    }
    setPasswordError(null)
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerAlert(null)

    const isEmailValid = validateEmail(email)
    const isPasswordValid = validatePassword(password)

    if (!isEmailValid) {
      emailInputRef.current?.focus()
      return
    }

    if (!isPasswordValid) {
      passwordInputRef.current?.focus()
      return
    }

    setIsSubmitting(true)

    try {
      await login(email, password, rememberMe)

      toast({
        title: 'Login realizado com sucesso.',
        description: 'Redirecionando para o painel...',
        className: 'border-l-4 border-l-emerald-500 bg-[#121216] text-white',
      })

      setTimeout(() => {
        navigate('/dashboard', { replace: true })
      }, 600)
    } catch (err: unknown) {
      setIsSubmitting(false)

      if (err instanceof ClientResponseError) {
        // Check for field level errors
        const fieldErrors = extractFieldErrors(err)
        if (fieldErrors.email) {
          setEmailError(fieldErrors.email)
        }
        if (fieldErrors.password) {
          setPasswordError(fieldErrors.password)
        }

        if (
          err.status === 400 ||
          err.status === 404 ||
          err.message?.toLowerCase().includes('failed to authenticate')
        ) {
          setServerAlert('E-mail ou senha inválidos.')
        } else if (err.status >= 500 || err.isAbort) {
          setServerAlert(
            'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
          )
        } else {
          setServerAlert(err.message || 'E-mail ou senha inválidos.')
        }
      } else if (
        err instanceof Error &&
        (err.name === 'TypeError' || err.message.includes('fetch'))
      ) {
        setServerAlert(
          'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
        )
      } else {
        setServerAlert('E-mail ou senha inválidos.')
      }

      // Focus first erroneous input
      if (!isEmailValid) {
        emailInputRef.current?.focus()
      } else {
        passwordInputRef.current?.focus()
      }
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-[#08080B] text-white overflow-x-hidden">
      {/* LEFT BRAND PANEL (DESKTOP ≥1024px) */}
      <div className="hidden lg:block lg:w-[54%] h-screen sticky top-0">
        <BrandPanel />
      </div>

      {/* RIGHT FORM PANEL */}
      <div className="w-full lg:w-[46%] min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 bg-[#0D0D11] border-l border-white/[0.08] relative">
        {/* Background Subtle Grid Texture on Right Panel too */}
        <div className="absolute inset-0 bg-grid-subtle opacity-50 pointer-events-none" />

        {/* Compact Mobile/Tablet Brand Header (<1024px) */}
        <div className="lg:hidden flex items-center justify-between pb-6 mb-4 border-b border-white/[0.08] relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E10613] flex items-center justify-center shadow-[0_0_16px_rgba(225,6,19,0.4)] border border-white/20">
              <TrendingUp className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="text-white text-xl font-extrabold tracking-[0.18em] leading-none">
                RUBRA
              </span>
              <span className="text-[9px] tracking-[0.14em] uppercase text-white/40 font-bold mt-0.5">
                Financial Suite
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-400/90 font-medium bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sistema Seguro</span>
          </div>
        </div>

        {/* Center Form Container */}
        <div className="relative z-10 w-full max-w-[420px] mx-auto my-auto py-6">
          {/* Header */}
          <div className="mb-8 animate-rise-in" style={{ animationDelay: '0ms' }}>
            <h2 className="text-2xl sm:text-3xl lg:text-[32px] font-extrabold text-white tracking-tight leading-tight">
              Bem-vindo de volta
            </h2>
            <p className="text-sm sm:text-base text-[#A0A0AA] mt-2">
              Acesse sua conta para continuar.
            </p>
          </div>

          {/* Error Alert Box */}
          {serverAlert && (
            <div
              className="mb-6 p-4 rounded-xl bg-[#E10613]/10 border border-[#E10613]/40 text-[#FCA5A5] text-sm flex items-start gap-3 animate-error-shake"
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle className="w-5 h-5 text-[#E10613] shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{serverAlert}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* E-mail Field */}
            <div className="animate-rise-in space-y-1.5" style={{ animationDelay: '80ms' }}>
              <label
                htmlFor="login-email"
                className="block text-[13px] font-semibold text-white/90"
              >
                E-mail
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="login-email"
                  ref={emailInputRef}
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (emailError) validateEmail(e.target.value)
                  }}
                  onBlur={() => validateEmail(email)}
                  placeholder="voce@empresa.com.br"
                  disabled={isSubmitting}
                  className={`w-full h-[48px] pl-10 pr-4 bg-[#16161C] border rounded-xl text-sm text-white placeholder:text-white/30 transition-all focus:outline-none ${
                    emailError
                      ? 'border-[#E10613] ring-1 ring-[#E10613]'
                      : 'border-white/10 hover:border-white/20 focus:border-[#E10613] focus:ring-4 focus:ring-[#E10613]/20'
                  }`}
                />
              </div>
              {emailError && (
                <p className="text-xs text-[#FCA5A5] font-medium pt-0.5">{emailError}</p>
              )}
            </div>

            {/* Senha Field */}
            <div className="animate-rise-in space-y-1.5" style={{ animationDelay: '160ms' }}>
              <label
                htmlFor="login-password"
                className="block text-[13px] font-semibold text-white/90"
              >
                Senha
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="login-password"
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (passwordError) validatePassword(e.target.value)
                  }}
                  onBlur={() => validatePassword(password)}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  className={`w-full h-[48px] pl-10 pr-11 bg-[#16161C] border rounded-xl text-sm text-white placeholder:text-white/30 transition-all focus:outline-none ${
                    passwordError
                      ? 'border-[#E10613] ring-1 ring-[#E10613]'
                      : 'border-white/10 hover:border-white/20 focus:border-[#E10613] focus:ring-4 focus:ring-[#E10613]/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-[#E10613] rounded"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 transition-transform duration-150" />
                  ) : (
                    <Eye className="w-4 h-4 transition-transform duration-150" />
                  )}
                </button>
              </div>
              {passwordError && (
                <p className="text-xs text-[#FCA5A5] font-medium pt-0.5">{passwordError}</p>
              )}
            </div>

            {/* Utility Row: Lembrar-me + Esqueci minha senha */}
            <div
              className="animate-rise-in flex items-center justify-between pt-1"
              style={{ animationDelay: '240ms' }}
            >
              <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    rememberMe
                      ? 'bg-[#E10613] border-[#E10613]'
                      : 'bg-[#16161C] border-white/20 group-hover:border-white/40'
                  }`}
                  onClick={() => setRememberMe(!rememberMe)}
                  role="checkbox"
                  aria-checked={rememberMe}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault()
                      setRememberMe(!rememberMe)
                    }
                  }}
                >
                  {rememberMe && <Check className="w-3 h-3 text-white stroke-[3]" />}
                </div>
                <span className="text-xs sm:text-[13px] text-[#A0A0AA] group-hover:text-white transition-colors">
                  Lembrar-me
                </span>
              </label>

              <button
                type="button"
                onClick={() => setIsForgotModalOpen(true)}
                className="text-xs sm:text-[13px] font-semibold text-[#E10613] hover:text-[#C00510] hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-[#E10613] rounded"
              >
                Esqueci minha senha
              </button>
            </div>

            {/* Submit Button "Entrar" */}
            <div className="animate-rise-in pt-2" style={{ animationDelay: '320ms' }}>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-[52px] rounded-xl bg-[#E10613] hover:bg-[#C00510] active:bg-[#9A040C] active:scale-[0.99] text-white font-bold text-base transition-all duration-150 shadow-[0_0_24px_rgba(225,6,19,0.35)] hover:shadow-[0_0_32px_rgba(225,6,19,0.5)] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-[#E10613]/40"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Entrando...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar</span>
                    <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                  </>
                )}
              </button>
            </div>

            {/* Divider "ou" */}
            <div
              className="animate-rise-in flex items-center gap-3 py-2"
              style={{ animationDelay: '400ms' }}
            >
              <div className="flex-1 h-[1px] bg-white/[0.08]" />
              <span className="text-xs uppercase text-[#63636D] font-bold tracking-wider">ou</span>
              <div className="flex-1 h-[1px] bg-white/[0.08]" />
            </div>

            {/* Admin Access Note */}
            <div className="animate-rise-in text-center" style={{ animationDelay: '480ms' }}>
              <p className="text-xs sm:text-[13px] text-[#A0A0AA] leading-relaxed">
                Novo por aqui?{' '}
                <span className="text-white/80 font-medium">
                  Solicite seu acesso ao administrador.
                </span>
              </p>
            </div>
          </form>
        </div>

        {/* Security Footer */}
        <div className="relative z-10 pt-6 mt-4 border-t border-white/[0.08] flex items-center justify-center gap-2 text-[#63636D] text-xs">
          <ShieldCheck className="w-4 h-4 text-white/30" />
          <span>Ambiente seguro com criptografia de ponta a ponta.</span>
        </div>
      </div>

      {/* Password Recovery Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        initialEmail={email}
      />
    </div>
  )
}
