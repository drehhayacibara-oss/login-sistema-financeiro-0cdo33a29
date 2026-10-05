import { CATEGORIES_PJ, SERVICES_PJ, type ServicePJ } from '@/constants/categories'
import type { Transaction } from './transactions'

/**
 * ============================================================================
 * MAPEAMENTO OFICIAL DRE (Demonstração do Resultado do Exercício) - RUBRA
 * ============================================================================
 * REGRA CENTRAL DE NEGÓCIO: A DRE é EXCLUSIVAMENTE da Pessoa Jurídica (PJ).
 * Nenhuma movimentação de PF entra nestes cálculos sob qualquer hipótese.
 *
 * Baseado nas NOVAS listas de categorias de fluxo de caixa (CATEGORIES_PJ):
 * - 8 Receitas (formas de entrada de dinheiro): CARTAO DE DEBITO, CARTAO DE CREDITO,
 *   ANTECIPACAO DE CARTAO DE CREDITO, PIX, DINHEIRO, CHEQUE, ALUGUEL DE SALAS, TED.
 * - 30 Despesas agrupadas contabilmente:
 *   1. Custos Diretos dos Serviços (CSP - 7 itens)
 *   2. Despesas Operacionais (15 itens)
 *   3. Resultado Financeiro (4 itens)
 *   4. Tributos (3 itens)
 *   5. Investimentos / Não Operacional (1 item)
 *
 * Estrutura contábil encadeada:
 * 1. RECEITA BRUTA: soma de todas as 8 formas de entrada PJ
 * 2. (-) DEDUÇÕES DE RECEITA: deduções/estornos de receita ou impostos sobre serviços
 * 3. (=) RECEITA LÍQUIDA OPERACIONAL
 * 4. (-) CUSTOS DOS SERVIÇOS PRESTADOS (CSP): custos diretos hospitalares/médicos/insumos
 * 5. (=) LUCRO BRUTO OPERACIONAL
 * 6. (-) DESPESAS OPERACIONAIS:
 *      6.1 Pessoal & Folha (SALARIOS)
 *      6.2 Ocupação, Prediais & Administrativas (ALUGUEL EXTERNO, CONTADOR, DESPESAS PREDIAIS, etc.)
 *      6.3 Comerciais, Marketing & Relacionamento (MARKETING/PROPAGANDA, CONVENIO, etc.)
 *      6.4 Outras / Não mapeadas (lançamentos históricos)
 * 7. (=) RESULTADO OPERACIONAL (EBITDA / LAJIDA aproximado)
 * 8. (+/-) RESULTADO FINANCEIRO (JUROS BANCARIOS, TARIFAS BANCARIAS, EMPRESTIMO, DEPOSITOS BANCARIOS)
 * 9. (-) TRIBUTOS (IMPOSTOS FEDERAIS, IMPOSTOS MUNICIPAIS, PARCELAMENTO DE IMPOSTOS)
 * 10. (-) INVESTIMENTOS / NÃO OPERACIONAL (INVESTIMENTOS)
 * 11. (=) LUCRO LÍQUIDO DO PERÍODO
 * ============================================================================
 */

export type DRESectionType =
  | 'receita_bruta'
  | 'deducoes_receita'
  | 'custos_servicos'
  | 'despesas_operacionais'
  | 'resultado_financeiro'
  | 'tributos'
  | 'investimentos'
  | 'outras_despesas'

export interface DRESubgroup {
  id: string
  title: string
  categories: string[]
}

/**
 * Mapeamento das 8 categorias de RECEITA PJ de fluxo de caixa:
 * Todas somam à Receita Bruta. Categorias legadas também apontam para cá.
 */
