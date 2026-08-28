import React, { useState, useEffect, useRef } from 'react'
import { X, Mail, CheckCircle2, ArrowRight, Loader2, KeyRound } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  initialEmail?: string
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialEmail = '',
}) => {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState(initialEmail)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail)
      setEmailError(null)
      setIsSubmitted(false)
      setServerError(null)
      setIsSubmitting(false)
      // Focus on open
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen, initialEmail])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)

    if (!validateEmail(email)) {
      inputRef.current?.focus()
      return
    }

    setIsSubmitting(true)
    try {
      await requestPasswordReset(email)
      setIsSubmitted(true)
    } catch {
      setServerError(
        'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-toast-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-md bg-[#0D0D11] border border-white/10 border-t-2 border-t-[#E10613] rounded-[20px] p-6 sm:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.8)] text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar modal"
          className="absolute top-5 right-5 p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#E10613]"
        >
          <X className="w-5 h-5" />
        </button>

        {isSubmitted ? (
          <div className="text-center py-4 space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#E10613]/10 border border-[#E10613]/30 text-[#E10613] mb-1">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h2 id="modal-title" className="text-xl sm:text-2xl font-extrabold text-white">
              E-mail enviado
            </h2>

            <p className="text-sm text-[#A0A0AA] leading-relaxed">
              Se o e-mail existir em nossa base, você receberá um link de redefinição em instantes.
            </p>

            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full h-[48px] bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#E10613]"
            >
              Entendido
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#E10613]/10 border border-[#E10613]/30 text-[#E10613]">
                <KeyRound className="w-5 h-5" />
              </div>
              <h2 id="modal-title" className="text-xl sm:text-2xl font-extrabold text-white">
                Recuperar acesso
              </h2>
            </div>

            <p className="text-sm text-[#A0A0AA] leading-relaxed mb-6">
              Informe o e-mail cadastrado e enviaremos um link para redefinir sua senha.
            </p>

            {serverError && (
              <div
                className="mb-4 p-3.5 rounded-xl bg-[#E10613]/10 border border-[#E10613]/40 text-sm text-[#FCA5A5] animate-error-shake"
                role="alert"
                aria-live="polite"
              >
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label
                  htmlFor="recovery-email"
                  className="block text-[13px] font-semibold text-white/90 mb-1.5"
                >
                  E-mail cadastrado
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                  <input
                    id="recovery-email"
                    ref={inputRef}
                    type="email"
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
                        : 'border-white/10 focus:border-[#E10613] focus:ring-4 focus:ring-[#E10613]/20'
                    }`}
                  />
                </div>
                {emailError && (
                  <p className="text-xs text-[#FCA5A5] mt-1.5 font-medium">{emailError}</p>
                )}
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 h-[48px] bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-medium text-sm rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-[48px] bg-[#E10613] hover:bg-[#C00510] active:bg-[#9A040C] text-white font-bold text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(225,6,19,0.3)] flex items-center justify-center gap-2 disabled:opacity-70 focus:outline-none focus:ring-4 focus:ring-[#E10613]/30"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <span>Enviar link</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
