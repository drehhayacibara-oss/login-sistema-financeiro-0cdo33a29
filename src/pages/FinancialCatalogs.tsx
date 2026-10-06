import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronDown,
  CreditCard,
  Landmark,
  LoaderCircle,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Stethoscope,
  Tags,
  Users,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import {
  createCatalogRecord,
  getVisibleCatalogDefinitions,
  listCatalogRecords,
  updateCatalogRecord,
  type CatalogType,
  type FinancialCatalogInput,
  type FinancialCatalogRecord,
} from '@/services/financialCatalogs'

type IconComponent = typeof Building2

const icons: Record<CatalogType, IconComponent> = {
  accounts: Landmark,
  categories: Tags,
  payment_methods: CreditCard,
  doctors: Stethoscope,
  insurers: Users,
  cost_centers: BriefcaseBusiness,
}

const emptyForm = (): FinancialCatalogInput => ({
  name: '',
  description: '',
  direction: 'expense',
  entity: 'pj',
  account_type: 'cash',
  crm: '',
})

function fieldLabel(type: CatalogType, field: string) {
  if (field === 'name') return 'Nome'
  if (field === 'description') return 'Descrição (opcional)'
  if (type === 'categories' && field === 'direction') return 'Tipo'
  if (type === 'categories' && field === 'entity') return 'Entidade'
  if (type === 'accounts' && field === 'account_type') return 'Tipo de conta'
  if (type === 'doctors' && field === 'crm') return 'CRM (opcional)'
  return field
}

function optionLabel(value: string) {
  const labels: Record<string, string> = {
    income: 'Receita',
    expense: 'Despesa',
    pf: 'Pessoa Física (PF)',
    pj: 'Pessoa Jurídica (PJ)',
    both: 'PF e PJ',
    cash: 'Caixa',
    bank: 'Conta bancária',
    credit_card: 'Cartão',
    other: 'Outro',
  }
  return labels[value] || value
}