export const DRE_REVENUE_CATEGORIES_MAPPING: Record<string, 'receita_bruta' | 'deducoes_receita'> =
  {
    // 8 novas categorias oficiais de fluxo de caixa PJ
    'CARTAO DE DEBITO': 'receita_bruta',
    'CARTAO DE CREDITO': 'receita_bruta',
    'ANTECIPACAO DE CARTAO DE CREDITO': 'receita_bruta',
    PIX: 'receita_bruta',
    DINHEIRO: 'receita_bruta',
    CHEQUE: 'receita_bruta',
    'ALUGUEL DE SALAS': 'receita_bruta',
    TED: 'receita_bruta',

    // Compatibilidade com categorias contábeis antigas para históricos
    'Consultas/US  dinheiro/cheque a vista/pix': 'receita_bruta',
    'Consultas cartão crédito': 'receita_bruta',
    'Consultas cartão de débito': 'receita_bruta',
    'Cosultas/ US Cheques pré': 'receita_bruta',
    'Pequenos procedimentos dinheiro/cheque': 'receita_bruta',
    'Pequenos procedimentos Cartão de Crédito': 'receita_bruta',
    'Pequenos procedimentos Cartão de débito': 'receita_bruta',
    'Pequenos procedimentos Cheques pré': 'receita_bruta',
    'Consultas de Convênio Unimed DR. EDSON': 'receita_bruta',
    'Consultas de Convênio Unimed DR. WANDERSON': 'receita_bruta',
    'Consulta Hap vida Dr. Wandersom': 'receita_bruta',
    'Consulta Hap vida Dr. Dr. Edson': 'receita_bruta',
    'Procedimento Unimed': 'receita_bruta',
    'Procedimento Hap Vida': 'receita_bruta',
    'Laboratório dinheiro': 'receita_bruta',
    'Laboratório Cartão débito': 'receita_bruta',
    'Laboratório Cartão de Crédito': 'receita_bruta',
    'Laboratório Cheques à vista': 'receita_bruta',
    'Laboratório Cheques pré': 'receita_bruta',
    'Laboratoio Pix': 'receita_bruta',
    'Centro Cirúrgico dinheiro/Pix': 'receita_bruta',
    'Centro Cirúrgico cheque': 'receita_bruta',
    'Centro Cirúrgico cartao debito': 'receita_bruta',
    'Centro Cirúrgico cartão de crédito': 'receita_bruta',
    'Centro Cirúrgico cheques pré': 'receita_bruta',
    'Centro Cirúrgico convênio Hap Vida': 'receita_bruta',
    'Centro Cirúrgico convênio Unimed': 'receita_bruta',
    'Receitas totais Cirurgias Hospitais Externos particular': 'receita_bruta',
    'Receitas totais Cirurgias Hospitais Externos HAP VIDA': 'receita_bruta',
    'Receitas totais Cirurgias Hospitais Externos UNIMED': 'receita_bruta',
    'Receita de Aluguel': 'receita_bruta',
  }

/**
 * 30 Despesas Oficiais de Fluxo de Caixa PJ mapeadas nas seções da DRE:
 *
 * 1. CUSTOS DIRETOS (7 itens):
 *    - APLICACAO DE MEDICACAO EXTERNAS
 *    - ESTERILIZAÇÃO
 *    - FORNECEDORES DE OPME
 *    - FORNECEDORES MATERIAS E MEDICAMENTOS
 *    - HONORARIO ANESTESISTA
 *    - LABORATORIO DE APOIO
 *    - REPASSE MEDICO
 *
 * 2. DESPESAS OPERACIONAIS (15 itens):
 *    - Pessoal: SALARIOS
 *    - Ocupação/Administrativas: ALUGUEL EXTERNO, ASSOCIAÇÃO/ENTIDADES E ANUIDADES, COLETA RESIDENCIA,
 *      CONTADOR, COPA, DESPESAS PREDIAIS, MANUTENÇÃO, MATERIAL DE ESCRITORIO, MATERIAL DE LIMPEZA/HIGIENE,
 *      REFEIÇÃO/HOTELARIA, SEGUROS, TELEFONIA/INTERNET
 *    - Comercial/Relacionamento: MARKETING/PROPAGANDA, CONVENIO
 *
 * 3. RESULTADO FINANCEIRO (4 itens):
 *    - DEPOSITOS BANCARIOS
 *    - JUROS BANCARIOS
 *    - TARIFAS BANCARIAS
 *    - EMPRESTIMO
 *
 * 4. TRIBUTOS (3 itens):
 *    - IMPOSTOS FEDERAIS
 *    - IMPOSTOS MUNICIPAIS
 *    - PARCELAMENTO DE IMPOSTOS
 *
 * 5. INVESTIMENTOS / NÃO OPERACIONAL (1 item):
 *    - INVESTIMENTOS
 */
