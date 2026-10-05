import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarDays,
  CreditCard,
  Filter,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  PieChart,
  Plus,
  ReceiptText,
  RefreshCw,
  Settings2,
  ShieldCheck,
  TrendingUp,
  User,
  WalletCards,
  X,
} from 'lucide-react'
import { type UserRole, useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  type CreateTransactionDTO,
  type Transaction,
  type TransactionEntity,
  calculateExpenseCategories,
  calculateMonthlyTrend,
  calculateSummary,
  createTransaction,
  deleteTransaction,
  fetchTransactions,
  formatBRL,
} from '@/services/transactions'
import { NewTransactionModal } from '@/components/NewTransactionModal'
import { ImportStatementModal } from '@/components/ImportStatementModal'
import { FinancialTrendChart } from '@/components/FinancialTrendChart'
import { ExpenseCategoriesCard } from '@/components/ExpenseCategoriesCard'
import { TransactionList } from '@/components/TransactionList'
import pb from '@/lib/pocketbase/client'
import { FileSpreadsheet } from 'lucide-react'

type SidebarProps = {
  role: UserRole
  mobile?: boolean
  onClose?: () => void
  onFeatureClick: (feature: string) => void
  onNewTransaction: () => void
  onImportStatement: () => void
  onNavigateDRE: () => void
}

type NavigationItem = {
  label: string
  description: string
  icon: LucideIcon
  active?: boolean
  badge?: string
  route?: string
}

const navigationByRole: Record<UserRole, NavigationItem[]> = {
  direcao: [
    {
      label: 'Visão geral',
      description: 'Painel financeiro',
      icon: LayoutDashboard,
      active: true,
    },
    {
      label: 'Relatório DRE',
      description: 'Resultado PJ & Serviços',
      icon: BarChart3,
      route: '/dre',
    },
    {
      label: 'Movimentações',
      description: 'Extrato de lançamentos',
      icon: ReceiptText,
    },
    {
      label: 'Contas & Bancos',
      description: 'Gestão de caixas',
      icon: Building2,
      badge: 'Em breve',
    },
  ],
  gestao_financeira: [
    {
      label: 'Visão geral',
      description: 'Painel financeiro',
      icon: LayoutDashboard,
      active: true,
    },
    {
      label: 'Relatório DRE',
      description: 'Resultado PJ & Serviços',
      icon: BarChart3,
      route: '/dre',
    },
    {
      label: 'Movimentações',
      description: 'Extrato de lançamentos',
      icon: ReceiptText,
    },
    {
      label: 'Caixa diário',
      description: 'Abertura e fechamento',
      icon: WalletCards,
      badge: 'Em breve',
    },
  ],
  recepcao: [
    {
      label: 'Visão geral',
      description: 'Painel financeiro',
      icon: LayoutDashboard,
      active: true,
    },
    {
      label: 'Relatório DRE',
      description: 'Demonstrativo PJ',
      icon: BarChart3,
      route: '/dre',
    },
    {
      label: 'Movimentações',
      description: 'Registro de receitas',
      icon: ReceiptText,
    },
    {
      label: 'Caixa diário',
      description: 'Operação de balcão',
      icon: WalletCards,
      badge: 'Em breve',
    },
  ],
}

const roleLabels: Record<UserRole, string> = {
  direcao: 'Direção Executiva',
  gestao_financeira: 'Gestão Financeira',
  recepcao: 'Recepção / Caixa',
}

