import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Plus,
  ReceiptText,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'

type SidebarProps = {
  mobile?: boolean
  onClose?: () => void
}

type Metric = {
  label: string
  value: string
  detail: string
  icon: LucideIcon
  accent: string
  iconClass: string
}

const navigation: Array<{
  label: string
  description: string
  icon: LucideIcon
  active?: boolean
}> = [
  {
    label: 'Visão geral',
    description: 'Resumo financeiro',
    icon: LayoutDashboard,
    active: true,
  },
  {
    label: 'Movimentações',
    description: 'Receitas e despesas',
    icon: ReceiptText,
  },
  {
    label: 'Contas',
    description: 'Caixa e bancos',
    icon: Building2,
  },
  {
    label: 'Relatórios',
    description: 'Análises e indicadores',
    icon: BarChart3,
  },
]

const setupSteps = [
  {
    number: '01',
    title: 'Cadastre suas contas',
    description: 'Organize bancos, caixa e outras contas financeiras.',
    icon: Building2,
  },
  {
    number: '02',
    title: 'Defina as categorias',
    description: 'Separe receitas e despesas para enxergar o resultado.',
    icon: ListChecks,
  },
  {
    number: '03',
    title: 'Registre o primeiro lançamento',
    description: 'Comece a construir sua visão financeira real.',
    icon: CircleDollarSign,
  },
]