export const DRE_EXPENSE_GROUPS: {
  id: string
  title: string
  section:
    | 'deducoes_receita'
    | 'custos_servicos'
    | 'despesas_operacionais'
    | 'resultado_financeiro'
    | 'tributos'
    | 'investimentos'
  subgroup?: string
  categories: string[]
}[] = [
  // Custos Diretos dos Serviços (CSP)
  {
    id: 'custos_servicos',
    title: 'Custos dos Serviços Prestados (CSP)',
    section: 'custos_servicos',
    categories: [
      'APLICACAO DE MEDICACAO EXTERNAS',
      'ESTERILIZAÇÃO',
      'FORNECEDORES DE OPME',
      'FORNECEDORES MATERIAS E MEDICAMENTOS',
      'HONORARIO ANESTESISTA',
      'LABORATORIO DE APOIO',
      'REPASSE MEDICO',
      // Legadas de CSP para históricos
      'Custo dos Serviços Prestados (competência)',
      'Pagamento de Fornecedores (referência)',
      'Comissão médicos terceiros DR. WANDERSON',
      'Comissão médicos terceiros',
    ],
  },
  // Despesas Operacionais: Pessoal & Folha
  {
    id: 'desp_pessoal',
    title: 'Pessoal & Folha de Pagamento',
    section: 'despesas_operacionais',
    subgroup: 'Pessoal & Folha',
    categories: [
      'SALARIOS',
      // Legadas
      'Salários',
      '13 Salario',
      'Encargos Trabalhistas',
      'Encargos 13 Salario Provisionado',
      'Prolabore',
    ],
  },
  // Despesas Operacionais: Ocupação, Prediais & Administrativas
  {
    id: 'desp_ocupacao_adm',
    title: 'Ocupação, Prediais & Administrativas',
    section: 'despesas_operacionais',
    subgroup: 'Ocupação & Administrativas',
    categories: [
      'ALUGUEL EXTERNO',
      'ASSOCIAÇÃO/ENTIDADES E ANUIDADES',
      'COLETA RESIDENCIA',
      'CONTADOR',
      'COPA',
      'DESPESAS PREDIAIS',
      'MANUTENÇÃO',
      'MATERIAL DE ESCRITORIO',
      'MATERIAL DE LIMPEZA/HIGIENE',
      'REFEIÇÃO/HOTELARIA',
      'SEGUROS',
      'TELEFONIA/INTERNET',
      // Legadas
      'Aluguel',
      'Iptu',
      'Aluguel consultorio Guaira',
      'Energia',
      'Telefone e internet',
      'Água',
      'Manutenção',
      'Higiene/limpeza/cozinha/copa',
      'Correio/papelaria/grafica',
      'Sistema de Informatica',
      'Contador',
      'Seguro',
      'Associação Comercial/crm/outros orgaos',
    ],
  },
  // Despesas Operacionais: Comercial & Marketing
  {
    id: 'desp_comerciais',
    title: 'Comercial, Marketing & Relacionamento',
    section: 'despesas_operacionais',
    subgroup: 'Comercial & Marketing',
    categories: [
      'MARKETING/PROPAGANDA',
      'CONVENIO',
      // Legadas
      'Consultoria/Marketing',
      'Curso e Especializações',
    ],
  },
  // Resultado Financeiro
  {
    id: 'resultado_financeiro',
    title: 'Resultado Financeiro (Juros, Tarifas, Depósitos & Empréstimos)',
    section: 'resultado_financeiro',
    categories: [
      'DEPOSITOS BANCARIOS',
      'JUROS BANCARIOS',
      'TARIFAS BANCARIAS',
      'EMPRESTIMO',
      // Legadas
      'Comissão dos cartões',
      'Financiamentos',
      'Empréstimos',
      'Juros / Antecipação',
    ],
  },
  // Tributos
  {
    id: 'tributos',
    title: 'Tributos (Federais, Municipais & Parcelamentos)',
    section: 'tributos',
    categories: [
      'IMPOSTOS FEDERAIS',
      'IMPOSTOS MUNICIPAIS',
      'PARCELAMENTO DE IMPOSTOS',
      // Legadas
      'Impostos Federais (DARFs)',
      'Impostos sobre SERVIÇOS - ISS',
    ],
  },
  // Investimentos / Não Operacional
  {
    id: 'investimentos',
    title: 'Investimentos & Aplicações',
    section: 'investimentos',
    categories: ['INVESTIMENTOS', 'Bens'],
  },
]

export interface ServiceBreakdown {
  [serviceName: string]: number
  sem_servico: number
  total: number
}

export interface DRECategoryRow {
  category: string
  total: number
  byService: Record<string, number> // service -> amount
  semServico: number
  count: number
  isLegacyOrUnmapped?: boolean
}

export interface DREGroupResult {
  id: string
  title: string
  section: string
  subgroup?: string
  total: number
  byService: Record<string, number>
  semServico: number
  rows: DRECategoryRow[]
}

export interface DREServiceSummary {
  serviceName: string
  receita: number
  custosDespesas: number
  resultado: number
  margem: number
}

export interface DREResult {
  periodLabel: string
  totalTransactionsPJ: number

  // 1. Receita Bruta
  receitaBruta: number
  receitaBrutaRows: DRECategoryRow[]
  receitaBrutaByService: Record<string, number>

  // 2. Deduções de Receita
  deducoesReceita: number
  deducoesRows: DRECategoryRow[]
  deducoesByService: Record<string, number>

  // 3. Receita Líquida
  receitaLiquida: number
  receitaLiquidaByService: Record<string, number>

  // 4. Custos dos Serviços (CSP)
  custosServicos: number
  custosServicosRows: DRECategoryRow[]
  custosServicosByService: Record<string, number>

  // 5. Lucro Bruto
  lucroBruto: number
  lucroBrutoByService: Record<string, number>

  // 6. Despesas Operacionais
  despesasOperacionais: number
  despesasOperacionaisGroups: DREGroupResult[]
  despesasOperacionaisByService: Record<string, number>

