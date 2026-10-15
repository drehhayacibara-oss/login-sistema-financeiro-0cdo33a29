import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  CreditCard,
  Download,
  Edit2,
  Filter,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { formatBRL, formatDatePtBR } from '@/services/transactions'
import {
  type ServiceEntry,
  type CreateServiceEntryDTO,
  fetchServiceEntries,
  createServiceEntry,
  updateServiceEntry,
  deleteServiceEntry,
} from '@/services/serviceEntries'
import { SERVICES_PJ, CATEGORIES_PJ, type ServicePJ } from '@/constants/categories'
import { useRealtime } from '@/hooks/use-realtime'
import { ServiceEntryModal } from '@/components/ServiceEntryModal'

export default function ServiceEntriesPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [entries, setEntries] = useState<ServiceEntry[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [entryToEdit, setEntryToEdit] = useState<ServiceEntry | null>(null)

  // Filtros de período
  const [periodMode, setPeriodMode] = useState<'month' | 'year' | 'all'>('month')
  const [selectedMonth, setSelectedMonth] = useState<string>(() =>
    new Date().toISOString().slice(0, 7),
  )
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear())

  // Filtros específicos
  const [selectedServico, setSelectedServico] = useState<string>('all')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')

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

  // Carga de dados
  const loadEntries = useCallback(async () => {
    try {
      setLoadingData(true)
      const data = await fetchServiceEntries()
      setEntries(data)
    } catch (err) {
      console.error('Erro ao carregar lançamentos de serviços:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os lançamentos de serviços.',
        className: 'border-l-4 border-l-[#E10613] bg-[#121216] text-white',
      })
    } finally {
      setLoadingData(false)
    }
  }, [toast])

  useEffect(() => {
    if (isAuthenticated) {
      loadEntries()
    }
  }, [isAuthenticated, loadEntries])

  useRealtime(
    'service_entries',
    () => {
      loadEntries()
    },
    isAuthenticated,
  )

  // Submissão do modal (criar ou editar)
  const handleSubmitEntry = async (dto: CreateServiceEntryDTO) => {
    if (entryToEdit) {
      const updated = await updateServiceEntry(entryToEdit.id, dto)
      setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
      toast({
        title: 'Lançamento atualizado!',
        description: `Serviço ${dto.servico} (${formatBRL(dto.amount)}) atualizado com sucesso.`,
        className: 'border-l-4 border-l-emerald-500 bg-[#121216] text-white',
      })
    } else {
      const created = await createServiceEntry(dto)
      setEntries((prev) => [created, ...prev])
      toast({
        title: 'Lançamento registrado!',
        description: `Receita de ${formatBRL(dto.amount)} salva com sucesso.`,
        className: 'border-l-4 border-l-emerald-500 bg-[#121216] text-white',
      })
    }
  }

  // Exclusão
  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Deseja realmente excluir este lançamento de serviço?')) return
    try {
      await deleteServiceEntry(id)
      setEntries((prev) => prev.filter((e) => e.id !== id))
      toast({
        title: 'Lançamento excluído',
        description: 'O lançamento foi removido com sucesso.',
        className: 'border-l-4 border-l-[#E10613] bg-[#121216] text-white',
      })
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível remover o lançamento.',
        className: 'border-l-4 border-l-[#E10613] bg-[#121216] text-white',
      })
    }
  }

  // Filtragem de lançamentos
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Período
      if (entry.date) {
        const dateStr = entry.date.slice(0, 10)
        if (periodMode === 'month') {
          if (!dateStr.startsWith(selectedMonth)) return false
        } else if (periodMode === 'year') {
          if (!dateStr.startsWith(String(selectedYear))) return false
        }
      }

      // Serviço
      if (selectedServico !== 'all' && entry.servico !== selectedServico) {
        return false
      }

      // Forma de pagamento
      if (selectedPaymentMethod !== 'all' && entry.payment_method !== selectedPaymentMethod) {
        return false
      }

      // Busca por texto (observação ou valor)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase()
        const matchNotes = (entry.notes || '').toLowerCase().includes(query)
        const matchService = (entry.servico || '').toLowerCase().includes(query)
        const matchPayment = (entry.payment_method || '').toLowerCase().includes(query)
        const matchAmount = entry.amount.toString().includes(query)
        if (!matchNotes && !matchService && !matchPayment && !matchAmount) {
          return false
        }
      }

      return true
    })
  }, [
    entries,
    periodMode,
    selectedMonth,
    selectedYear,
    selectedServico,
    selectedPaymentMethod,
    searchTerm,
  ])

  // Totalizadores do período filtrado
  const totalPeriod = useMemo(() => {
    return filteredEntries.reduce((acc, curr) => acc + curr.amount, 0)
  }, [filteredEntries])

  // Quebra por serviço no período filtrado
  const totalByService = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of SERVICES_PJ) map[s] = 0
    for (const e of filteredEntries) {
      map[e.servico] = (map[e.servico] || 0) + e.amount
    }
    return map
  }, [filteredEntries])

  // Quebra por forma de pagamento no período filtrado
  const totalByPaymentMethod = useMemo(() => {
    const map: Record<string, number> = {}
    for (const m of CATEGORIES_PJ.income) map[m] = 0
    for (const e of filteredEntries) {
      map[e.payment_method] = (map[e.payment_method] || 0) + e.amount
    }
    return map
  }, [filteredEntries])

  // Exportação CSV dos lançamentos de serviços
  const handleExportCSV = () => {
    try {
      const headers = ['Data', 'Serviço', 'Forma de Pagamento', 'Valor (R$)', 'Observação']
      const rows = filteredEntries.map((e) => [
        `"${formatDatePtBR(e.date)}"`,
        `"${e.servico}"`,
        `"${e.payment_method}"`,
        `"${e.amount.toFixed(2).replace('.', ',')}"`,
        `"${(e.notes || '').replace(/"/g, '""')}"`,
      ])

      const csvContent =
        '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute(
        'download',
        `Lancamentos_Servicos_Rubra_${new Date().toISOString().slice(0, 10)}.csv`,
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: 'Exportação concluída!',
        description: 'Planilha CSV de lançamentos baixada com sucesso.',
        className: 'border-l-4 border-l-emerald-500 bg-[#121216] text-white',
      })
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível exportar a planilha.',
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
          <span className="text-sm text-white/45">Carregando lançamentos de serviços...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) return null

  return (
    <div className="min-h-screen w-full bg-[#08080B] text-white flex flex-col">
      {/* Modal Criar/Editar */}
      <ServiceEntryModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        entryToEdit={entryToEdit}
        onSubmit={handleSubmitEntry}
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
                  <Briefcase className="h-5 w-5 text-[#E10613]" />
                  Lançamentos de Serviços
                </span>
                <span className="rounded-md border border-[#E10613]/40 bg-[#E10613]/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#FCA5A5]">
                  PJ Exclusivo
                </span>
              </div>
              <p className="text-[11px] text-white/40 hidden sm:block">
                Receita registrada na fonte: data, serviço, forma de pagamento e valor (origem da
                DRE)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredEntries.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-bold text-white transition-all hover:border-[#E10613]/50 hover:bg-[#E10613]/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4 text-[#E10613]" />
              <span className="hidden sm:inline">Exportar</span> CSV
            </button>

            <button
              type="button"
              onClick={() => {
                setEntryToEdit(null)
                setModalOpen(true)
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#E10613] px-4 py-2 text-xs font-bold text-white shadow-[0_0_20px_rgba(225,6,19,0.3)] hover:bg-[#C00510]"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Lançamento</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[1560px] w-full flex-1 px-5 py-6 sm:px-8 sm:py-8 xl:px-10 space-y-6">
        {/* Banner explicativo de integração com DRE */}
        <div className="rounded-2xl border border-[#E10613]/25 bg-[#E10613]/[0.05] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-white/80">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E10613]/15 text-[#E10613]">
              <ReceiptText className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-white">Planilha Digital de Entradas por Serviço</p>
              <p className="text-[11px] text-white/50 leading-relaxed">
                Estes lançamentos substituem a planilha manual da recepção. Na DRE da PJ, a{' '}
                <strong>Receita Bruta</strong> é calculada exclusivamente a partir deste módulo, sem
                passar pelo extrato de caixa.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dre')}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-white/90 hover:bg-white/[0.08] transition-colors shrink-0 self-start sm:self-auto"
          >
            <span>Ver na DRE</span>
            <ArrowLeft className="h-3 w-3 rotate-180" />
          </button>
        </div>

        {/* Barra de Filtro de Período e Critérios */}
        <section className="rounded-2xl border border-white/[0.08] bg-[#0D0D11] p-4 sm:p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-[#E10613]">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Período e Filtros
                </p>
                <h2 className="text-base font-extrabold text-white">
                  {periodMode === 'month'
                    ? `Mês ${selectedMonth}`
                    : periodMode === 'year'
                      ? `Ano ${selectedYear}`
                      : 'Todos os Lançamentos'}
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Toggle de Modo */}
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
                  Mês
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
                  Ano
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodMode('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    periodMode === 'all'
                      ? 'bg-[#E10613] text-white shadow-sm'
                      : 'text-white/40 hover:text-white'
                  }`}
                >
                  Tudo
                </button>
              </div>

              {/* Seletor */}
              {periodMode === 'month' && (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="h-9 rounded-xl border border-white/10 bg-[#08080B] px-3 text-xs text-white [color-scheme:dark] focus:ring-2 focus:ring-[#E10613]"
                />
              )}
              {periodMode === 'year' && (
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
                onClick={loadEntries}
                disabled={loadingData}
                title="Recarregar lançamentos"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loadingData ? 'animate-spin text-[#E10613]' : ''}`}
                />
              </button>
            </div>
          </div>

          {/* Filtros em linha */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5">
            {/* Serviço */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">
                Filtrar por Serviço
              </label>
              <select
                value={selectedServico}
                onChange={(e) => setSelectedServico(e.target.value)}
                className="w-full h-9 rounded-xl border border-white/10 bg-[#08080B] px-3 text-xs text-white focus:ring-2 focus:ring-[#E10613]"
              >
                <option value="all">Todos os Serviços (6)</option>
                {SERVICES_PJ.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Forma de Pagamento */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">
                Filtrar por Forma de Pagamento
              </label>
              <select
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="w-full h-9 rounded-xl border border-white/10 bg-[#08080B] px-3 text-xs text-white focus:ring-2 focus:ring-[#E10613]"
              >
                <option value="all">Todas as Formas de Receita (8)</option>
                {CATEGORIES_PJ.income.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Busca textual */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">
                Buscar (obs/valor)
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ex: Maria Silva, Pix..."
                  className="w-full h-9 rounded-xl border border-white/10 bg-[#08080B] pl-9 pr-8 text-xs text-white placeholder-white/25 focus:ring-2 focus:ring-[#E10613]"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 3 Cards de Resumo */}
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.08] bg-[#0D0D11] p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              Receita Total do Período
            </p>
            <p className="mt-2 text-2xl font-extrabold text-emerald-400 font-mono">
              {formatBRL(totalPeriod)}
            </p>
            <p className="mt-1 text-xs text-white/40">
              {filteredEntries.length} lançamento(s) de serviço
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#0D0D11] p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              Ticket Médio por Atendimento
            </p>
            <p className="mt-2 text-2xl font-extrabold text-white font-mono">
              {formatBRL(filteredEntries.length > 0 ? totalPeriod / filteredEntries.length : 0)}
            </p>
            <p className="mt-1 text-xs text-white/40">Média no filtro selecionado</p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#0D0D11] p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              Serviço Mais Lançado
            </p>
            {(() => {
              const entriesSorted = Object.entries(totalByService).sort((a, b) => b[1] - a[1])
              const top = entriesSorted[0]
              return (
                <>
                  <p className="mt-2 text-lg font-extrabold text-white truncate">
                    {top && top[1] > 0 ? top[0] : 'Nenhum'}
                  </p>
                  <p className="mt-1 text-xs text-emerald-400 font-mono">
                    {top && top[1] > 0 ? formatBRL(top[1]) : 'R$ 0,00'}
                  </p>
                </>
              )
            })()}
          </div>
        </section>

        {/* Quebra Rápida por Serviço (chips) */}
        <section className="rounded-2xl border border-white/[0.08] bg-[#0D0D11] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-2">
              <Briefcase className="h-3.5 w-3.5 text-[#E10613]" />
              Totais por Serviço no Período
            </h3>
            <span className="text-[11px] text-white/30 font-mono">6 serviços</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {SERVICES_PJ.map((s) => {
              const val = totalByService[s] || 0
              const isSelected = selectedServico === s
              return (
                <button
                  type="button"
                  key={s}
                  onClick={() => setSelectedServico(isSelected ? 'all' : s)}
                  className={`rounded-xl border p-2.5 text-left transition-all ${
                    isSelected
                      ? 'border-[#E10613] bg-[#E10613]/15 ring-1 ring-[#E10613]'
                      : 'border-white/5 bg-[#08080B] hover:border-white/20'
                  }`}
                >
                  <p className="text-[10px] font-bold text-white/60 truncate">{s}</p>
                  <p className="text-xs font-mono font-extrabold text-emerald-400 mt-1">
                    {formatBRL(val)}
                  </p>
                </button>
              )
            })}
          </div>
        </section>

        {/* Tabela de Lançamentos */}
        <section className="rounded-2xl border border-white/[0.08] bg-[#0D0D11] p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ReceiptText className="h-4 w-4 text-[#E10613]" />
                Registros de Serviços Prestados
              </h3>
              <p className="text-xs text-white/40">
                Mostrando {filteredEntries.length} de {entries.length} lançamento(s)
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEntryToEdit(null)
                setModalOpen(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#E10613] px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#C00510] transition-colors self-start sm:self-auto"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo Lançamento
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-[#08080B]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.08] bg-white/[0.02] text-[10px] font-bold uppercase tracking-wider text-white/40">
                <tr>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Serviço / Centro de Custo</th>
                  <th className="py-3 px-4">Forma de Pagamento</th>
                  <th className="py-3 px-4">Observações</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                  <th className="py-3 px-4 text-center w-24">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-white/40">
                      <div className="flex flex-col items-center gap-2">
                        <Briefcase className="h-8 w-8 text-white/20 stroke-1" />
                        <p className="text-sm font-semibold">Nenhum lançamento encontrado</p>
                        <p className="text-xs text-white/30 max-w-sm">
                          Não há serviços registrados para os filtros selecionados. Clique em "Novo
                          Lançamento" para cadastrar.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-3 px-4 font-mono text-white/70 whitespace-nowrap">
                        {formatDatePtBR(entry.date)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#E10613]" />
                          {entry.servico}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white/80 whitespace-nowrap">
                        <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium">
                          {entry.payment_method}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white/50 max-w-xs truncate">
                        {entry.notes || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                        {formatBRL(entry.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEntryToEdit(entry)
                              setModalOpen(true)
                            }}
                            title="Editar lançamento"
                            className="rounded-lg p-1.5 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEntry(entry.id)}
                            title="Excluir lançamento"
                            className="rounded-lg p-1.5 text-white/40 hover:text-[#E10613] hover:bg-[#E10613]/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredEntries.length > 0 && (
                <tfoot className="border-t border-white/[0.08] bg-white/[0.02] text-xs font-bold text-white">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 uppercase tracking-wider text-white/60">
                      Total ({filteredEntries.length} itens)
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400 text-sm">
                      {formatBRL(totalPeriod)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