function Sidebar({ mobile = false, onClose }: SidebarProps) {
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

      <div className="flex-1 px-4 py-6">
        <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#63636D]">
          Navegação
        </div>
        <nav className="space-y-1" aria-label="Navegação principal">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                type="button"
                disabled={!item.active}
                onClick={item.active ? onClose : undefined}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                  item.active
                    ? 'bg-[#E10613]/10 text-white shadow-[inset_3px_0_0_#E10613]'
                    : 'cursor-not-allowed text-white/35 hover:bg-white/[0.03]'
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 ${
                    item.active ? 'text-[#E10613]' : 'text-white/30'
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-white/35">
                    {item.description}
                  </span>
                </span>
                {!item.active && (
                  <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white/30">
                    Em breve
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="mb-3 mt-9 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#63636D]">
          Sistema
        </div>
        <button
          type="button"
          disabled
          className="group flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 text-left text-white/35 transition-colors hover:bg-white/[0.03]"
        >
          <Settings2 className="h-[18px] w-[18px] text-white/30" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Configurações</span>
            <span className="mt-0.5 block text-[11px] text-white/35">Preferências do sistema</span>
          </span>
          <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white/30">
            Em breve
          </span>
        </button>
      </div>

      <div className="border-t border-white/[0.08] p-5">
        <div className="flex items-start gap-3 rounded-xl border border-[#E10613]/20 bg-[#E10613]/[0.06] p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#E10613]" />
          <div>
            <p className="text-xs font-semibold text-white/80">Ambiente protegido</p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/40">
              Sua sessão está protegida pelo acesso seguro do RUBRA.
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0D0D11] p-5 transition-all hover:-translate-y-0.5 hover:border-white/[0.14] hover:shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
      <div className={`absolute right-0 top-0 h-24 w-24 rounded-full ${metric.accent} blur-3xl`} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#63636D]">
            {metric.label}
          </p>
          <p className="mt-3 text-2xl font-extrabold tracking-tight text-white">{metric.value}</p>
          <p className="mt-2 text-xs text-white/40">{metric.detail}</p>
        </div>
        <div className={`rounded-xl border border-white/10 p-2.5 ${metric.iconClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  )
}

function EmptyChart() {
  return (
    <div className="relative mt-6 h-[188px] overflow-hidden rounded-xl border border-dashed border-white/10 bg-[#08080B]/60">
      <div className="absolute inset-0 flex flex-col justify-between p-5 opacity-60">
        <div className="border-t border-dashed border-white/[0.08]" />
        <div className="border-t border-dashed border-white/[0.08]" />
        <div className="border-t border-dashed border-white/[0.08]" />
        <div className="border-t border-dashed border-white/[0.08]" />
      </div>
      <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
          <Activity className="h-5 w-5 text-white/25" />
        </div>
        <p className="text-sm font-semibold text-white/70">Aguardando os primeiros lançamentos</p>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-white/35">
          O gráfico de evolução do caixa aparecerá aqui quando houver dados financeiros registrados.
        </p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

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

  const today = useMemo(() => {
    const formatted = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date())
    return formatted.charAt(0).toUpperCase() + formatted.slice(1)
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#08080B] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E10613]/10 text-[#E10613]">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
          <span className="text-sm text-white/45">Carregando seu painel...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const firstName = user.name ? user.name.split(' ')[0] : 'Usuário'
  const initial = firstName.charAt(0).toUpperCase()

  const metrics: Metric[] = [
    {
      label: 'Saldo disponível',
      value: 'Sem dados',
      detail: 'Cadastre uma conta financeira',
      icon: WalletCards,
      accent: 'bg-[#E10613]/15',
      iconClass: 'bg-[#E10613]/10 text-[#E10613]',
    },
    {
      label: 'Receitas no período',
      value: 'Sem dados',
      detail: 'Nenhum lançamento registrado',
      icon: ArrowUpRight,
      accent: 'bg-emerald-500/10',
      iconClass: 'bg-emerald-500/10 text-emerald-400',
    },
    {
      label: 'Despesas no período',
      value: 'Sem dados',
      detail: 'Nenhum lançamento registrado',
      icon: ArrowDownRight,
      accent: 'bg-amber-500/10',
      iconClass: 'bg-amber-500/10 text-amber-300',
    },
    {
      label: 'Resultado líquido',
      value: 'Sem dados',
      detail: 'Disponível após os primeiros registros',
      icon: TrendingUp,
      accent: 'bg-sky-500/10',
      iconClass: 'bg-sky-500/10 text-sky-300',
    },
  ]

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
      description:
        'A estrutura visual está pronta. A conexão com os dados será feita na próxima etapa.',
      className: 'border-l-4 border-l-[#E10613] bg-[#121216] text-white',
    })
  }

  return (
    <div className="min-h-screen w-full bg-[#08080B] text-white">
      {isSidebarOpen && (
        <>
          <button
            type="button"
            aria-label="Fechar menu lateral"
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          />
          <Sidebar mobile onClose={() => setIsSidebarOpen(false)} />
        </>
      )}

      <div className="flex min-h-screen">
        <Sidebar />

        <div className="min-w-0 flex-1">
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
                    Painel financeiro
                  </p>
                  <p className="mt-1 hidden text-xs text-white/35 sm:block">
                    Visão geral da operação
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-5">
                <div className="hidden items-center gap-2 text-xs text-white/35 md:flex">
                  <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.55)]" />
                  <span>Base financeira em configuração</span>
                </div>
                <button
                  type="button"
                  onClick={() => showComingSoon('Notificações')}
                  aria-label="Notificações"
                  className="relative rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#E10613]"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#E10613]" />
                </button>
                <div className="flex items-center gap-3 border-l border-white/10 pl-3 sm:pl-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-[#E10613] text-sm font-extrabold text-white shadow-[0_0_14px_rgba(225,6,19,0.25)]">
                    {initial}
                  </div>
                  <div className="hidden min-w-0 sm:block">
                    <p className="truncate text-sm font-bold text-white">{firstName}</p>
                    <p className="max-w-[160px] truncate text-[11px] text-white/35">{user.email}</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-[1560px] px-5 py-7 sm:px-8 sm:py-9 xl:px-10">
            <section className="animate-rise-in flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="flex items-center gap-2 text-sm text-white/40">
                  <CalendarDays className="h-4 w-4 text-[#E10613]" />
                  {today}
                </p>
                <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  Olá, {firstName}.
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/45 sm:text-base">
                  Este é o ponto de partida para acompanhar as decisões financeiras da sua operação
                  com clareza.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => showComingSoon('Atualização de dados')}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-semibold text-white/75 transition-all hover:border-white/20 hover:bg-white/[0.06] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#E10613]"
                >
                  <RefreshCw className="h-4 w-4" />
                  Atualizar
                </button>
                <button
                  type="button"
                  onClick={() => showComingSoon('Novo lançamento')}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#E10613] px-4 text-sm font-bold text-white shadow-[0_0_24px_rgba(225,6,19,0.24)] transition-all hover:bg-[#C00510] hover:shadow-[0_0_30px_rgba(225,6,19,0.38)] focus:outline-none focus:ring-4 focus:ring-[#E10613]/30"
                >
                  <Plus className="h-4 w-4" />
                  Novo lançamento
                </button>
              </div>
            </section>

            <section className="mt-8 animate-rise-in" style={{ animationDelay: '80ms' }}>
              <div className="flex flex-col gap-4 rounded-2xl border border-[#E10613]/25 bg-gradient-to-r from-[#E10613]/[0.10] via-[#E10613]/[0.04] to-transparent p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#E10613]/30 bg-[#E10613]/10 text-[#E10613]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">
                      Seu painel está pronto para receber os dados reais.
                    </p>
                    <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/45 sm:text-sm">
                      Para ativar os indicadores, o próximo passo é configurar as contas
                      financeiras, categorias e lançamentos da operação.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => showComingSoon('Configuração financeira')}
                  className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-[#E10613]/40 px-3.5 py-2.5 text-xs font-bold text-[#FCA5A5] transition-colors hover:bg-[#E10613]/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#E10613] sm:self-center"
                >
                  Ver próximo passo
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </section>

            <section
              className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
              aria-label="Indicadores financeiros"
            >
              {metrics.map((metric) => (
                <MetricCard key={metric.label} metric={metric} />
              ))}
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
              <article
                className="animate-rise-in rounded-2xl border border-white/[0.08] bg-[#0D0D11] p-5 sm:p-6"
                style={{ animationDelay: '160ms' }}
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-white/[0.04] p-2 text-white/55">
                        <Activity className="h-4 w-4" />
                      </div>
                      <h2 className="text-base font-bold text-white">Evolução do caixa</h2>
                    </div>
                    <p className="mt-2 text-xs text-white/35">
                      Acompanhamento do saldo ao longo do período selecionado
                    </p>
                  </div>
                  <span className="inline-flex w-fit items-center rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/35">
                    Sem período definido
                  </span>
                </div>
                <EmptyChart />
              </article>

              <article
                className="animate-rise-in rounded-2xl border border-white/[0.08] bg-[#0D0D11] p-5 sm:p-6"
                style={{ animationDelay: '240ms' }}
              >
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-white/[0.04] p-2 text-white/55">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <h2 className="text-base font-bold text-white">Composição financeira</h2>
                </div>
                <p className="mt-2 text-xs text-white/35">
                  Categorias e distribuição dos lançamentos
                </p>
                <div className="mt-6 rounded-xl border border-dashed border-white/10 bg-[#08080B]/50 p-5">
                  <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border-[14px] border-white/[0.05] border-t-[#E10613]/60 border-r-white/10">
                    <span className="text-center text-[10px] font-bold uppercase leading-relaxed tracking-wider text-white/30">
                      Sem
                      <br />
                      dados
                    </span>
                  </div>
                  <p className="mt-5 text-center text-sm font-semibold text-white/65">
                    Nenhuma categoria disponível
                  </p>
                  <p className="mt-1 text-center text-xs leading-relaxed text-white/35">
                    A distribuição aparecerá após o cadastro dos primeiros lançamentos.
                  </p>
                </div>
              </article>
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
              <article
                className="animate-rise-in rounded-2xl border border-white/[0.08] bg-[#0D0D11] p-5 sm:p-6"
                style={{ animationDelay: '320ms' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-white/[0.04] p-2 text-white/55">
                        <ListChecks className="h-4 w-4" />
                      </div>
                      <h2 className="text-base font-bold text-white">Comece por aqui</h2>
                    </div>
                    <p className="mt-2 text-xs text-white/35">
                      Três passos para transformar o painel em uma fonte de decisão
                    </p>
                  </div>
                  <span className="hidden text-[10px] font-bold uppercase tracking-wider text-[#E10613] sm:block">
                    0% concluído
                  </span>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {setupSteps.map((step) => {
                    const Icon = step.icon
                    return (
                      <button
                        key={step.number}
                        type="button"
                        onClick={() => showComingSoon(step.title)}
                        className="group rounded-xl border border-white/[0.08] bg-[#08080B]/50 p-4 text-left transition-all hover:border-[#E10613]/30 hover:bg-[#E10613]/[0.04] focus:outline-none focus:ring-2 focus:ring-[#E10613]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold tracking-[0.16em] text-[#E10613]">
                            {step.number}
                          </span>
                          <Icon className="h-4 w-4 text-white/25 transition-colors group-hover:text-[#E10613]" />
                        </div>
                        <p className="mt-5 text-sm font-bold text-white/80">{step.title}</p>
                        <p className="mt-2 text-xs leading-relaxed text-white/35">
                          {step.description}
                        </p>
                        <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-white/35 transition-colors group-hover:text-[#FCA5A5]">
                          Preparar etapa
                          <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </button>
                    )
                  })}
                </div>
              </article>

              <article
                className="animate-rise-in rounded-2xl border border-white/[0.08] bg-[#0D0D11] p-5 sm:p-6"
                style={{ animationDelay: '400ms' }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-white/[0.04] p-2 text-white/55">
                        <Activity className="h-4 w-4" />
                      </div>
                      <h2 className="text-base font-bold text-white">Atividade recente</h2>
                    </div>
                    <p className="mt-2 text-xs text-white/35">Últimos movimentos registrados</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => showComingSoon('Movimentações')}
                    className="hidden items-center gap-1 text-xs font-semibold text-[#FCA5A5] transition-colors hover:text-white sm:inline-flex"
                  >
                    Ver tudo
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-6 flex min-h-[186px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#08080B]/50 px-6 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
                    <ReceiptText className="h-5 w-5 text-white/25" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-white/65">
                    Nenhuma atividade recente
                  </p>
                  <p className="mt-1 max-w-xs text-xs leading-relaxed text-white/35">
                    Os lançamentos e alterações aparecerão aqui assim que o sistema começar a ser
                    utilizado.
                  </p>
                </div>
              </article>
            </section>

            <footer className="mt-8 flex flex-col justify-between gap-3 border-t border-white/[0.08] py-5 text-xs text-white/30 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-white/25" />
                <span>Dados protegidos pelo ambiente seguro do RUBRA</span>
              </div>
              <div className="flex items-center gap-4">
                <span>Base financeira: em configuração</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 font-semibold text-white/45 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-[#E10613]"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sair
                </button>
              </div>
            </footer>
          </main>
        </div>
      </div>
    </div>
  )
}