  // 7. Resultado Operacional (Lucro Bruto - Despesas Operacionais)
  resultadoOperacional: number
  resultadoOperacionalByService: Record<string, number>

  // 8. Resultado Financeiro (saídas financeiras)
  resultadoFinanceiro: number
  resultadoFinanceiroRows: DRECategoryRow[]
  resultadoFinanceiroByService: Record<string, number>

  // 9. Tributos
  tributos: number
  tributosRows: DRECategoryRow[]
  tributosByService: Record<string, number>

  // 10. Investimentos / Não Operacional
  investimentos: number
  investimentosRows: DRECategoryRow[]
  investimentosByService: Record<string, number>

  // 11. Lucro Líquido do Período
  lucroLiquido: number
  lucroLiquidoByService: Record<string, number>

  // Categorias antigas ou não mapeadas (para visibilidade de histórico)
  outrasNaoMapeadasTotal: number
  outrasNaoMapeadasRows: DRECategoryRow[]

  // Resumo por Serviço (mini-tabela dos 6 serviços fixos)
  serviceSummaries: DREServiceSummary[]
}

function initServiceMap(): Record<string, number> {
  const map: Record<string, number> = {
    'Sem serviço': 0,
  }
  for (const s of SERVICES_PJ) {
    map[s] = 0
  }
  return map
}

function addToServiceMap(map: Record<string, number>, servico: string | undefined, amount: number) {
  const s = servico && SERVICES_PJ.includes(servico as ServicePJ) ? servico : 'Sem serviço'
  map[s] = (map[s] || 0) + amount
}

/**
 * Normaliza strings de categoria para comparação case-insensitive sem acentos espúrios,
 * mantendo a chave original de retorno.
 */
function normalizeCategoryKey(cat: string): string {
  return cat.trim().toUpperCase()
}

/**
 * Calcula a DRE completa para um conjunto de transações e período selecionado.
 * FILTRO RÍGIDO: Somente transações com entity === 'pj' são consideradas.
 */
