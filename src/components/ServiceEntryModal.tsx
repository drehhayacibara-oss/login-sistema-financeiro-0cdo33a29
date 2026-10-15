import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { SERVICES_PJ, CATEGORIES_PJ, type ServicePJ } from '@/constants/categories'
import type {
  ServiceEntry,
  CreateServiceEntryDTO,
  PaymentMethodPJ,
} from '@/services/serviceEntries'
import { Calendar, DollarSign, FileText, Briefcase, CreditCard } from 'lucide-react'

interface ServiceEntryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entryToEdit?: ServiceEntry | null
  onSubmit: (data: CreateServiceEntryDTO) => Promise<void>
}

export function ServiceEntryModal({
  open,
  onOpenChange,
  entryToEdit,
  onSubmit,
}: ServiceEntryModalProps) {
  const isEditing = Boolean(entryToEdit)

  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [servico, setServico] = useState<ServicePJ>(SERVICES_PJ[0])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodPJ>(CATEGORIES_PJ.income[0])
  const [amountStr, setAmountStr] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset or fill when opening/editing
  useEffect(() => {
    if (open) {
      setError(null)
      if (entryToEdit) {
        setDate(
          entryToEdit.date ? entryToEdit.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
        )
        setServico(entryToEdit.servico)
        setPaymentMethod(entryToEdit.payment_method)
        setAmountStr(entryToEdit.amount.toFixed(2).replace('.', ','))
        setNotes(entryToEdit.notes || '')
      } else {
        setDate(new Date().toISOString().slice(0, 10))
        setServico(SERVICES_PJ[0])
        setPaymentMethod(CATEGORIES_PJ.income[0])
        setAmountStr('')
        setNotes('')
      }
    }
  }, [open, entryToEdit])

  const parseInputAmount = (val: string): number => {
    const clean = val.replace(/[R$\s.]/g, '').replace(',', '.')
    return parseFloat(clean)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!date) {
      setError('Por favor, informe a data do atendimento.')
      return
    }

    const parsedAmount = parseInputAmount(amountStr)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Informe um valor válido maior que zero (ex: 350,00).')
      return
    }

    try {
      setIsSubmitting(true)
      await onSubmit({
        date,
        servico,
        payment_method: paymentMethod,
        amount: parsedAmount,
        notes: notes.trim(),
      })
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar o lançamento de serviço.'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#0D0D11] border border-white/10 text-white p-6 sm:rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E10613]/10 text-[#E10613]">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white">
                {isEditing ? 'Editar Lançamento de Serviço' : 'Novo Lançamento de Serviço'}
              </DialogTitle>
              <DialogDescription className="text-xs text-white/50">
                Receita registrada na fonte (PJ) para alimentação da DRE e controle de caixa.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="rounded-xl border border-[#E10613]/40 bg-[#E10613]/10 p-3 text-xs text-[#FCA5A5]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Data */}
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#E10613]" />
              Data do Atendimento / Procedimento *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full rounded-xl border border-white/10 bg-[#08080B] px-3.5 py-2.5 text-sm text-white [color-scheme:dark] focus:border-[#E10613] focus:outline-none focus:ring-1 focus:ring-[#E10613]"
            />
          </div>

          {/* Serviço / Centro de Custo */}
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5 flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-[#E10613]" />
              Serviço / Centro de Custo (6 Oficiais) *
            </label>
            <select
              value={servico}
              onChange={(e) => setServico(e.target.value as ServicePJ)}
              className="w-full rounded-xl border border-white/10 bg-[#08080B] px-3.5 py-2.5 text-sm text-white focus:border-[#E10613] focus:outline-none focus:ring-1 focus:ring-[#E10613]"
            >
              {SERVICES_PJ.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Forma de Pagamento */}
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5 flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-[#E10613]" />
              Forma de Pagamento (Receita PJ) *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodPJ)}
              className="w-full rounded-xl border border-white/10 bg-[#08080B] px-3.5 py-2.5 text-sm text-white focus:border-[#E10613] focus:outline-none focus:ring-1 focus:ring-[#E10613]"
            >
              {CATEGORIES_PJ.income.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Valor */}
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-[#E10613]" />
              Valor Recebido (R$) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-white/40">
                R$
              </span>
              <input
                type="text"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0,00"
                required
                className="w-full rounded-xl border border-white/10 bg-[#08080B] pl-10 pr-3.5 py-2.5 font-mono text-sm text-white placeholder-white/20 focus:border-[#E10613] focus:outline-none focus:ring-1 focus:ring-[#E10613]"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-white/40" />
              Observação / Paciente / Detalhe (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Paciente Maria Silva, Recibo 124"
              className="w-full rounded-xl border border-white/10 bg-[#08080B] px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:border-[#E10613] focus:outline-none focus:ring-1 focus:ring-[#E10613]"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/[0.08] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-[#E10613] px-5 py-2.5 text-xs font-bold text-white shadow-[0_0_20px_rgba(225,6,19,0.3)] hover:bg-[#C00510] transition-colors disabled:opacity-50"
            >
              {isSubmitting
                ? 'Salvando...'
                : isEditing
                  ? 'Atualizar Lançamento'
                  : 'Salvar Lançamento'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