function Sidebar({
  role,
  mobile = false,
  onClose,
  onFeatureClick,
  onNewTransaction,
  onImportStatement,
  onNavigateDRE,
}: SidebarProps) {
  return (
    <aside
      className={`${
        mobile
          ? 'fixed inset-y-0 left-0 z-50 flex w-[292px] shadow-[24px_0_80px_rgba(0,0,0,0.45)]'
          : 'sticky top-0 hidden h-screen w-[292px] shrink-0 lg:flex'
      } flex-col border-r border-white/[0.08] bg-[#0D0D11]`}
    >
      <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-[#E10613] shadow-[0_0_20px_rgba(225,6,19,0.35)]">
            <TrendingUp className="h-5 w-5 text-white stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold leading-none tracking-[0.2em] text-white">
              RUBRA
            </span>
            <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/40">
              Financial Suite
            </span>
          </div>
        </div>
        {mobile && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="rounded-lg p-2 text-white/50 transition-colors hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#E10613]"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-2">
        <button
          type="button"
          onClick={() => {
            if (mobile && onClose) onClose()
            onNewTransaction()
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E10613] py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(225,6,19,0.3)] transition-all hover:bg-[#C00510] focus:ring-4 focus:ring-[#E10613]/30"
        >
          <Plus className="h-4 w-4" />
          Nova Transação
        </button>

        <button
          type="button"
          onClick={() => {
            if (mobile && onClose) onClose()
            onImportStatement()
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-xs font-semibold text-white/80 transition-all hover:border-[#E10613]/40 hover:bg-[#E10613]/10 hover:text-white"
        >
          <FileSpreadsheet className="h-4 w-4 text-[#E10613]" />
          Importar Extrato
        </button>
      </div>

      <div className="flex-1 px-4 py-2">
        <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#63636D]">
          Menu
        </div>
        <nav className="space-y-1" aria-label="Navegação principal">
          {navigationByRole[role].map((item) => {
            const Icon = item.icon
            const handleClick = () => {
              if (mobile && onClose) onClose()
              if (item.route === '/dre') {
                onNavigateDRE()
              } else if (item.active) {
                if (onClose) onClose()
              } else {
                onFeatureClick(item.label)
              }
            }

            return (
              <button
                key={item.label}
                type="button"
                aria-current={item.active ? 'page' : undefined}
                onClick={handleClick}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                  item.active
                    ? 'bg-[#E10613]/10 text-white shadow-[inset_3px_0_0_#E10613]'
                    : item.route === '/dre'
                      ? 'text-white/80 hover:bg-white/[0.06] hover:text-white'
                      : 'text-white/50 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 ${
                    item.active
                      ? 'text-[#E10613]'
                      : item.route === '/dre'
                        ? 'text-[#E10613]'
                        : 'text-white/35'
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {item.label}
                    {item.route === '/dre' && (
                      <span className="rounded-md border border-[#E10613]/40 bg-[#E10613]/15 px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wider text-[#FCA5A5]">
                        PJ
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-white/35">
                    {item.description}
                  </span>
                </span>
                {!item.active && item.badge && (
                  <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white/30">
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {role === 'gestao_financeira' && (
          <>
            <div className="mb-3 mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#63636D]">
              Sistema
            </div>
            <button
              type="button"
              onClick={() => onFeatureClick('Configurações')}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-white/50 transition-colors hover:bg-white/[0.04] hover:text-white"
            >
              <Settings2 className="h-[18px] w-[18px] text-white/35" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">Configurações</span>
                <span className="mt-0.5 block text-[11px] text-white/35">Parâmetros e contas</span>
              </span>
              <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white/30">
                Em breve
              </span>
            </button>
          </>
        )}
      </div>

      <div className="border-t border-white/[0.08] p-5">
        <div className="flex items-start gap-3 rounded-xl border border-[#E10613]/20 bg-[#E10613]/[0.06] p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#E10613]" />
          <div>
            <p className="text-xs font-semibold text-white/80">Ambiente seguro</p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/40">
              Conexão criptografada e autenticada no RUBRA.
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default function Dashboard() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedEntity, setSelectedEntity] = useState<'all' | 'pj' | 'pf'>('all')
  const [loadingData, setLoadingData] = useState(true)
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')

  // Auth Protection
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

  // Fetch transactions
  const loadTransactions = useCallback(async () => {
    try {
      setLoadingData(true)
      const data = await fetchTransactions()
      setTransactions(data)
    } catch (err) {
      console.error('Erro ao carregar transações:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar as transações financeiras.',
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

  // Realtime subscription for transactions
  useEffect(() => {
    if (!isAuthenticated) return

    let isSubscribed = true

    pb.collection('transactions')
      .subscribe('*', (e) => {
        if (!isSubscribed) return
        if (e.action === 'create') {
          // Refresh list or append
          loadTransactions()
        } else if (e.action === 'delete') {
          setTransactions((prev) => prev.filter((t) => t.id !== e.record.id))
        } else if (e.action === 'update') {
          loadTransactions()
        }
      })
      .catch((err) => {
        console.warn('Realtime subscription error on transactions:', err)
      })

    return () => {
      isSubscribed = false
      pb.collection('transactions')
        .unsubscribe('*')
        .catch(() => {})
    }
  }, [isAuthenticated, loadTransactions])

  // Handle new transaction submission
  const handleCreateTransaction = async (dto: CreateTransactionDTO) => {
    const newTx = await createTransaction(dto)
    setTransactions((prev) => [newTx, ...prev])
    toast({
      title: 'Transação adicionada com sucesso!',
      description: `${dto.type === 'income' ? 'Receita' : 'Despesa'} de ${formatBRL(dto.amount)} cadastrada.`,
      className: 'border-l-4 border-l-emerald-500 bg-[#121216] text-white',
    })
  }

  // Handle statement import completion
  const handleImportComplete = (createdCount: number) => {
    loadTransactions()
    toast({
      title: 'Extrato importado com sucesso!',
      description: `${createdCount} ${createdCount === 1 ? 'lançamento foi importado' : 'lançamentos foram importados'} para o Rubra.`,
      className: 'border-l-4 border-l-emerald-500 bg-[#121216] text-white',
    })
  }

  // Handle delete transaction
  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Deseja realmente excluir este lançamento financeiro?')) return
    try {
      await deleteTransaction(id)
      setTransactions((prev) => prev.filter((t) => t.id !== id))
      toast({
        title: 'Lançamento excluído',
        description: 'A transação foi removida com sucesso.',
        className: 'border-l-4 border-l-[#E10613] bg-[#121216] text-white',
      })
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível remover a transação.',
        className: 'border-l-4 border-l-[#E10613] bg-[#121216] text-white',
      })
    }
  }

  // Transações filtradas pelo contexto global PF/PJ
  const entityFilteredTransactions = useMemo(() => {
    if (selectedEntity === 'all') return transactions
    return transactions.filter((t) => t.entity === selectedEntity)
  }, [transactions, selectedEntity])

  // Current Month calculation
  const currentMonthKey = useMemo(() => new Date().toISOString().slice(0, 7), [])

  const currentMonthName = useMemo(() => {
    const formatted = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
      new Date(),
    )
    return formatted.charAt(0).toUpperCase() + formatted.slice(1)
  }, [])

  const today = useMemo(() => {
    const formatted = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date())
    return formatted.charAt(0).toUpperCase() + formatted.slice(1)
  }, [])

  // Summaries and charts data respeitando o filtro de contexto global
  const summary = useMemo(() => {
    return calculateSummary(entityFilteredTransactions, currentMonthKey)
  }, [entityFilteredTransactions, currentMonthKey])

  const chartTrend = useMemo(() => {
    return calculateMonthlyTrend(entityFilteredTransactions, 6)
  }, [entityFilteredTransactions])

  const expenseCategories = useMemo(() => {
    return calculateExpenseCategories(entityFilteredTransactions, currentMonthKey)
  }, [entityFilteredTransactions, currentMonthKey])

  // Filtered transactions for recent activity table (contexto + tipo)
  const displayedTransactions = useMemo(() => {
    if (filterType === 'all') return entityFilteredTransactions
    return entityFilteredTransactions.filter((t) => t.type === filterType)
  }, [entityFilteredTransactions, filterType])

  const handleLogout = () => {
    logout()
    toast({
      title: 'Você saiu da sessão.',
      description: 'Até logo!',
      className: 'border-l-4 border-l-[#E10613] bg-[#121216] text-white',
    })
    navigate('/', { replace: true })
  }

  const showComingSoon = (feature: string) => {
    toast({
      title: `${feature} em preparação.`,
      description: 'Este módulo estará disponível na próxima atualização do Rubra.',
      className: 'border-l-4 border-l-[#E10613] bg-[#121216] text-white',
    })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#08080B] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E10613]/10 text-[#E10613]">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
          <span className="text-sm text-white/45">Carregando painel financeiro...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const firstName = user.name ? user.name.split(' ')[0] : 'Usuário'
  const initial = firstName.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen w-full bg-[#08080B] text-white">
      {/* Mobile Drawer */}
      {isSidebarOpen && (
        <>
          <button
            type="button"
            aria-label="Fechar menu lateral"
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          />
          <Sidebar
            role={user.role}
            mobile
            onClose={() => setIsSidebarOpen(false)}
            onFeatureClick={showComingSoon}
            onNewTransaction={() => setIsNewTxModalOpen(true)}
            onImportStatement={() => setIsImportModalOpen(true)}
            onNavigateDRE={() => navigate('/dre')}
          />
        </>
      )}

      {/* Modal Nova Transação */}
      <NewTransactionModal
        open={isNewTxModalOpen}
        onOpenChange={setIsNewTxModalOpen}
        onSubmit={handleCreateTransaction}
      />

      {/* Modal Importar Extrato (CSV/OFX em 3 etapas) */}
      <ImportStatementModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        existingTransactions={transactions}
        onImportComplete={handleImportComplete}
        createTransactionFn={createTransaction}
      />

      <div className="flex min-h-screen">
        <Sidebar
          role={user.role}
          onFeatureClick={showComingSoon}
          onNewTransaction={() => setIsNewTxModalOpen(true)}
          onImportStatement={() => setIsImportModalOpen(true)}
          onNavigateDRE={() => navigate('/dre')}
        />

        <div className="min-w-0 flex-1">
          {/* Header */}
          <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#08080B]/90 backdrop-blur-xl">
            <div className="flex h-[76px] items-center justify-between gap-4 px-5 sm:px-8 xl:px-10">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  aria-label="Abrir menu"
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#E10613] lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#E10613]">
                    Painel Financeiro
                  </p>
                  <p className="mt-0.5 hidden text-xs text-white/40 sm:block">
                    Visão geral e controle de caixa
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-4">
                {/* Seletor Global de Visão PF / PJ / Ambas */}
                <div className="flex items-center rounded-xl border border-white/10 bg-[#0D0D11] p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedEntity('all')}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 font-bold transition-all ${
                      selectedEntity === 'all'
                        ? 'bg-white/15 text-white shadow-sm'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    <span>Ambas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedEntity('pj')}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 font-bold transition-all ${
                      selectedEntity === 'pj'
                        ? 'border border-[#E10613]/50 bg-[#E10613]/20 text-[#FCA5A5] shadow-[0_0_12px_rgba(225,6,19,0.25)]'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Pessoa</span> Jurídica
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedEntity('pf')}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 font-bold transition-all ${
                      selectedEntity === 'pf'
                        ? 'border border-sky-500/50 bg-sky-500/20 text-sky-400 shadow-[0_0_12px_rgba(14,165,233,0.25)]'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    <User className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Pessoa</span> Física
                  </button>
                </div>

                <div className="hidden items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-400 xl:flex">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Ao vivo</span>
                </div>

                <div className="flex items-center gap-3 border-l border-white/10 pl-3 sm:pl-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-[#E10613] text-sm font-extrabold text-white shadow-[0_0_14px_rgba(225,6,19,0.25)]">
                    {initial}
                  </div>
                  <div className="hidden min-w-0 sm:block">
                    <p className="truncate text-sm font-bold text-white">{firstName}</p>
                    <p className="truncate text-[11px] font-semibold text-white/40">{user.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    title="Sair do sistema"
                    className="ml-1 rounded-lg border border-white/10 bg-white/[0.03] p-2 text-white/50 transition-colors hover:border-[#E10613]/40 hover:bg-[#E10613]/10 hover:text-[#E10613]"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="mx-auto max-w-[1560px] px-5 py-7 sm:px-8 sm:py-9 xl:px-10">
            {/* Boas-vindas e ações */}
            <section className="animate-rise-in flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/40">
                  <CalendarDays className="h-4 w-4 text-[#E10613]" />
                  {today}
                </p>
                <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  Bem-vindo ao Rubra, {firstName}.
                </h1>
                <p className="mt-1 text-sm text-white/50">
                  Acompanhe seu saldo total, entradas e saídas de dinheiro do mês em tempo real.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={loadTransactions}
                  disabled={loadingData}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-xs font-semibold text-white/75 transition-all hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${loadingData ? 'animate-spin text-[#E10613]' : ''}`}
                  />
                  Recarregar
                </button>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 text-sm font-bold text-white transition-all hover:border-[#E10613]/50 hover:bg-[#E10613]/10 hover:shadow-[0_0_20px_rgba(225,6,19,0.2)] focus:ring-4 focus:ring-[#E10613]/30"
                >
                  <FileSpreadsheet className="h-4 w-4 text-[#E10613]" />
                  Importar extrato
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewTxModalOpen(true)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#E10613] px-5 text-sm font-bold text-white shadow-[0_0_24px_rgba(225,6,19,0.3)] transition-all hover:bg-[#C00510] hover:shadow-[0_0_32px_rgba(225,6,19,0.45)] focus:ring-4 focus:ring-[#E10613]/30"
                >
                  <Plus className="h-4 w-4" />
                  Nova Transação
                </button>
              </div>
            </section>

            {/* Resumo de Indicadores (Saldo, Receitas, Despesas, Resultado) */}
            <section
              className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
              aria-label="Indicadores financeiros"
            >
              {/* Saldo Total */}
              <article className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0D0D11] p-5 transition-all hover:-translate-y-0.5 hover:border-white/[0.14] hover:shadow-[0_18px_50px_rgba(0,0,0,0.25)]">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-[#E10613]/15 blur-3xl" />
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#63636D]">
                      Saldo Total Acumulado
                    </p>
                    <p
                      className={`mt-3 text-2xl font-extrabold tracking-tight ${
                        summary.totalBalance >= 0 ? 'text-white' : 'text-[#E10613]'
                      }`}
                    >
                      {formatBRL(summary.totalBalance)}
                    </p>
                    <p className="mt-2 text-xs text-white/40">
                      Entradas menos saídas de todo o período
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#E10613]/20 bg-[#E10613]/10 p-2.5 text-[#E10613]">
                    <WalletCards className="h-5 w-5" />
                  </div>
                </div>
              </article>

              {/* Receitas do Mês */}
              <article className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0D0D11] p-5 transition-all hover:-translate-y-0.5 hover:border-white/[0.14] hover:shadow-[0_18px_50px_rgba(0,0,0,0.25)]">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-emerald-500/10 blur-3xl" />
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-400/70">
                      Receitas de {currentMonthName}
                    </p>
                    <p className="mt-3 text-2xl font-extrabold tracking-tight text-emerald-400">
                      + {formatBRL(summary.monthIncome)}
                    </p>
                    <p className="mt-2 text-xs text-white/40">Total recebido este mês</p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-emerald-400">
                    <ArrowUpRight className="h-5 w-5" />
                  </div>
                </div>
              </article>

              {/* Despesas do Mês */}
              <article className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0D0D11] p-5 transition-all hover:-translate-y-0.5 hover:border-white/[0.14] hover:shadow-[0_18px_50px_rgba(0,0,0,0.25)]">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-[#E10613]/10 blur-3xl" />
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#FCA5A5]/70">
                      Despesas de {currentMonthName}
                    </p>
                    <p className="mt-3 text-2xl font-extrabold tracking-tight text-[#FCA5A5]">
                      - {formatBRL(summary.monthExpense)}
                    </p>
                    <p className="mt-2 text-xs text-white/40">Total gasto neste mês</p>
                  </div>
                  <div className="rounded-xl border border-[#E10613]/20 bg-[#E10613]/10 p-2.5 text-[#E10613]">
                    <ArrowDownRight className="h-5 w-5" />
                  </div>
                </div>
              </article>

              {/* Resultado Líquido do Mês */}
              <article className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0D0D11] p-5 transition-all hover:-translate-y-0.5 hover:border-white/[0.14] hover:shadow-[0_18px_50px_rgba(0,0,0,0.25)]">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-sky-500/10 blur-3xl" />
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#63636D]">
                      Resultado Líquido do Mês
                    </p>
                    <p
                      className={`mt-3 text-2xl font-extrabold tracking-tight ${
                        summary.netMonth >= 0 ? 'text-emerald-400' : 'text-[#E10613]'
                      }`}
                    >
                      {summary.netMonth >= 0 ? '+' : ''}
                      {formatBRL(summary.netMonth)}
                    </p>
                    <p className="mt-2 text-xs text-white/40">Sobrou da diferença no mês atual</p>
                  </div>
                  <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-2.5 text-sky-400">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
              </article>
            </section>

            {/* Gráficos Financeiros */}
            <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,1fr)]">
              {/* Gráfico de Evolução (Receitas vs Despesas) */}
              <article
                className="animate-rise-in rounded-2xl border border-white/[0.08] bg-[#0D0D11] p-5 sm:p-6"
                style={{ animationDelay: '100ms' }}
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-white/[0.04] p-2 text-white/55">
                        <Activity className="h-4 w-4" />
                      </div>
                      <h2 className="text-base font-bold text-white">Receitas vs. Despesas</h2>
                    </div>
                    <p className="mt-1 text-xs text-white/40">
                      Comparativo mensal dos últimos 6 meses para acompanhar seu fluxo
                    </p>
                  </div>
                  <span className="inline-flex w-fit items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Histórico 6 meses
                  </span>
                </div>
                <div className="mt-4">
                  <FinancialTrendChart data={chartTrend} />
                </div>
              </article>

              {/* Composição das Despesas por Categoria */}
              <article
                className="animate-rise-in rounded-2xl border border-white/[0.08] bg-[#0D0D11] p-5 sm:p-6"
                style={{ animationDelay: '180ms' }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-white/[0.04] p-2 text-white/55">
                      <PieChart className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">Onde gastei este mês</h2>
                      <p className="text-xs text-white/40">
                        Distribuição das despesas por categoria
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-5">
                  <ExpenseCategoriesCard categories={expenseCategories} />
                </div>
              </article>
            </section>

            {/* Lista de Transações Recentes */}
            <section className="mt-6 animate-rise-in" style={{ animationDelay: '240ms' }}>
              <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-white/[0.04] p-2 text-white/55">
                      <ReceiptText className="h-4 w-4" />
                    </div>
                    <h2 className="text-lg font-bold text-white">Transações Recentes</h2>
                  </div>
                  <p className="mt-1 text-xs text-white/40">
                    Histórico com valores, categorias e datas de cada lançamento
                  </p>
                </div>

                {/* Filtro simples: Todas, Receitas, Despesas */}
                <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#08080B] p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterType('all')}
                    className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                      filterType === 'all'
                        ? 'bg-white/10 text-white font-bold'
                        : 'text-white/40 hover:text-white'
                    }`}
                  >
                    Todas ({transactions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('income')}
                    className={`flex items-center gap-1 rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                      filterType === 'income'
                        ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                        : 'text-white/40 hover:text-white'
                    }`}
                  >
                    <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                    Receitas
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('expense')}
                    className={`flex items-center gap-1 rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                      filterType === 'expense'
                        ? 'bg-[#E10613]/20 text-[#FCA5A5] font-bold'
                        : 'text-white/40 hover:text-white'
                    }`}
                  >
                    <ArrowDownRight className="h-3.5 w-3.5 text-[#E10613]" />
                    Despesas
                  </button>
                </div>
              </div>

              {/* Tabela de Transações */}
              <TransactionList
                transactions={displayedTransactions}
                showEntityBadge={selectedEntity === 'all'}
                onDelete={handleDeleteTransaction}
                onNewTransaction={() => setIsNewTxModalOpen(true)}
                onImportStatement={() => setIsImportModalOpen(true)}
              />
            </section>

            {/* Dicas para o iniciante */}
            <section
              className="mt-6 rounded-2xl border border-white/[0.08] bg-[#0D0D11] p-5 sm:p-6"
              aria-label="Dicas financeiras"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E10613]/30 bg-[#E10613]/10 text-[#E10613]">
                    <ListChecks className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Dica Rubra: Mantenha seus registros sempre em dia
                    </h3>
                    <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/45">
                      Cadastre cada despesa no momento em que ela acontecer. Isso garante gráficos
                      precisos e evita surpresas no fechamento do mês.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewTxModalOpen(true)}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:border-[#E10613]/30 hover:bg-[#E10613]/10 hover:text-[#FCA5A5]"
                >
                  <Plus className="h-3.5 w-3.5 text-[#E10613]" />
                  Adicionar lançamento
                </button>
              </div>
            </section>

            {/* Footer */}
            <footer className="mt-8 flex flex-col justify-between gap-3 border-t border-white/[0.08] py-5 text-xs text-white/30 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-white/25" />
                <span>Rubra Financial Suite • Dados protegidos com criptografia</span>
              </div>
              <div className="flex items-center gap-4">
                <span>Perfil: {roleLabels[user.role]}</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 font-semibold text-white/45 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-[#E10613]"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sair do sistema
                </button>
              </div>
            </footer>
          </main>
        </div>
      </div>
    </div>
  )
}