export function calculateDRE(
  allTransactions: Transaction[],
  period: { mode: 'month' | 'year'; monthKey?: string; year?: number },
): DREResult {
  // 1. Filtrar ESTRITAMENTE PJ (decisão do usuário: PF nunca entra na DRE)
  const pjTransactions = allTransactions.filter((t) => t.entity === 'pj')

  // 2. Filtrar por período
  const filtered = pjTransactions.filter((t) => {
    if (!t.date) return false
    const dateStr = t.date.slice(0, 10)
    if (period.mode === 'month') {
      const targetMonth = period.monthKey || new Date().toISOString().slice(0, 7)
      return dateStr.startsWith(targetMonth)
    } else {
      const targetYear = String(period.year || new Date().getFullYear())
      return dateStr.startsWith(targetYear)
    }
  })

  // Agrupar transações por categoria mantendo o casing original
  const incomeByCategory = new Map<
    string,
    { total: number; byService: Record<string, number>; count: number }
  >()
  const expenseByCategory = new Map<
    string,
    { total: number; byService: Record<string, number>; count: number }
  >()

  for (const t of filtered) {
    const map = t.type === 'income' ? incomeByCategory : expenseByCategory
    const cat =
      (t.category || '').trim() || (t.type === 'income' ? 'Outras Receitas' : 'Outras Despesas')
    const current = map.get(cat) || {
      total: 0,
      byService: initServiceMap(),
      count: 0,
    }
    current.total += t.amount
    current.count += 1
    addToServiceMap(current.byService, t.servico, t.amount)
    map.set(cat, current)
  }

  // Helper para construir DRECategoryRow
  const buildRow = (
    cat: string,
    data?: { total: number; byService: Record<string, number>; count: number },
    isLegacyOrUnmapped = false,
  ): DRECategoryRow => {
    return {
      category: cat,
      total: data ? data.total : 0,
      byService: data ? { ...data.byService } : initServiceMap(),
      semServico: data ? data.byService['Sem serviço'] || 0 : 0,
      count: data ? data.count : 0,
      isLegacyOrUnmapped,
    }
  }

  // 1. RECEITA BRUTA & DEDUÇÕES DE RECEITA
  let receitaBruta = 0
  const receitaBrutaByService = initServiceMap()
  const receitaBrutaRows: DRECategoryRow[] = []

  let deducoesReceita = 0
  const deducoesByService = initServiceMap()
  const deducoesRows: DRECategoryRow[] = []

  // Constrói mapa indexado em uppercase para matching robusto
  const revenueMappingUpper = new Map<string, 'receita_bruta' | 'deducoes_receita'>()
  Object.entries(DRE_REVENUE_CATEGORIES_MAPPING).forEach(([k, v]) => {
    revenueMappingUpper.set(normalizeCategoryKey(k), v)
  })

  // Conjunto de categorias de receita oficiais atuais
  const officialIncomeSetUpper = new Set(CATEGORIES_PJ.income.map(normalizeCategoryKey))

  // Percorre todas as categorias de receita encontradas nas transações + padrão da PJ
  const allIncomeCategoryKeys = new Set([
    ...CATEGORIES_PJ.income,
    ...Array.from(incomeByCategory.keys()),
  ])

  allIncomeCategoryKeys.forEach((cat) => {
    const data = incomeByCategory.get(cat)
    if (!data || data.total === 0) return

    const norm = normalizeCategoryKey(cat)
    const targetGroup = revenueMappingUpper.get(norm) || 'receita_bruta'
    const isLegacy = !officialIncomeSetUpper.has(norm)

    const row = buildRow(cat, data, isLegacy)
    if (targetGroup === 'receita_bruta') {
      receitaBruta += row.total
      for (const [s, amt] of Object.entries(row.byService)) {
        receitaBrutaByService[s] = (receitaBrutaByService[s] || 0) + amt
      }
      receitaBrutaRows.push(row)
    } else {
      deducoesReceita += row.total
      for (const [s, amt] of Object.entries(row.byService)) {
        deducoesByService[s] = (deducoesByService[s] || 0) + amt
      }
      deducoesRows.push(row)
    }
  })

  // Ordenar linhas de receita bruta: primeiro as 8 oficiais na ordem do constants, depois legadas/outras
  receitaBrutaRows.sort((a, b) => {
    const idxA = CATEGORIES_PJ.income.findIndex(
      (c) => normalizeCategoryKey(c) === normalizeCategoryKey(a.category),
    )
    const idxB = CATEGORIES_PJ.income.findIndex(
      (c) => normalizeCategoryKey(c) === normalizeCategoryKey(b.category),
    )
    if (idxA !== -1 && idxB !== -1) return idxA - idxB
    if (idxA !== -1) return -1
    if (idxB !== -1) return 1
    return b.total - a.total
  })

  // 3. RECEITA LÍQUIDA = Receita Bruta - Deduções
  const receitaLiquida = receitaBruta - deducoesReceita
  const receitaLiquidaByService = initServiceMap()
  for (const s of [...SERVICES_PJ, 'Sem serviço']) {
    receitaLiquidaByService[s] = (receitaBrutaByService[s] || 0) - (deducoesByService[s] || 0)
  }

  // Mapa de despesas pendentes de alocação (para garantir que nada fique de fora)
  const pendingExpenses = new Map(expenseByCategory)

  // Helper para buscar e extrair despesas que casem com a lista de categorias do grupo
  const extractCategoriesForGroup = (categoriesList: string[]) => {
    const matchedRows: DRECategoryRow[] = []
    let subtotal = 0
    const bySrv = initServiceMap()

    const targetSetUpper = new Set(categoriesList.map(normalizeCategoryKey))
    const officialExpenseSetUpper = new Set(CATEGORIES_PJ.expense.map(normalizeCategoryKey))

    for (const [catName, data] of Array.from(pendingExpenses.entries())) {
      if (targetSetUpper.has(normalizeCategoryKey(catName)) && data.total > 0) {
        const isLegacy = !officialExpenseSetUpper.has(normalizeCategoryKey(catName))
        const row = buildRow(catName, data, isLegacy)
        matchedRows.push(row)
        subtotal += row.total
        for (const [s, amt] of Object.entries(row.byService)) {
          bySrv[s] = (bySrv[s] || 0) + amt
        }
        pendingExpenses.delete(catName)
      }
    }

    // Ordenar de acordo com a ordem da lista de categorias original
    matchedRows.sort((a, b) => {
      const idxA = categoriesList.findIndex(
        (c) => normalizeCategoryKey(c) === normalizeCategoryKey(a.category),
      )
      const idxB = categoriesList.findIndex(
        (c) => normalizeCategoryKey(c) === normalizeCategoryKey(b.category),
      )
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return b.total - a.total
    })

    return { matchedRows, subtotal, bySrv }
  }

  // 4. CUSTOS DOS SERVIÇOS PRESTADOS (CSP)
  let custosServicos = 0
  const custosServicosByService = initServiceMap()
  const custosServicosRows: DRECategoryRow[] = []

  const cspDef = DRE_EXPENSE_GROUPS.find((g) => g.id === 'custos_servicos')!
  const cspExtraction = extractCategoriesForGroup(cspDef.categories)
  custosServicos = cspExtraction.subtotal
  custosServicosRows.push(...cspExtraction.matchedRows)
  for (const [s, amt] of Object.entries(cspExtraction.bySrv)) {
    custosServicosByService[s] = (custosServicosByService[s] || 0) + amt
  }

  // 5. LUCRO BRUTO = Receita Líquida - Custos dos Serviços
  const lucroBruto = receitaLiquida - custosServicos
  const lucroBrutoByService = initServiceMap()
  for (const s of [...SERVICES_PJ, 'Sem serviço']) {
    lucroBrutoByService[s] = (receitaLiquidaByService[s] || 0) - (custosServicosByService[s] || 0)
  }

  // 6. DESPESAS OPERACIONAIS (subgrupos: Pessoal, Ocupação & Administrativas, Comercial & Marketing)
  let despesasOperacionais = 0
  const despesasOperacionaisByService = initServiceMap()
  const despesasOperacionaisGroups: DREGroupResult[] = []

  const operationalGroupsDef = DRE_EXPENSE_GROUPS.filter(
    (g) => g.section === 'despesas_operacionais',
  )

  operationalGroupsDef.forEach((grp) => {
    const extraction = extractCategoriesForGroup(grp.categories)
    if (extraction.matchedRows.length > 0) {
      despesasOperacionais += extraction.subtotal
      for (const [s, amt] of Object.entries(extraction.bySrv)) {
        despesasOperacionaisByService[s] = (despesasOperacionaisByService[s] || 0) + amt
      }
      despesasOperacionaisGroups.push({
        id: grp.id,
        title: grp.title,
        section: grp.section,
        subgroup: grp.subgroup,
        total: extraction.subtotal,
        byService: extraction.bySrv,
        semServico: extraction.bySrv['Sem serviço'] || 0,
        rows: extraction.matchedRows,
      })
    }
  })

  // 7. RESULTADO FINANCEIRO (Juros, Tarifas, Depósitos & Empréstimos)
  let resultadoFinanceiro = 0
  const resultadoFinanceiroByService = initServiceMap()
  const resultadoFinanceiroRows: DRECategoryRow[] = []

  const finDef = DRE_EXPENSE_GROUPS.find((g) => g.id === 'resultado_financeiro')!
  const finExtraction = extractCategoriesForGroup(finDef.categories)
  resultadoFinanceiro = finExtraction.subtotal
  resultadoFinanceiroRows.push(...finExtraction.matchedRows)
  for (const [s, amt] of Object.entries(finExtraction.bySrv)) {
    resultadoFinanceiroByService[s] = (resultadoFinanceiroByService[s] || 0) + amt
  }

  // 8. TRIBUTOS (Impostos Federais, Municipais, Parcelamentos)
  let tributos = 0
  const tributosByService = initServiceMap()
  const tributosRows: DRECategoryRow[] = []

  const tribDef = DRE_EXPENSE_GROUPS.find((g) => g.id === 'tributos')!
  const tribExtraction = extractCategoriesForGroup(tribDef.categories)
  tributos = tribExtraction.subtotal
  tributosRows.push(...tribExtraction.matchedRows)
  for (const [s, amt] of Object.entries(tribExtraction.bySrv)) {
    tributosByService[s] = (tributosByService[s] || 0) + amt
  }

  // 9. INVESTIMENTOS / NÃO OPERACIONAL
  let investimentos = 0
  const investimentosByService = initServiceMap()
  const investimentosRows: DRECategoryRow[] = []

  const invDef = DRE_EXPENSE_GROUPS.find((g) => g.id === 'investimentos')!
  const invExtraction = extractCategoriesForGroup(invDef.categories)
  investimentos = invExtraction.subtotal
  investimentosRows.push(...invExtraction.matchedRows)
  for (const [s, amt] of Object.entries(invExtraction.bySrv)) {
    investimentosByService[s] = (investimentosByService[s] || 0) + amt
  }

  // REQUISITO 5: Lançamentos históricos gravados com categorias antigas ou despesas não mapeadas.
  // NENHUMA categoria PJ pode ficar de fora dos totais.
  // Se ainda houver despesas em pendingExpenses, alocamos na linha "Outras Despesas / Não Mapeadas"
  // que entra nas despesas operacionais da DRE garantindo fechamento 100% exato.
  let outrasNaoMapeadasTotal = 0
  const outrasNaoMapeadasByService = initServiceMap()
  const outrasNaoMapeadasRows: DRECategoryRow[] = []

  if (pendingExpenses.size > 0) {
    pendingExpenses.forEach((data, cat) => {
      if (data.total > 0) {
        const row = buildRow(cat, data, true)
        outrasNaoMapeadasTotal += row.total
        for (const [s, amt] of Object.entries(row.byService)) {
          outrasNaoMapeadasByService[s] = (outrasNaoMapeadasByService[s] || 0) + amt
          despesasOperacionaisByService[s] = (despesasOperacionaisByService[s] || 0) + amt
        }
        outrasNaoMapeadasRows.push(row)
      }
    })

    if (outrasNaoMapeadasRows.length > 0) {
      despesasOperacionais += outrasNaoMapeadasTotal
      despesasOperacionaisGroups.push({
        id: 'desp_outras_nao_mapeadas',
        title: 'Outras Despesas / Históricas Não Mapeadas',
        section: 'despesas_operacionais',
        subgroup: 'Outras / Não Mapeadas',
        total: outrasNaoMapeadasTotal,
        byService: outrasNaoMapeadasByService,
        semServico: outrasNaoMapeadasByService['Sem serviço'] || 0,
        rows: outrasNaoMapeadasRows,
      })
    }
  }

  // 7. RESULTADO OPERACIONAL = Lucro Bruto - Despesas Operacionais
  const resultadoOperacional = lucroBruto - despesasOperacionais
  const resultadoOperacionalByService = initServiceMap()
  for (const s of [...SERVICES_PJ, 'Sem serviço']) {
    resultadoOperacionalByService[s] =
      (lucroBrutoByService[s] || 0) - (despesasOperacionaisByService[s] || 0)
  }

  // 11. LUCRO LÍQUIDO DO PERÍODO
  // = Resultado Operacional - Resultado Financeiro - Tributos - Investimentos
  const lucroLiquido = resultadoOperacional - resultadoFinanceiro - tributos - investimentos
  const lucroLiquidoByService = initServiceMap()
  for (const s of [...SERVICES_PJ, 'Sem serviço']) {
    lucroLiquidoByService[s] =
      (resultadoOperacionalByService[s] || 0) -
      (resultadoFinanceiroByService[s] || 0) -
      (tributosByService[s] || 0) -
      (investimentosByService[s] || 0)
  }

  // Resumo por Serviço (mini-tabela consolidada dos 6 serviços fixos)
  const serviceSummaries: DREServiceSummary[] = []
  const allServiceKeys: string[] = [...SERVICES_PJ, 'Sem serviço / Geral']

  for (const srvKey of allServiceKeys) {
    const rawKey = srvKey.startsWith('Sem serviço') ? 'Sem serviço' : srvKey
    const receita = receitaBrutaByService[rawKey] || 0
    const custosDespesas =
      (deducoesByService[rawKey] || 0) +
      (custosServicosByService[rawKey] || 0) +
      (despesasOperacionaisByService[rawKey] || 0) +
      (resultadoFinanceiroByService[rawKey] || 0) +
      (tributosByService[rawKey] || 0) +
      (investimentosByService[rawKey] || 0)
    const resultado = receita - custosDespesas
    const margem = receita > 0 ? (resultado / receita) * 100 : 0

    serviceSummaries.push({
      serviceName: srvKey,
      receita,
      custosDespesas,
      resultado,
      margem,
    })
  }

  // Label do período
  let periodLabel = ''
  if (period.mode === 'month') {
    const ym = period.monthKey || new Date().toISOString().slice(0, 7)
    const [y, m] = ym.split('-')
    const monthNames = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ]
    periodLabel = `${monthNames[parseInt(m, 10) - 1]} de ${y}`
  } else {
    periodLabel = `Ano ${period.year || new Date().getFullYear()} Completo`
  }

  return {
    periodLabel,
    totalTransactionsPJ: filtered.length,
    receitaBruta,
    receitaBrutaRows,
    receitaBrutaByService,
    deducoesReceita,
    deducoesRows,
    deducoesByService,
    receitaLiquida,
    receitaLiquidaByService,
    custosServicos,
    custosServicosRows,
    custosServicosByService,
    lucroBruto,
    lucroBrutoByService,
    despesasOperacionais,
    despesasOperacionaisGroups,
    despesasOperacionaisByService,
    resultadoOperacional,
    resultadoOperacionalByService,
    resultadoFinanceiro,
    resultadoFinanceiroRows,
    resultadoFinanceiroByService,
    tributos,
    tributosRows,
    tributosByService,
    investimentos,
    investimentosRows,
    investimentosByService,
    lucroLiquido,
    lucroLiquidoByService,
    outrasNaoMapeadasTotal,
    outrasNaoMapeadasRows,
    serviceSummaries,
  }
}