export default function FinancialCatalogsPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [selectedType, setSelectedType] = useState<CatalogType>('accounts')
  const [records, setRecords] = useState<FinancialCatalogRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FinancialCatalogInput>(emptyForm)
  const [formError, setFormError] = useState('')

  const canManage = user?.role === 'gestao_financeira'
  const definitions = useMemo(
    () => (user ? getVisibleCatalogDefinitions(user.role) : []),
    [user],
  )
  const definition = definitions.find((item) => item.type === selectedType) || definitions[0]

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

  useEffect(() => {
    if (definition && definition.type !== selectedType) setSelectedType(definition.type)
  }, [definition, selectedType])

  const loadRecords = useCallback(async () => {
    if (!definition) return
    setLoading(true)
    try {
      setRecords(await listCatalogRecords(definition.type))
    } catch (error) {
      setRecords([])
      toast({
        title: 'Não foi possível carregar os cadastros',
        description: getErrorMessage(error),
        className: 'border-l-4 border-l-[#E10613] bg-[#121216] text-white',
      })
    } finally {
      setLoading(false)
    }
  }, [definition, toast])

  useEffect(() => {
    if (isAuthenticated && definition) loadRecords()
  }, [isAuthenticated, definition, loadRecords])

  const visibleRecords = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR')
    if (!query) return records
    return records.filter((record) =>
      `${record.name} ${record.description} ${record.crm || ''}`
        .toLocaleLowerCase('pt-BR')
        .includes(query),
    )
  }, [records, search])

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm())
    setFormError('')
  }

  const beginEdit = (record: FinancialCatalogRecord) => {
    setEditingId(record.id)
    setForm({
      name: record.name,
      description: record.description,
      direction: record.direction || 'expense',
      entity: record.entity || 'pj',
      account_type: record.account_type || 'cash',
      crm: record.crm || '',
    })
    setFormError('')
  }

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!definition || !canManage) return
    setFormError('')
    setSaving(true)
    try {
      if (editingId) {
        await updateCatalogRecord(definition.type, editingId, form)
      } else {
        await createCatalogRecord(definition.type, form)
      }
      await loadRecords()
      resetForm()
      toast({
        title: editingId ? 'Cadastro atualizado' : 'Cadastro criado',
        description: `${definition.singular.charAt(0).toUpperCase()}${definition.singular.slice(1)} salvo com sucesso.`,
        className: 'border-l-4 border-l-emerald-500 bg-[#121216] text-white',
      })
    } catch (error) {
      const message = getErrorMessage(error)
      setFormError(message)
      toast({
        title: 'Não foi possível salvar',
        description: message,
        className: 'border-l-4 border-l-[#E10613] bg-[#121216] text-white',
      })
    } finally {
      setSaving(false)
    }
  }

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#08080B] text-white">
        <LoaderCircle className="h-8 w-8 animate-spin text-[#E10613]" />
      </div>
    )
  }

  if (!definition) return null
  const Icon = icons[definition.type]
  const extraFields = definition.extraFields

  return (
    <div className="min-h-screen bg-[#08080B] px-4 py-6 text-white sm:px-8 sm:py-9">
      <main className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              aria-label="Voltar ao painel"
              className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-white/70 transition hover:bg-white/[0.07] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#E10613]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E10613]/25 bg-[#E10613]/10 text-[#E10613]">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#E10613]">
                Gestão Financeira
              </p>
              <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight">Cadastros financeiros</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0D0D11] px-3 py-2 text-xs text-white/50">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Perfil: <span className="font-semibold text-white">{user.role === 'recepcao' ? 'Recepção' : user.role === 'direcao' ? 'Direção' : 'Gestão Financeira'}</span>
          </div>
        </header>

        <section className="rounded-2xl border border-white/[0.08] bg-[#0D0D11] p-4 sm:p-5">
          <div className="flex items-center gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Tipos de cadastro">
            {definitions.map((item) => {
              const ItemIcon = icons[item.type]
              const selected = item.type === definition.type
              return (
                <button
                  key={item.type}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => {
                    setSelectedType(item.type)
                    setSearch('')
                    resetForm()
                  }}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#E10613] ${selected ? 'border-[#E10613]/50 bg-[#E10613]/10 text-white' : 'border-white/10 bg-white/[0.02] text-white/50 hover:bg-white/[0.05] hover:text-white'}`}
                >
                  <ItemIcon className={`h-4 w-4 ${selected ? 'text-[#E10613]' : 'text-white/35'}`} />
                  {item.label}
                </button>
              )
            })}
          </div>
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-white/[0.06] bg-[#08080B]/50 p-3.5">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#E10613]" />
            <div>
              <h2 className="text-sm font-bold text-white">{definition.label}</h2>
              <p className="mt-1 text-xs leading-relaxed text-white/40">{definition.description}</p>
            </div>
          </div>
        </section>

        <div className={`grid gap-6 ${canManage ? 'xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.85fr)]' : 'grid-cols-1'}`}>
          <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0D0D11]">
            <div className="flex flex-col justify-between gap-3 border-b border-white/[0.08] p-4 sm:flex-row sm:items-center sm:p-5">
              <div>
                <h2 className="text-base font-bold">Registros ativos</h2>
                <p className="mt-1 text-xs text-white/40">{visibleRecords.length} {visibleRecords.length === 1 ? 'cadastro' : 'cadastros'}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar cadastro"
                    aria-label="Buscar cadastro"
                    className="h-10 w-full rounded-xl border border-white/10 bg-[#08080B] pl-9 pr-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#E10613]"
                  />
                </div>
                <button
                  type="button"
                  onClick={loadRecords}
                  disabled={loading}
                  aria-label="Atualizar cadastros"
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-white/60 transition hover:bg-white/[0.07] hover:text-white disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-48 items-center justify-center text-white/40">
                <LoaderCircle className="mr-2 h-5 w-5 animate-spin text-[#E10613]" />
                Carregando cadastros…
              </div>
            ) : visibleRecords.length === 0 ? (
              <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                  <Icon className="h-5 w-5 text-white/30" />
                </div>
                <p className="mt-3 text-sm font-semibold text-white/70">Nenhum cadastro encontrado</p>
                <p className="mt-1 max-w-md text-xs leading-relaxed text-white/35">
                  {search ? 'Ajuste o termo de busca ou limpe o filtro.' : 'Crie o primeiro registro para disponibilizá-lo nos fluxos financeiros.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {visibleRecords.map((record) => (
                  <article key={record.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-white">{record.name}</h3>
                        {definition.type === 'categories' && record.direction && (
                          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-white/55">{optionLabel(record.direction)}</span>
                        )}
                        {definition.type === 'categories' && record.entity && (
                          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-white/55">{optionLabel(record.entity)}</span>
                        )}
                        {definition.type === 'accounts' && record.account_type && (
                          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-white/55">{optionLabel(record.account_type)}</span>
                        )}
                        {definition.type === 'doctors' && record.crm && (
                          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-white/55">CRM {record.crm}</span>
                        )}
                      </div>
                      {record.description && <p className="mt-1 text-xs text-white/40">{record.description}</p>}
                    </div>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => beginEdit(record)}
                        className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 transition hover:border-[#E10613]/40 hover:bg-[#E10613]/10 hover:text-white sm:self-auto focus:outline-none focus:ring-2 focus:ring-[#E10613]"
                      >
                        <Save className="h-3.5 w-3.5" />
                        Editar
                      </button>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          {canManage && (
            <section className="h-fit rounded-2xl border border-white/[0.08] bg-[#0D0D11] p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#E10613]">{editingId ? 'Edição' : 'Novo registro'}</p>
                  <h2 className="mt-1 text-base font-bold">{editingId ? `Editar ${definition.singular}` : `Cadastrar ${definition.singular}`}</h2>
                </div>
                {editingId && <button type="button" onClick={resetForm} className="text-xs font-semibold text-white/40 hover:text-white">Cancelar edição</button>}
              </div>

              <form onSubmit={handleSave} className="mt-5 space-y-4">
                {formError && <p role="alert" className="rounded-xl border border-[#E10613]/30 bg-[#E10613]/10 p-3 text-xs leading-relaxed text-[#FCA5A5]">{formError}</p>}
                <div>
                  <label htmlFor="catalog-name" className="mb-1.5 block text-xs font-semibold text-white/70">Nome <span className="text-[#FCA5A5]">*</span></label>
                  <input id="catalog-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required minLength={1} maxLength={160} autoComplete="off" className="h-10 w-full rounded-xl border border-white/10 bg-[#08080B] px-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#E10613]" />
                </div>

                {extraFields.map((field) => {
                  const options = field === 'direction'
                    ? (['income', 'expense'] as const)
                    : field === 'entity'
                      ? (['pf', 'pj', 'both'] as const)
                      : field === 'account_type'
                        ? (['cash', 'bank', 'credit_card', 'other'] as const)
                        : null
                  if (field === 'crm') {
                    return <div key={field}><label htmlFor="catalog-crm" className="mb-1.5 block text-xs font-semibold text-white/70">{fieldLabel(definition.type, field)}</label><input id="catalog-crm" value={form.crm || ''} onChange={(event) => setForm((current) => ({ ...current, crm: event.target.value }))} maxLength={40} autoComplete="off" className="h-10 w-full rounded-xl border border-white/10 bg-[#08080B] px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#E10613]" /></div>
                  }
                  if (!options) return null
                  const value = field === 'direction' ? form.direction : field === 'entity' ? form.entity : form.account_type
                  return (
                    <div key={field}>
                      <label htmlFor={`catalog-${field}`} className="mb-1.5 block text-xs font-semibold text-white/70">{fieldLabel(definition.type, field)} <span className="text-[#FCA5A5]">*</span></label>
                      <div className="relative">
                        <select id={`catalog-${field}`} value={value} required onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} className="h-10 w-full appearance-none rounded-xl border border-white/10 bg-[#08080B] px-3 pr-9 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#E10613]">
                          {options.map((option) => <option key={option} value={option}>{optionLabel(option)}</option>)}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                      </div>
                    </div>
                  )
                })}

                <div>
                  <label htmlFor="catalog-description" className="mb-1.5 block text-xs font-semibold text-white/70">Descrição (opcional)</label>
                  <textarea id="catalog-description" value={form.description || ''} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} maxLength={300} rows={3} className="w-full resize-y rounded-xl border border-white/10 bg-[#08080B] px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#E10613]" />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button type="submit" disabled={saving} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#E10613] px-4 text-sm font-bold text-white transition hover:bg-[#C00510] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#E10613]">
                    {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Salvar cadastro'}
                  </button>
                  {editingId && <button type="button" onClick={resetForm} disabled={saving} className="h-10 rounded-xl border border-white/10 px-3 text-xs font-semibold text-white/65 hover:bg-white/[0.05] disabled:opacity-50">Cancelar</button>}
                </div>
                <p className="text-[10px] leading-relaxed text-white/30">Cadastros usados em lançamentos são gerenciados no próximo passo; nesta entrega não há exclusão nem inativação.</p>
              </form>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
