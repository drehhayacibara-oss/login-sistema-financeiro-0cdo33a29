import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  Download,
  Info,
  Layers,
  ReceiptText,
  RefreshCw,
  Scale,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  type Transaction,
  fetchTransactions,
  formatBRL,
  formatDatePtBR,
} from '@/services/transactions'
import { type ServiceEntry, fetchServiceEntries } from '@/services/serviceEntries'
import { SERVICES_PJ, CATEGORIES_PJ } from '@/constants/categories'
import { useRealtime } from '@/hooks/use-realtime'

interface MethodComparisonRow {
  paymentMethod: string
  servicesAmount: number
  bankAmount: number
  difference: number
  status: 'matched' | 'bank_short' | 'bank_excess'
}

interface ServiceComparisonRow {
  servico: string
  servicesAmount: number
  bankAmount: number
  difference: number
}

export default function CashReconciliationPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [serviceEntries, setServiceEntries] = useState<ServiceEntry[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Filtros de período
  const [periodMode, setPeriodMode] = useState<'month' | 'year' | 'custom'>('month')
  const [selectedMonth, setSelectedMonth] = useState<string>(() =>
    new Date().toISOString().slice(0, 7),
  )
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear())

  // Auth protection
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

  const loadAllData = useCallback(async () => {
    try {
      setLoadingData(true)
      const [txs, entries] = await Promise.all([fetchTransactions(), fetchServiceEntries()])
      setTransactions(txs)
      setServiceEntries(entries)
    } catch (err) {
      console.error('Erro ao carregar dados para conferência:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os dados de movimentações e serviços.',
        className: 'border-l-4 border-l-[#E10613] bg-[#121216] text-white',
      })
    } finally {
      setLoadingData(false)
    }
  }, [toast])

  useEffect(() => {
    if (isAuthenticated) {
      loadAllData()
    }
  }, [isAuthenticated, loadAllData])

  useRealtime('service_entries', () => loadAllData(), isAuthenticated)
  useRealtime('transactions', () => loadAllData(), isAuthenticated)

  // Helper de filtragem de data
  const isInPeriod = (dateStr?: string) => {
    if (!dateStr) return false
    const clean = dateStr.slice(0, 10)
    if (periodMode === 'month') {
      return clean.startsWith(selectedMonth)
    } else if (periodMode === 'year') {
      return clean.startsWith(String(selectedYear))
    }
    return true
  }

  // Filtrar dados do período
  // 1. Serviços prestados (service_entries)
  const filteredServices = useMemo(() => {
    return serviceEntries.filter((e) => isInPeriod(e.date))
  }, [serviceEntries, selectedMonth, selectedYear, periodMode])

  // 2. Entradas efetivas no banco (transações PJ de RECEITA do fluxo de caixa)
  const filteredBankIncome = useMemo(() => {
    return transactions.filter(
      (t) => t.entity === 'pj' && t.type === 'income' && isInPeriod(t.date),
    )
  }, [transactions, selectedMonth, selectedYear, periodMode])

  // Totais consolidados
  const totalServices = useMemo(() => {
    return filteredServices.reduce((sum, e) => sum + e.amount, 0)
  }, [filteredServices])

  const totalBank = useMemo(() => {
    return filteredBankIncome.reduce((sum, t) => sum + t.amount, 0)
  }, [filteredBankIncome])

  const totalDifference = useMemo(() => {
    // Diferença = Banco - Serviços
    // Se for negativo: faltou dinheiro entrar no banco (banco menor que serviços)
    // Se for positivo: sobrou entrada no banco (ou falta lançamento de serviço)
    return totalBank - totalServices
  }, [totalBank, totalServices])

  // Comparação por Forma de Pagamento
  const methodComparisons = useMemo<MethodComparisonRow[]>(() => {
    const servicesByMethod: Record<string, number> = {}
    for (const m of CATEGORIES_PJ.income) servicesByMethod[m] = 0
    for (const e of filteredServices) {
      servicesByMethod[e.payment_method] = (servicesByMethod[e.payment_method] || 0) + e.amount
    }

    const bankByMethod: Record<string, number> = {}
    for (const m of CATEGORIES_PJ.income) bankByMethod[m] = 0
    for (const t of filteredBankIncome) {
      const cat = (t.category || '').trim()
      // Tentar casar com uma das formas oficiais
      const match = CATEGORIES_PJ.income.find((m) => m.toUpperCase() === cat.toUpperCase())
      const key = match || cat || 'Outras Receitas'
      bankByMethod[key] = (bankByMethod[key] || 0) + t.amount
    }

    const allMethods = Array.from(new Set([...CATEGORIES_PJ.income, ...Object.keys(bankByMethod)]))

    return allMethods
      .map((method) => {
        const sAmt = servicesByMethod[method] || 0
        const bAmt = bankByMethod[method] || 0
        const diff = bAmt - sAmt
        let status: 'matched' | 'bank_short' | 'bank_excess' = 'matched'
        if (Math.abs(diff) < 0.01) {
          status = 'matched'
        } else if (diff < 0) {
          status = 'bank_short' // Falta entrar no banco
        } else {
          status = 'bank_excess' // Banco maior que serviço
        }
        return {
          paymentMethod: method,
          servicesAmount: sAmt,
          bankAmount: bAmt,
          difference: diff,
          status,
        }
      })
      .filter((r) => r.servicesAmount > 0 || r.bankAmount > 0)
      .sort((a, b) => b.servicesAmount - a.servicesAmount)
  }, [filteredServices, filteredBankIncome])

  // Comparação por Serviço / Centro de Custo
  const serviceComparisons = useMemo<ServiceComparisonRow[]>(() => {
    const sMap: Record<string, number> = {}
    for (const s of SERVICES_PJ) sMap[s] = 0
    for (const e of filteredServices) {
      sMap[e.servico] = (sMap[e.servico] || 0) + e.amount
    }

    const bMap: Record<string, number> = {}
    for (const s of SERVICES_PJ) bMap[s] = 0
    for (const t of filteredBankIncome) {
      const srv = (t.servico || 'Sem serviço').trim()
      bMap[srv] = (bMap[srv] || 0) + t.amount
    }

    return SERVICES_PJ.map((servico) => {
      const sAmt = sMap[servico] || 0
      const bAmt = bMap[servico] || 0
      return {
        servico,
        servicesAmount: sAmt,
        bankAmount: bAmt,
        difference: bAmt - sAmt,
      }
    })
  }, [filteredServices, filteredBankIncome])

  // Exportação CSV do relatório de conferência
  const handleExportCSV = () => {
    try {
      const rows: string[][] = []
      rows.push(['CONFERÊNCIA DE CAIXA - RUBRA'])
      rows.push([`Período: ${periodMode === 'month' ? selectedMonth : selectedYear}`])
      rows.push([])
      rows.push(['TOTAIS CONSOLIDADOS'])
      rows.push([
        'Receita Lançada em Serviços (R$)',
        'Entradas Efetivas no Banco (R$)',
        'Diferença (R$)',
      ])
      rows.push([
        `"${totalServices.toFixed(2).replace('.', ',')}"`,
        `"${totalBank.toFixed(2).replace('.', ',')}"`,
        `"${totalDifference.toFixed(2).replace('.', ',')}"`,
      ])
      rows.push([])
      rows.push(['QUEBRA POR FORMA DE PAGAMENTO'])
      rows.push([
        'Forma de Pagamento',
        'Lançado em Serviços (R$)',
        'Recebido no Banco (R$)',
        'Diferença (R$)',
        'Diagnóstico',
      ])
      methodComparisons.forEach((m) => {
        const diag =
          m.status === 'matched'
            ? 'Conciliado'
            : m.status === 'bank_short'
              ? 'Faltou depositar / entrar no banco'
              : 'Sobrou no banco / falta lançamento'
        rows.push([
          `"${m.paymentMethod}"`,
          `"${m.servicesAmount.toFixed(2).replace('.', ',')}"`,
          `"${m.bankAmount.toFixed(2).replace('.', ',')}"`,
          `"${m.difference.toFixed(2).replace('.', ',')}"`,
          `"${diag}"`,
        ])
      })

      const csvContent = '\uFEFF' + rows.map((r) => r.join(';')).join('\r\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute(
        'download',
        `Conferencia_Caixa_Rubra_${new Date().toISOString().slice(0, 10)}.csv`,
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: 'Exportação concluída!',
        description: 'Planilha de conferência de caixa baixada com sucesso.',
        className: 'border-l-4 border-l-emerald-500 bg-[#121216] text-white',
      })
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível gerar a planilha CSV.',
        className: 'border-l-4 border-l-[#E10613] bg-[#121216] text-white',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#08080B] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E10613]/10 text-[#E10613]">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
          <span className="text-sm text-white/45">Carregando conferência de caixa...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) return null

  return (
    <div className="min-h-screen w-full bg-[#08080B] text-white flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#08080B]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1560px] items-center justify-between gap-4 px-5 sm:px-8 xl:px-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/[0.08] hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Voltar ao Painel</span>
            </button>
            <div className="border-l border-white/10 pl-3">
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
                  <Scale className="h-5 w-5 text-[#E10613]" />
                  Conferência de Caixa
                </span>
                <span className="rounded-md border border-[#E10613]/40 bg-[#E10613]/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#FCA5A5]">
                  PJ Exclusivo
                </span>
              </div>
              <p className="text-[11px] text-white/40 hidden sm:block">
                Comparativo: Receita Lançada por Serviço vs. Entradas Efetivas no Banco (Fluxo PJ)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-bold text-white transition-all hover:border-[#E10613]/50 hover:bg-[#E10613]/10"
            >
              <Download className="h-4 w-4 text-[#E10613]" />
              <span className="hidden sm:inline">Exportar</span> CSV
            </button>

            <button
              type="button"
              onClick={() => navigate('/servicos')}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E10613]/40 bg-[#E10613]/10 px-4 py-2 text-xs font-bold text-white hover:bg-[#E10613]/20 transition-colors"
            >
              <Briefcase className="h-4 w-4 text-[#E10613]" />
              <span>Ver Serviços</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[1560px] w-full flex-1 px-5 py-6 sm:px-8 sm:py-8 xl:px-10 space-y-6">
        {/* Banner de Objetivo do Usuário */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-white/80">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-white">Objetivo da Conferência de Caixa</p>
              <p className="text-[11px] text-white/50 leading-relaxed">
                Detectar rapidamente <strong>dinheiro que faltou depositar</strong> ou{' '}
                <strong>lançamento esquecido</strong>. Compara lado a lado o que a funcionária
                registrou na ponta (serviços) com o que efetivamente transitou no banco.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] text-emerald-400 shrink-0 self-start sm:self-auto">
            <span>{filteredServices.length} serviços</span>
            <span>•</span>
            <span>{filteredBankIncome.length} entradas no banco</span>
          </div>
        </div>

        {/* Barra de Filtro de Período */}
        <section className="rounded-2xl border border-white/[0.08] bg-[#0D0D11] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-[#E10613]">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                Período de Comparação
              </p>
              <h2 className="text-base font-extrabold text-white">
                {periodMode === 'month' ? `Mês ${selectedMonth}` : `Ano ${selectedYear}`}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-xl border border-white/10 bg-[#08080B] p-1 text-xs">
              <button
                type="button"
                onClick={() => setPeriodMode('month')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  periodMode === 'month'
                    ? 'bg-[#E10613] text-white shadow-sm'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                Mês a Mês
              </button>
              <button
                type="button"
                onClick={() => setPeriodMode('year')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  periodMode === 'year'
                    ? 'bg-[#E10613] text-white shadow-sm'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                Ano Completo
              </button>
            </div>

            {periodMode === 'month' ? (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="h-9 rounded-xl border border-white/10 bg-[#08080B] px-3 text-xs text-white [color-scheme:dark] focus:ring-2 focus:ring-[#E10613]"
              />
            ) : (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="h-9 rounded-xl border border-white/10 bg-[#08080B] px-3 text-xs text-white focus:ring-2 focus:ring-[#E10613]"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    Ano {y}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={loadAllData}
              disabled={loadingData}
              title="Recarregar dados"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              <RefreshCw
                className={`h-4 w-4 ${loadingData ? 'animate-spin text-[#E10613]' : ''}`}
              />
            </button>
          </div>
        </section>

        {/* 3 Cards de Totais Lado a Lado + Diferença Destacada */}
        <section className="grid gap-4 sm:grid-cols-3">
          {/* Lado 1: Serviços Lançados */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0D0D11] p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                1. Serviços Lançados (Na Fonte)
              </p>
              <Briefcase className="h-4 w-4 text-[#E10613]" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-white font-mono">
              {formatBRL(totalServices)}
            </p>
            <p className="mt-1 text-xs text-white/40">
              {filteredServices.length} atendimento(s) registrado(s)
            </p>
          </div>

          {/* Lado 2: Entradas no Banco */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0D0D11] p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">
                2. Entradas no Banco (Fluxo PJ)
              </p>
              <Building2 className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-emerald-400 font-mono">
              {formatBRL(totalBank)}
            </p>
            <p className="mt-1 text-xs text-white/40">
              {filteredBankIncome.length} entrada(s) bancária(s) no período
            </p>
          </div>

          {/* Lado 3: Diferença Destacada */}
          <div
            className={`rounded-2xl border p-5 ${
              Math.abs(totalDifference) < 0.01
                ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
                : totalDifference < 0
                  ? 'border-[#E10613]/50 bg-[#E10613]/10 shadow-[0_0_20px_rgba(225,6,19,0.15)]'
                  : 'border-amber-500/30 bg-amber-500/[0.06]'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                3. Diferença (Banco - Serviços)
              </p>
              {Math.abs(totalDifference) < 0.01 ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <AlertCircle
                  className={`h-4 w-4 ${totalDifference < 0 ? 'text-[#E10613]' : 'text-amber-400'}`}
                />
              )}
            </div>
            <p
              className={`mt-2 text-2xl font-extrabold font-mono ${
                Math.abs(totalDifference) < 0.01
                  ? 'text-emerald-400'
                  : totalDifference < 0
                    ? 'text-[#FCA5A5]'
                    : 'text-amber-300'
              }`}
            >
              {totalDifference > 0 ? '+' : ''}
              {formatBRL(totalDifference)}
            </p>
            <p className="mt-1 text-xs text-white/50">
              {Math.abs(totalDifference) < 0.01
                ? 'Valores perfeitamente conciliados'
                : totalDifference < 0
                  ? 'Atenção: faltou depositar / entrar no banco'
                  : 'Atenção: banco maior que lançamentos'}
            </p>
          </div>
        </section>

        {/* Tabela de Comparação por Forma de Pagamento */}
        <section className="rounded-2xl border border-white/[0.08] bg-[#0D0D11] p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#E10613]" />
                Conferência por Forma de Pagamento
              </h3>
              <p className="text-xs text-white/40">
                Ex.: Pix lançado vs. Pix recebido no banco. Detecta canal a canal onde está o
                descompasso.
              </p>
            </div>
            <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-white/40 self-start sm:self-auto">
              {methodComparisons.length} forma(s) com movimentação
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-[#08080B]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.08] bg-white/[0.02] text-[10px] font-bold uppercase tracking-wider text-white/40">
                <tr>
                  <th className="py-3 px-4">Forma de Pagamento</th>
                  <th className="py-3 px-4 text-right">Lançado em Serviços (A)</th>
                  <th className="py-3 px-4 text-right">Recebido no Banco (B)</th>
                  <th className="py-3 px-4 text-right">Diferença (B - A)</th>
                  <th className="py-3 px-4 text-center">Diagnóstico / Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {methodComparisons.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-white/40">
                      Nenhuma movimentação de receita no período selecionado.
                    </td>
                  </tr>
                ) : (
                  methodComparisons.map((row) => (
                    <tr key={row.paymentMethod} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">
                        <span className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              row.status === 'matched'
                                ? 'bg-emerald-400'
                                : row.status === 'bank_short'
                                  ? 'bg-[#E10613]'
                                  : 'bg-amber-400'
                            }`}
                          />
                          {row.paymentMethod}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-white/80">
                        {formatBRL(row.servicesAmount)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-emerald-400">
                        {formatBRL(row.bankAmount)}
                      </td>

                      <td
                        className={`py-3 px-4 text-right font-mono font-bold ${
                          row.status === 'matched'
                            ? 'text-emerald-400'
                            : row.status === 'bank_short'
                              ? 'text-[#FCA5A5]'
                              : 'text-amber-300'
                        }`}
                      >
                        {row.difference > 0 ? '+' : ''}
                        {formatBRL(row.difference)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {row.status === 'matched' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" />
                            Conciliado
                          </span>
                        ) : row.status === 'bank_short' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#E10613]/15 border border-[#E10613]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#FCA5A5]">
                            <TrendingDown className="h-3 w-3" />
                            Faltou depositar / entrar no banco
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                            <TrendingUp className="h-3 w-3" />
                            Sobrou no banco / falta lançar serviço
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {methodComparisons.length > 0 && (
                <tfoot className="border-t border-white/[0.08] bg-white/[0.02] text-xs font-bold text-white">
                  <tr>
                    <td className="py-3 px-4 uppercase tracking-wider text-white/60">Totais</td>
                    <td className="py-3 px-4 text-right font-mono text-white">
                      {formatBRL(totalServices)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400">
                      {formatBRL(totalBank)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono font-bold ${
                        Math.abs(totalDifference) < 0.01
                          ? 'text-emerald-400'
                          : totalDifference < 0
                            ? 'text-[#FCA5A5]'
                            : 'text-amber-300'
                      }`}
                    >
                      {totalDifference > 0 ? '+' : ''}
                      {formatBRL(totalDifference)}
                    </td>
                    <td className="py-3 px-4 text-center text-[10px] text-white/40">
                      {Math.abs(totalDifference) < 0.01
                        ? '100% Ok'
                        : `Diferença de ${formatBRL(Math.abs(totalDifference))}`}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>

        {/* Quebra por Serviço (6 Serviços Fixos) */}
        <section className="rounded-2xl border border-white/[0.08] bg-[#0D0D11] p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-[#E10613]" />
                Comparativo por Serviço / Centro de Custo
              </h3>
              <p className="text-xs text-white/40">
                Receita registrada nos serviços vs. receita alocada com esse mesmo serviço no
                extrato
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              6 Serviços PJ
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {serviceComparisons.map((row) => (
              <div
                key={row.servico}
                className="rounded-xl border border-white/5 bg-[#08080B] p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white truncate">{row.servico}</span>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      Math.abs(row.difference) < 0.01
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-white/5 text-white/60'
                    }`}
                  >
                    Dif: {formatBRL(row.difference)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-white/5">
                  <div>
                    <span className="text-white/40 block">Lançado:</span>
                    <span className="font-mono text-white/80 font-semibold">
                      {formatBRL(row.servicesAmount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40 block">Banco:</span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {formatBRL(row.bankAmount)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