/**
 * Exporta a DRE em formato CSV compatível com Excel brasileiro (; delimitador, vírgula decimal)
 */
export function exportDREToCSV(dre: DREResult): void {
  const headers = [
    'Estrutura Contábil',
    'Categoria',
    'Total (R$)',
    ...SERVICES_PJ.map((s) => `${s} (R$)`),
    'Sem serviço / Geral (R$)',
  ]

  const formatNum = (n: number) => n.toFixed(2).replace('.', ',')

  const rows: string[][] = []

  const addRow = (
    structure: string,
    category: string,
    total: number,
    byService: Record<string, number>,
  ) => {
    rows.push([
      `"${structure}"`,
      `"${category}"`,
      `"${formatNum(total)}"`,
      ...SERVICES_PJ.map((s) => `"${formatNum(byService[s] || 0)}"`),
      `"${formatNum(byService['Sem serviço'] || 0)}"`,
    ])
  }

  // 1. Receita Bruta
  addRow(
    '1. RECEITA BRUTA',
    'Total Receita Bruta (Entradas)',
    dre.receitaBruta,
    dre.receitaBrutaByService,
  )
  dre.receitaBrutaRows.forEach((r) => {
    addRow('  Receita Bruta (detalhe)', r.category, r.total, r.byService)
  })

  // 2. Deduções
  if (dre.deducoesReceita > 0 || dre.deducoesRows.length > 0) {
    addRow(
      '2. (-) DEDUÇÕES DE RECEITA',
      'Total Deduções',
      -dre.deducoesReceita,
      dre.deducoesByService,
    )
    dre.deducoesRows.forEach((r) => {
      addRow('  Dedução (detalhe)', r.category, -r.total, r.byService)
    })
  }

  // 3. Receita Líquida
  addRow(
    '3. (=) RECEITA LÍQUIDA',
    'Receita Líquida Operacional',
    dre.receitaLiquida,
    dre.receitaLiquidaByService,
  )

  // 4. Custos dos Serviços (CSP)
  addRow(
    '4. (-) CUSTOS DOS SERVIÇOS (CSP)',
    'Total Custos dos Serviços',
    -dre.custosServicos,
    dre.custosServicosByService,
  )
  dre.custosServicosRows.forEach((r) => {
    addRow('  Custo Direto (detalhe)', r.category, -r.total, r.byService)
  })

  // 5. Lucro Bruto
  addRow('5. (=) LUCRO BRUTO', 'Lucro Bruto Operacional', dre.lucroBruto, dre.lucroBrutoByService)

  // 6. Despesas Operacionais
  addRow(
    '6. (-) DESPESAS OPERACIONAIS',
    'Total Despesas Operacionais',
    -dre.despesasOperacionais,
    dre.despesasOperacionaisByService,
  )
  dre.despesasOperacionaisGroups.forEach((grp) => {
    addRow(`  Grupo: ${grp.title}`, 'Subtotal do Grupo', -grp.total, grp.byService)
    grp.rows.forEach((r) => {
      addRow(`    ${grp.subgroup || 'Operacional'}`, r.category, -r.total, r.byService)
    })
  })

  // 7. Resultado Operacional
  addRow(
    '(=) RESULTADO OPERACIONAL',
    'Antes de Financeiro, Tributos e Investimentos',
    dre.resultadoOperacional,
    dre.resultadoOperacionalByService,
  )

  // 8. Resultado Financeiro
  addRow(
    '7. (-) RESULTADO FINANCEIRO',
    'Juros, Tarifas, Depósitos & Empréstimos',
    -dre.resultadoFinanceiro,
    dre.resultadoFinanceiroByService,
  )
  dre.resultadoFinanceiroRows.forEach((r) => {
    addRow('  Despesa Financeira (detalhe)', r.category, -r.total, r.byService)
  })

  // 9. Tributos
  addRow(
    '8. (-) TRIBUTOS',
    'Federais, Municipais & Parcelamentos',
    -dre.tributos,
    dre.tributosByService,
  )
  dre.tributosRows.forEach((r) => {
    addRow('  Tributo (detalhe)', r.category, -r.total, r.byService)
  })

  // 10. Investimentos / Não Operacional
  if (dre.investimentos > 0 || dre.investimentosRows.length > 0) {
    addRow(
      '9. (-) INVESTIMENTOS / NÃO OPERACIONAL',
      'Investimentos & Aplicações',
      -dre.investimentos,
      dre.investimentosByService,
    )
    dre.investimentosRows.forEach((r) => {
      addRow('  Investimento (detalhe)', r.category, -r.total, r.byService)
    })
  }

  // 11. Lucro Líquido
  addRow(
    '10. (=) LUCRO LÍQUIDO DO PERÍODO',
    'Resultado Líquido Final',
    dre.lucroLiquido,
    dre.lucroLiquidoByService,
  )

  // Resumo por Serviço no fim do arquivo
  rows.push([])
  rows.push(['--- RESUMO POR SERVIÇO / CENTRO DE CUSTO ---'])
  rows.push([
    'Serviço',
    'Receitas (R$)',
    'Custos & Despesas (R$)',
    'Resultado Líquido (R$)',
    'Margem (%)',
  ])
  dre.serviceSummaries.forEach((s) => {
    rows.push([
      `"${s.serviceName}"`,
      `"${formatNum(s.receita)}"`,
      `"${formatNum(s.custosDespesas)}"`,
      `"${formatNum(s.resultado)}"`,
      `"${s.margem.toFixed(1).replace('.', ',')}%"`,
    ])
  })

  const csvContent =
    '\uFEFF' +
    [headers.map((h) => `"${h}"`).join(';'), ...rows.map((r) => r.join(';'))].join('\r\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute(
    'download',
    `DRE_Rubra_${dre.periodLabel.replace(/\s+/g, '_')}_${Date.now()}.csv`,
  )
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
