import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  ChevronDown,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import { type UserRole, useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  type CreateTransactionDTO,
  type Transaction,
  createTransaction,
  fetchTransactions,
  formatBRL,
} from '@/services/transactions'
import {
  type DRECategoryRow,
  type DREResult,
  calculateDRE,
  exportDREToCSV,
} from '@/services/dreMapper'
import { SERVICES_PJ } from '@/constants/categories'
import { NewTransactionModal } from '@/components/NewTransactionModal'
import { ImportStatementModal } from '@/components/ImportStatementModal'

interface DRERowItemProps {
  row: DRECategoryRow
  isExpense?: boolean
  indent?: boolean
}

const DRERowItem: React.FC<DRERowItemProps> = ({ row, isExpense = false, indent = false }) => {
  const [expanded, setExpanded] = useState(false)
  const hasServiceBreakdown = Object.values(row.byService).some((v) => v > 0)

  return (
    <div className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition-colors">
      <div
        className={`flex items-center justify-between py-2.5 px-4 text-xs ${indent ? 'pl-8' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {hasServiceBreakdown ? (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              aria-label={expanded ? 'Recolher quebra por serviço' : 'Expandir quebra por serviço'}
              className="rounded p-0.5 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-white/60" />
              )}
            </button>
          ) : (
            <span className="w-4 inline-block" />
          )}
          <span className="truncate text-white/80 font-medium">{row.category}</span>
          {row.count > 1 && (
            <span className="rounded-full bg-white/5 px-1.5 py-0.2 text-[10px] text-white/35 font-mono">
              {row.count}x
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
          <span className={isExpense ? 'text-[#FCA5A5]' : 'text-emerald-400'}>
            {isExpense ? `(${formatBRL(row.total)})` : formatBRL(row.total)}
          </span>
        </div>
      </div>

      {/* Quebra por serviço expansível */}
      {expanded && (
        <div className="bg-[#08080B]/90 border-t border-b border-white/[0.06] py-2 px-6 sm:px-12 text-[11px] space-y-1 animate-in fade-in-50 duration-150">
          <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider mb-1 flex items-center gap-1.5">
            <Briefcase className="h-3 w-3 text-[#E10613]" />
            Quebra por Serviço / Centro de Custo:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
            {SERVICES_PJ.map((srv) => {
              const val = row.byService[srv] || 0
              if (val === 0) return null
              return (
                <div
                  key={srv}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5"
                >
                  <span className="truncate text-white/60 font-semibold">{srv}</span>
                  <span
                    className={`font-mono font-bold ${isExpense ? 'text-[#FCA5A5]' : 'text-emerald-400'}`}
                  >
                    {isExpense ? `(${formatBRL(val)})` : formatBRL(val)}
                  </span>
                </div>
              )
            })}
            {(row.byService['Sem serviço'] || 0) > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-dashed border-white/10 bg-white/[0.01] px-2.5 py-1.5">
                <span className="truncate text-white/40 italic">Sem serviço / Geral</span>
                <span
                  className={`font-mono font-bold ${isExpense ? 'text-[#FCA5A5]/80' : 'text-emerald-400/80'}`}
                >
                  {isExpense
                    ? `(${formatBRL(row.byService['Sem serviço'])})`
                    : formatBRL(row.byService['Sem serviço'])}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function DREPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  // Período da DRE: padrão mês atual
  const [periodMode, setPeriodMode] = useState<'month' | 'year'>('month')
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

  // Load transactions
  const loadTransactions = useCallback(async () => {
    try {
      setLoadingData(true)
      const data = await fetchTransactions()
      setTransactions(data)
    } catch (err) {
      console.error('Erro ao carregar transações para DRE:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar as movimentações do banco.',
        className: 'border-l-4 border-l-[#E10613] bg-[#121216] text-white',
      })
    } finally {
      setLoadingData(false)
    }
  }, [toast])

  useEffect(() => {
    if (isAuthenticated) {
      loadTransactions()
    }
  }, [isAuthenticated, loadTransactions])

  // Calcular DRE (puramente PJ)
  const dre = useMemo<DREResult>(() => {
    return calculateDRE(transactions, {
      mode: periodMode,
      monthKey: selectedMonth,
      year: selectedYear,
    })
  }, [transactions, periodMode, selectedMonth, selectedYear])

  const handleCreateTransaction = async (dto: CreateTransactionDTO) => {
    const newTx = await createTransaction(dto)
    setTransactions((prev) => [newTx, ...prev])
    toast({
      title: 'Transação cadastrada!',
      description: `${dto.type === 'income' ? 'Receita' : 'Despesa'} de ${formatBRL(dto.amount)} salva com sucesso.`,
      className: 'border-l-4 border-l-emerald-500 bg-[#121216] text-white',
    })
  }

  const handleExportCSV = () => {
    try {
      exportDREToCSV(dre)
      toast({
        title: 'Exportação concluída!',
        description: `Arquivo CSV da DRE (${dre.periodLabel}) baixado com sucesso.`,
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
          <span className="text-sm text-white/45">Carregando DRE...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) return null

  return (
    <div className="min-h-screen w-full bg-[#08080B] text-white flex flex-col">
      {/* Modais */}
      <NewTransactionModal
        open={isNewTxModalOpen}
        onOpenChange={setIsNewTxModalOpen}
        onSubmit={handleCreateTransaction}
      />
      <ImportStatementModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        existingTransactions={transactions}
        onImportComplete={() => loadTransactions()}
        createTransactionFn={createTransaction}
      />

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
                  <BarChart3 className="h-5 w-5 text-[#E10613]" />
                  Relatório DRE
                </span>
                <span className="rounded-md border border-[#E10613]/40 bg-[#E10613]/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#FCA5A5]">
                  PJ Exclusivo
                </span>
              </div>
              <p className="text-[11px] text-white/40 hidden sm:block">
                Demonstração do Resultado do Exercício com apuração por serviço
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={dre.totalTransactionsPJ === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-bold text-white transition-all hover:border-[#E10613]/50 hover:bg-[#E10613]/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4 text-[#E10613]" />
              <span className="hidden sm:inline">Exportar</span> CSV
            </button>

            <button
              type="button"
              onClick={() => setIsNewTxModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#E10613] px-4 py-2 text-xs font-bold text-white shadow-[0_0_20px_rgba(225,6,19,0.3)] hover:bg-[#C00510]"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nova Transação</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[1560px] w-full flex-1 px-5 py-6 sm:px-8 sm:py-8 xl:px-10 space-y-6">
        {/* Banner de Regra de Negócio: Exclusividade PJ */}
        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.06] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-sky-200">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-white">Relatório DRE Pessoa Jurídica (PJ)</p>
              <p className="text-[11px] text-sky-200/70 leading-relaxed">
                Conforme a regra contábil do Rubra, a DRE apura <strong>exclusivamente</strong>{' '}
                movimentações da PJ. Lançamentos de Pessoa Física são rigorosamente desconsiderados.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-sky-300/80 shrink-0 self-end sm:self-auto">
            <span>{dre.totalTransactionsPJ} lançamento(s) PJ no período</span>
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
                Período de Apuração
              </p>
              <h2 className="text-base font-extrabold text-white">{dre.periodLabel}</h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Toggle Mês / Ano Completo */}
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

            {/* Inputs de Período */}
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
              onClick={loadTransactions}
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

        {/* 4 Cards de Destaque Contábil */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* Receita Bruta */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0D0D11] p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              1. Receita Bruta PJ
            </p>
            <p className="mt-2 text-2xl font-extrabold text-white">{formatBRL(dre.receitaBruta)}</p>
            <p className="mt-1 text-xs text-white/40">Entradas operacionais do período</p>
          </div>

          {/* Receita Líquida */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0D0D11] p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/70">
              3. Receita Líquida
            </p>
            <p className="mt-2 text-2xl font-extrabold text-emerald-400">
              {formatBRL(dre.receitaLiquida)}
            </p>
            <p className="mt-1 text-xs text-white/40">
              Menos deduções e ISS ({formatBRL(dre.deducoesReceita)})
            </p>
          </div>

          {/* Lucro Bruto */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0D0D11] p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              5. Lucro Bruto (Margem CSP)
            </p>
            <p
              className={`mt-2 text-2xl font-extrabold ${dre.lucroBruto >= 0 ? 'text-white' : 'text-[#E10613]'}`}
            >
              {formatBRL(dre.lucroBruto)}
            </p>
            <p className="mt-1 text-xs text-white/40">
              Custos diretos: -{formatBRL(dre.custosServicos)}
            </p>
          </div>

          {/* Lucro Líquido Final */}
          <div
            className={`rounded-2xl border p-5 ${
              dre.lucroLiquido >= 0
                ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
                : 'border-[#E10613]/40 bg-[#E10613]/10'
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">
              9. Lucro Líquido do Período
            </p>
            <p
              className={`mt-2 text-2xl font-extrabold tracking-tight ${
                dre.lucroLiquido >= 0 ? 'text-emerald-400' : 'text-[#E10613]'
              }`}
            >
              {dre.lucroLiquido >= 0 ? '+' : ''}
              {formatBRL(dre.lucroLiquido)}
            </p>
            <p className="mt-1 text-xs text-white/50">
              Margem líquida:{' '}
              {dre.receitaBruta > 0 ? ((dre.lucroLiquido / dre.receitaBruta) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </section>

        {/* Resumo por Serviço (Mini-tabela de Centros de Custo) */}
        <section className="rounded-2xl border border-white/[0.08] bg-[#0D0D11] p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-[#E10613]/10 p-2 text-[#E10613]">
                <Briefcase className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Resultado por Serviço / Centro de Custo
                </h3>
                <p className="text-xs text-white/40">
                  Apuração de receitas, custos/despesas e margem para cada um dos 6 serviços fixos
                </p>
              </div>
            </div>
            <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-white/40 self-start sm:self-auto">
              6 Serviços Oficiais + Geral
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-[#08080B]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.08] bg-white/[0.02] text-[10px] font-bold uppercase tracking-wider text-white/40">
                <tr>
                  <th className="py-3 px-4">Serviço / Centro de Custo</th>
                  <th className="py-3 px-4 text-right">Receitas</th>
                  <th className="py-3 px-4 text-right">Custos & Despesas</th>
                  <th className="py-3 px-4 text-right">Resultado</th>
                  <th className="py-3 px-4 text-right">Margem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {dre.serviceSummaries.map((s) => {
                  const hasMovements = s.receita > 0 || s.custosDespesas > 0
                  return (
                    <tr
                      key={s.serviceName}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        !hasMovements ? 'opacity-40' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 font-semibold text-white">
                        <span className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#E10613]" />
                          {s.serviceName}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-emerald-400">
                        {formatBRL(s.receita)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-[#FCA5A5]">
                        ({formatBRL(s.custosDespesas)})
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-mono font-bold ${
                          s.resultado >= 0 ? 'text-emerald-400' : 'text-[#E10613]'
                        }`}
                      >
                        {s.resultado >= 0 ? '+' : ''}
                        {formatBRL(s.resultado)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-white/70">
                        {s.receita > 0 ? `${s.margem.toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Tabela Contábil DRE Completa */}
        <section className="rounded-2xl border border-white/[0.08] bg-[#0D0D11] overflow-hidden">
          {/* Header da Tabela */}
          <div className="border-b border-white/[0.08] p-5 sm:p-6 bg-[#08080B]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-[#E10613]" />
                Demonstrativo Contábil Detalhado
              </h3>
              <p className="text-xs text-white/40 mt-0.5">
                Clique na seta das categorias para visualizar a quebra por serviço
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/50 font-mono">
              <span>Valores em R$ (BRL)</span>
            </div>
          </div>

          {dre.totalTransactionsPJ === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-white/30 mb-3">
                <Info className="h-6 w-6" />
              </div>
              <p className="text-base font-bold text-white">Nenhum lançamento PJ neste período</p>
              <p className="text-xs text-white/40 max-w-md mt-1 leading-relaxed">
                Não há registros com contexto PJ cadastrados para {dre.periodLabel}. Você pode criar
                uma nova transação ou importar um extrato bancário.
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewTxModalOpen(true)}
                  className="rounded-xl bg-[#E10613] px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-[#C00510]"
                >
                  Criar lançamento PJ
                </button>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-bold text-white hover:bg-white/[0.08]"
                >
                  Importar Extrato
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {/* 1. RECEITA BRUTA */}
              <div className="bg-white/[0.01]">
                <div className="flex items-center justify-between py-3 px-4 sm:px-6 bg-[#08080B]/80 font-bold text-xs sm:text-sm text-white border-b border-white/[0.06]">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    1. RECEITA BRUTA
                  </span>
                  <span className="font-mono text-emerald-400">{formatBRL(dre.receitaBruta)}</span>
                </div>
                {dre.receitaBrutaRows.length > 0 ? (
                  dre.receitaBrutaRows.map((row) => (
                    <DRERowItem key={row.category} row={row} isExpense={false} indent />
                  ))
                ) : (
                  <p className="py-2 px-8 text-xs text-white/30 italic">Sem receitas no período</p>
                )}
              </div>

              {/* 2. DEDUÇÕES DE RECEITA */}
              <div className="bg-white/[0.01]">
                <div className="flex items-center justify-between py-3 px-4 sm:px-6 bg-[#08080B]/80 font-bold text-xs sm:text-sm text-white border-b border-white/[0.06]">
                  <span className="flex items-center gap-2 text-white/90">
                    <span className="h-2 w-2 rounded-full bg-[#E10613]" />
                    2. (–) DEDUÇÕES DE RECEITA (ISS & IMPOSTOS SOBRE SERVIÇOS)
                  </span>
                  <span className="font-mono text-[#FCA5A5]">
                    ({formatBRL(dre.deducoesReceita)})
                  </span>
                </div>
                {dre.deducoesRows.length > 0 ? (
                  dre.deducoesRows.map((row) => (
                    <DRERowItem key={row.category} row={row} isExpense={true} indent />
                  ))
                ) : (
                  <p className="py-2 px-8 text-xs text-white/30 italic">Nenhuma dedução aplicada</p>
                )}
              </div>

              {/* 3. RECEITA LÍQUIDA (SUBTOTAL) */}
              <div className="flex items-center justify-between py-3.5 px-4 sm:px-6 bg-white/[0.04] font-extrabold text-xs sm:text-sm text-white">
                <span>= 3. RECEITA LÍQUIDA OPERACIONAL</span>
                <span className="font-mono text-emerald-400">{formatBRL(dre.receitaLiquida)}</span>
              </div>

              {/* 4. CUSTOS DOS SERVIÇOS */}
              <div className="bg-white/[0.01]">
                <div className="flex items-center justify-between py-3 px-4 sm:px-6 bg-[#08080B]/80 font-bold text-xs sm:text-sm text-white border-b border-white/[0.06]">
                  <span className="flex items-center gap-2 text-white/90">
                    <span className="h-2 w-2 rounded-full bg-[#E10613]" />
                    4. (–) CUSTOS DOS SERVIÇOS PRESTADOS (CSP)
                  </span>
                  <span className="font-mono text-[#FCA5A5]">
                    ({formatBRL(dre.custosServicos)})
                  </span>
                </div>
                {dre.custosServicosRows.length > 0 ? (
                  dre.custosServicosRows.map((row) => (
                    <DRERowItem key={row.category} row={row} isExpense={true} indent />
                  ))
                ) : (
                  <p className="py-2 px-8 text-xs text-white/30 italic">
                    Sem custos diretos lançados
                  </p>
                )}
              </div>

              {/* 5. LUCRO BRUTO (SUBTOTAL) */}
              <div className="flex items-center justify-between py-3.5 px-4 sm:px-6 bg-white/[0.04] font-extrabold text-xs sm:text-sm text-white">
                <span>= 5. LUCRO BRUTO OPERACIONAL</span>
                <span
                  className={`font-mono ${
                    dre.lucroBruto >= 0 ? 'text-emerald-400' : 'text-[#E10613]'
                  }`}
                >
                  {formatBRL(dre.lucroBruto)}
                </span>
              </div>

              {/* 6. DESPESAS OPERACIONAIS */}
              <div className="bg-white/[0.01]">
                <div className="flex items-center justify-between py-3 px-4 sm:px-6 bg-[#08080B]/80 font-bold text-xs sm:text-sm text-white border-b border-white/[0.06]">
                  <span className="flex items-center gap-2 text-white/90">
                    <span className="h-2 w-2 rounded-full bg-[#E10613]" />
                    6. (–) DESPESAS OPERACIONAIS
                  </span>
                  <span className="font-mono text-[#FCA5A5]">
                    ({formatBRL(dre.despesasOperacionais)})
                  </span>
                </div>

                {dre.despesasOperacionaisGroups.map((grp) => (
                  <div key={grp.id} className="border-b border-white/[0.04] last:border-b-0">
                    <div className="flex items-center justify-between py-2 px-6 bg-white/[0.02] text-xs font-bold text-white/70">
                      <span>• {grp.title}</span>
                      <span className="font-mono text-[#FCA5A5]/90">({formatBRL(grp.total)})</span>
                    </div>
                    {grp.rows.map((row) => (
                      <DRERowItem key={row.category} row={row} isExpense={true} indent />
                    ))}
                  </div>
                ))}
              </div>

              {/* SUB-TOTAL RESULTADO OPERACIONAL */}
              <div className="flex items-center justify-between py-3 px-4 sm:px-6 bg-white/[0.03] font-bold text-xs text-white/90">
                <span>(=) RESULTADO OPERACIONAL (EBITDA / LAJIDA aproximado)</span>
                <span
                  className={`font-mono ${
                    dre.resultadoOperacional >= 0 ? 'text-emerald-400' : 'text-[#E10613]'
                  }`}
                >
                  {formatBRL(dre.resultadoOperacional)}
                </span>
              </div>

              {/* 7. RESULTADO FINANCEIRO */}
              <div className="bg-white/[0.01]">
                <div className="flex items-center justify-between py-3 px-4 sm:px-6 bg-[#08080B]/80 font-bold text-xs sm:text-sm text-white border-b border-white/[0.06]">
                  <span className="flex items-center gap-2 text-white/90">
                    <span className="h-2 w-2 rounded-full bg-[#E10613]" />
                    7. (–) RESULTADO FINANCEIRO (JUROS, ANTECIPAÇÃO & COMISSÕES)
                  </span>
                  <span className="font-mono text-[#FCA5A5]">
                    ({formatBRL(dre.resultadoFinanceiro)})
                  </span>
                </div>
                {dre.resultadoFinanceiroRows.length > 0 ? (
                  dre.resultadoFinanceiroRows.map((row) => (
                    <DRERowItem key={row.category} row={row} isExpense={true} indent />
                  ))
                ) : (
                  <p className="py-2 px-8 text-xs text-white/30 italic">
                    Sem despesas financeiras no período
                  </p>
                )}
              </div>

              {/* 8. TRIBUTOS FEDERAIS */}
              <div className="bg-white/[0.01]">
                <div className="flex items-center justify-between py-3 px-4 sm:px-6 bg-[#08080B]/80 font-bold text-xs sm:text-sm text-white border-b border-white/[0.06]">
                  <span className="flex items-center gap-2 text-white/90">
                    <span className="h-2 w-2 rounded-full bg-[#E10613]" />
                    8. (–) TRIBUTOS FEDERAIS & DARFs
                  </span>
                  <span className="font-mono text-[#FCA5A5]">
                    ({formatBRL(dre.impostosFinais)})
                  </span>
                </div>
                {dre.impostosFinaisRows.length > 0 ? (
                  dre.impostosFinaisRows.map((row) => (
                    <DRERowItem key={row.category} row={row} isExpense={true} indent />
                  ))
                ) : (
                  <p className="py-2 px-8 text-xs text-white/30 italic">
                    Sem tributos federais lançados no período
                  </p>
                )}
              </div>

              {/* 9. LUCRO LÍQUIDO FINAL DO PERÍODO */}
              <div
                className={`flex items-center justify-between py-5 px-4 sm:px-8 font-extrabold text-base sm:text-lg border-t-2 ${
                  dre.lucroLiquido >= 0
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                    : 'border-[#E10613] bg-[#E10613]/15 text-[#E10613] shadow-[0_0_20px_rgba(225,6,19,0.2)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      dre.lucroLiquido >= 0
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-[#E10613]/20 text-[#E10613]'
                    }`}
                  >
                    {dre.lucroLiquido >= 0 ? (
                      <TrendingUp className="h-6 w-6" />
                    ) : (
                      <TrendingDown className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <span className="block text-white">9. (=) LUCRO LÍQUIDO DO PERÍODO</span>
                    <span className="block text-xs font-normal text-white/60">
                      Resultado final apurado para {dre.periodLabel}
                    </span>
                  </div>
                </div>

                <div className="text-right font-mono text-xl sm:text-2xl">
                  {dre.lucroLiquido >= 0 ? '+' : ''}
                  {formatBRL(dre.lucroLiquido)}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Rodapé explicativo contábil */}
        <footer className="rounded-2xl border border-white/[0.08] bg-[#0D0D11] p-5 text-xs text-white/40 space-y-2">
          <div className="flex items-center gap-2 font-bold text-white/70">
            <ShieldCheck className="h-4 w-4 text-[#E10613]" />
            <span>Critérios Contábeis & Auditoria Interna do Rubra</span>
          </div>
          <p className="leading-relaxed">
            A DRE é calculada pelo regime de caixa/competência com base nas datas e valores das
            transações da Pessoa Jurídica cadastradas no PocketBase. As 6 unidades de serviço
            oficiais atendem tanto às receitas quanto aos custos e despesas rateados.
          </p>
        </footer>
      </main>
    </div>
  )
}
