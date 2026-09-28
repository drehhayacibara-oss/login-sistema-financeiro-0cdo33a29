import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Check,
  DollarSign,
  Loader2,
  Tag,
  Type,
} from 'lucide-react'
import type { CreateTransactionDTO, TransactionType } from '@/services/transactions'

interface NewTransactionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateTransactionDTO) => Promise<void>
}

const COMMON_CATEGORIES = {
  income: [
    'Serviços',
    'Honorários',
    'Vendas',
    'Consultoria',
    'Investimentos',
    'Reembolso',
    'Outras receitas',
  ],
  expense: [
    'Custo dos Serviços Prestados (competência)',
    'Pagamento de Fornecedores (referência)',
    'Impostos sobre SERVIÇOS - ISS',
    'Impostos Federais (DARFs)',
    'Comissão dos cartões',
    'Comissão médicos terceiros DR. WANDERSON',
    'Comissão médicos terceiros',
    'Associação Comercial/crm/outros orgaos',
    'Correio/papelaria/grafica',
    'Higiene/limpeza/cozinha/copa',
    'Salários',
    '13 Salario',
    'Encargos Trabalhistas',
    'Encargos 13 Salario Provisionado',
    'Aluguel',
    'Iptu',
    'Prolabore',
    'Energia',
    'Telefone e internet',
    'Água',
    'Manutenção',
    'Aluguel consultorio Guaira',
    'Sistema de Informatica',
    'Contador',
    'Curso e Especializações',
    'Consultoria/Marketing',
    'Seguro',
    'Outros Fixos',
    'Outros Variaveis',
    'Financiamentos',
    'Empréstimos',
    'Juros / Antecipação',
    'Bens',
  ],
}

export const NewTransactionModal: React.FC<NewTransactionModalProps> = ({
  open,
  onOpenChange,
  onSubmit,
}) => {
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [category, setCategory] = useState<string>('')
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setType('expense')
    setAmount('')
    setDescription('')
    setCategory('')
    setDate(new Date().toISOString().slice(0, 10))
    setError(null)
  }

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm()
    }
    onOpenChange(newOpen)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Normalize amount: support comma and point like 150,50 or 150.50
    const cleanAmountStr = amount.replace(/\s/g, '').replace(',', '.')
    const numericAmount = parseFloat(cleanAmountStr)

    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Por favor, informe um valor numérico válido maior que zero.')
      return
    }

    if (!description.trim()) {
      setError('Informe uma descrição para o lançamento.')
      return
    }

    if (!category.trim()) {
      setError('Informe ou selecione uma categoria.')
      return
    }

    if (!date) {
      setError('Selecione uma data para o lançamento.')
      return
    }

    try {
      setIsSubmitting(true)
      await onSubmit({
        type,
        amount: Math.round(numericAmount * 100) / 100,
        description: description.trim(),
        category: category.trim(),
        date,
      })
      resetForm()
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar transação.'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg border border-white/10 bg-[#0D0D11] text-white shadow-2xl sm:rounded-2xl p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E10613]/15 text-[#E10613]">
              <DollarSign className="h-4 w-4" />
            </span>
            Nova Transação
          </DialogTitle>
          <DialogDescription className="text-xs text-white/50">
            Adicione uma entrada ou saída no seu controle financeiro do Rubra.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-xl border border-[#E10613]/30 bg-[#E10613]/10 p-3 text-xs text-[#FCA5A5] animate-error-shake">
              {error}
            </div>
          )}

          {/* Tipo de Transação */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-2 block">
              Tipo de lançamento
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setType('income')
                  if (!COMMON_CATEGORIES.income.includes(category)) {
                    setCategory('')
                  }
                }}
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-bold transition-all ${
                  type === 'income'
                    ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20 hover:text-white'
                }`}
              >
                <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                Receita (Entrada)
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('expense')
                  if (!COMMON_CATEGORIES.expense.includes(category)) {
                    setCategory('')
                  }
                }}
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-bold transition-all ${
                  type === 'expense'
                    ? 'border-[#E10613]/50 bg-[#E10613]/15 text-[#FCA5A5] shadow-[0_0_15px_rgba(225,6,19,0.2)]'
                    : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20 hover:text-white'
                }`}
              >
                <ArrowDownRight className="h-4 w-4 text-[#E10613]" />
                Despesa (Saída)
              </button>
            </div>
          </div>

          {/* Valor */}
          <div>
            <Label htmlFor="tx-amount" className="text-xs font-semibold text-white/70">
              Valor (R$)
            </Label>
            <div className="relative mt-1.5">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-white/40">
                R$
              </span>
              <Input
                id="tx-amount"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="h-11 rounded-xl border-white/10 bg-[#08080B] pl-11 text-base font-bold text-white placeholder:text-white/20 focus-visible:ring-[#E10613]"
              />
            </div>
            <p className="mt-1 text-[11px] text-white/40">Exemplo: 250,00 ou 1500</p>
          </div>

          {/* Descrição */}
          <div>
            <Label htmlFor="tx-desc" className="text-xs font-semibold text-white/70">
              Descrição
            </Label>
            <div className="relative mt-1.5">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
                <Type className="h-4 w-4" />
              </span>
              <Input
                id="tx-desc"
                type="text"
                placeholder="Ex: Consultoria de Marketing, Aluguel..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                maxLength={120}
                className="h-11 rounded-xl border-white/10 bg-[#08080B] pl-10 text-sm text-white placeholder:text-white/20 focus-visible:ring-[#E10613]"
              />
            </div>
          </div>

          {/* Categoria */}
          <div>
            <Label htmlFor="tx-category" className="text-xs font-semibold text-white/70">
              Categoria
            </Label>
            <div className="relative mt-1.5">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
                <Tag className="h-4 w-4" />
              </span>
              <Input
                id="tx-category"
                type="text"
                placeholder="Digite ou escolha abaixo"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                maxLength={50}
                className="h-11 rounded-xl border-white/10 bg-[#08080B] pl-10 text-sm text-white placeholder:text-white/20 focus-visible:ring-[#E10613]"
              />
            </div>

            {/* Sugestões rápidas de categoria */}
            <div className="mt-2">
              <span className="text-[11px] text-white/40 block mb-1.5">
                Sugestões de categorias:
              </span>
              <div className="max-h-36 overflow-y-auto pr-1 flex flex-wrap gap-1.5 custom-scrollbar">
                {COMMON_CATEGORIES[type].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] transition-colors text-left ${
                      category === cat
                        ? 'border-[#E10613]/60 bg-[#E10613]/25 font-bold text-white shadow-[0_0_10px_rgba(225,6,19,0.2)]'
                        : 'border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.08] hover:text-white hover:border-white/20'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Data */}
          <div>
            <Label htmlFor="tx-date" className="text-xs font-semibold text-white/70">
              Data do lançamento
            </Label>
            <div className="relative mt-1.5">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
                <Calendar className="h-4 w-4" />
              </span>
              <Input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="h-11 rounded-xl border-white/10 bg-[#08080B] pl-10 text-sm text-white focus-visible:ring-[#E10613] [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleClose(false)}
              className="rounded-xl border-white/10 bg-white/[0.02] text-sm font-semibold text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-[#E10613] px-5 text-sm font-bold text-white shadow-[0_0_20px_rgba(225,6,19,0.3)] hover:bg-[#C00510] focus:ring-4 focus:ring-[#E10613]/30"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Confirmar lançamento
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
