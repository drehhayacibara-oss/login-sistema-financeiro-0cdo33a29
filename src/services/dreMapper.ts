import { CATEGORIES_PJ, SERVICES_PJ, type ServicePJ } from '@/constants/categories'
import type { Transaction } from './transactions'

/**
 * ============================================================================
 * MAPEAMENTO OFICIAL DRE (Demonstração do Resultado do Exercício) - RUBRA
 * ============================================================================
 * REGRA CENTRAL DE NEGÓCIO: A DRE é EXCLUSIVAMENTE da Pessoa Jurídica (PJ).
 * Nenhuma movimentação de PF entra nestes cálculos sob qualquer hipótese.
 *
 * Estrutura contábil encadeada:
 * 1. RECEITA BRUTA: soma de todas as receitas de vendas/serviços PJ
 * 2. (-) DEDUÇÕES DE RECEITA: impostos sobre serviços e devoluções/descontos
 * 3. (=) RECEITA LÍQUIDA
 * 4. (-) CUSTOS DOS SERVIÇOS PRESTADOS (CSP): custos diretos hospitalares/insumos
 * 5. (=) LUCRO BRUTO
 * 6. (-) DESPESAS OPERACIONAIS:
 *      6.1 Pessoal & Folha
 *      6.2 Administrativas & Ocupação
 *      6.3 Comerciais & Marketing
 *      6.4 Outras Despesas Operacionais
 * 7. (+/-) RESULTADO FINANCEIRO: Juros, financiamentos, antecipações e taxas
 * 8. (-) IMPOSTOS FEDERAIS / TRIBUTOS FINAIS: DARFs, IR, etc.
 * 9. (=) LUCRO LÍQUIDO DO PERÍODO
 * ============================================================================
 */

export type DRESectionType =
  | 'receita_bruta'
  | 'deducoes_receita'
  | 'custos_servicos'
  | 'despesas_operacionais'
  | 'resultado_financeiro'
  | 'impostos_finais'

export interface DRESubgroup {
  id: string
  title: string
  categories: string[]
}

/**
 * Mapeamento das 31 categorias de RECEITA PJ:
 * - A maioria é Receita Bruta (Consultas, Procedimentos, Laboratório, Centro Cirúrgico, Cirurgias Externas, Aluguel).
 * - Se houver deduções, impostos sobre venda ou descontos, mapear em deducoes_receita.
 */
export const DRE_REVENUE_CATEGORIES_MAPPING: Record<string, 'receita_bruta' | 'deducoes_receita'> =
  {
    // Receita de Aluguel e atendimentos entram na Receita Bruta operacional
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
 * Mapeamento das 33 categorias de DESPESA PJ em grupos e subgrupos da DRE:
 * - Deduções sobre receita: 'Impostos sobre SERVIÇOS - ISS'
 * - Custos dos Serviços: 'Custo dos Serviços Prestados (competência)', 'Pagamento de Fornecedores (referência)',
 *                       'Comissão médicos terceiros DR. WANDERSON', 'Comissão médicos terceiros'
 * - Despesas Operacionais:
 *      * Pessoal / Folha: Salários, 13 Salario, Encargos Trabalhistas, Encargos 13 Salario Provisionado, Prolabore
 *      * Ocupação / Administrativas: Aluguel, Iptu, Aluguel consultorio Guaira, Energia, Telefone e internet,
 *                                   Água, Manutenção, Higiene/limpeza/cozinha/copa, Correio/papelaria/grafica,
 *                                   Sistema de Informatica, Contador, Seguro, Associação Comercial/crm/outros orgaos
 *      * Comerciais & Marketing: Consultoria/Marketing, Curso e Especializações
 *      * Outras Operacionais: Outros Fixos, Outros Variaveis, Bens
 * - Resultado Financeiro: Comissão dos cartões, Financiamentos, Empréstimos, Juros / Antecipação
 * - Impostos Federais: Impostos Federais (DARFs)
 */
export const DRE_EXPENSE_GROUPS: {
  id: string
  title: string
  section:
    | 'deducoes_receita'
    | 'custos_servicos'
    | 'despesas_operacionais'
    | 'resultado_financeiro'
    | 'impostos_finais'
  subgroup?: string
  categories: string[]
}[] = [
  {
    id: 'deducoes',
    title: 'Deduções de Receita & ISS',
    section: 'deducoes_receita',
    categories: ['Impostos sobre SERVIÇOS - ISS'],
  },
  {
    id: 'custos_servicos',
    title: 'Custos dos Serviços Prestados (CSP)',
    section: 'custos_servicos',
    categories: [
      'Custo dos Serviços Prestados (competência)',
      'Pagamento de Fornecedores (referência)',
      'Comissão médicos terceiros DR. WANDERSON',
      'Comissão médicos terceiros',
    ],
  },
  {
    id: 'desp_pessoal',
    title: 'Pessoal & Folha de Pagamento',
    section: 'despesas_operacionais',
    subgroup: 'Pessoal & Folha',
    categories: [
      'Salários',
      '13 Salario',
      'Encargos Trabalhistas',
      'Encargos 13 Salario Provisionado',
      'Prolabore',
    ],
  },
  {
    id: 'desp_ocupacao_adm',
    title: 'Ocupação & Administrativas',
    section: 'despesas_operacionais',
    subgroup: 'Ocupação & Administrativas',
    categories: [
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
  {
    id: 'desp_comerciais',
    title: 'Comerciais & Marketing',
    section: 'despesas_operacionais',
    subgroup: 'Comerciais & Marketing',
    categories: ['Consultoria/Marketing', 'Curso e Especializações'],
  },
  {
    id: 'desp_outras',
    title: 'Outras Despesas Operacionais',
    section: 'despesas_operacionais',
    subgroup: 'Outras',
    categories: ['Outros Fixos', 'Outros Variaveis', 'Bens'],
  },
  {
    id: 'resultado_financeiro',
    title: 'Despesas Financeiras (Taxas, Juros & Empréstimos)',
    section: 'resultado_financeiro',
    categories: ['Comissão dos cartões', 'Financiamentos', 'Empréstimos', 'Juros / Antecipação'],
  },
  {
    id: 'impostos_finais',
    title: 'Tributos Federais (DARFs / IRPJ)',
    section: 'impostos_finais',
    categories: ['Impostos Federais (DARFs)'],
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

  // 2. Deduções
  deducoesReceita: number
  deducoesRows: DRECategoryRow[]
  deducoesByService: Record<string, number>

  // 3. Receita Líquida
  receitaLiquida: number
  receitaLiquidaByService: Record<string, number>

  // 4. Custos dos Serviços
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

  // Resultado Operacional (antes do financeiro e impostos finais)
  resultadoOperacional: number
  resultadoOperacionalByService: Record<string, number>

  // 7. Resultado Financeiro
  resultadoFinanceiro: number // despesas financeiras (saídas)
  resultadoFinanceiroRows: DRECategoryRow[]
  resultadoFinanceiroByService: Record<string, number>

  // 8. Impostos Finais
  impostosFinais: number
  impostosFinaisRows: DRECategoryRow[]
  impostosFinaisByService: Record<string, number>

  // 9. Lucro Líquido
  lucroLiquido: number
  lucroLiquidoByService: Record<string, number>

  // Resumo por Serviço (mini-tabela)
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
 * Calcula a DRE completa para um conjunto de transações e período selecionado.
 * FILTRO RÍGIDO: Somente transações com entity === 'pj' são consideradas.
 */
export function calculateDRE(
  allTransactions: Transaction[],
  period: { mode: 'month' | 'year'; monthKey?: string; year?: number },
): DREResult {
  // 1. Filtrar ESTRITAMENTE PJ
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

  // Agrupar transações por categoria
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
    const cat = t.category || (t.type === 'income' ? 'Outras Receitas' : 'Outros Variaveis')
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
  ): DRECategoryRow => {
    return {
      category: cat,
      total: data ? data.total : 0,
      byService: data ? { ...data.byService } : initServiceMap(),
      semServico: data ? data.byService['Sem serviço'] || 0 : 0,
      count: data ? data.count : 0,
    }
  }

  // 1. RECEITA BRUTA & DEDUÇÕES DE RECEITA
  let receitaBruta = 0
  const receitaBrutaByService = initServiceMap()
  const receitaBrutaRows: DRECategoryRow[] = []

  let deducoesReceita = 0
  const deducoesByService = initServiceMap()
  const deducoesRows: DRECategoryRow[] = []

  // Percorre todas as categorias de receita encontradas + categorias padrão cadastradas
  const allIncomeCategoryKeys = new Set([
    ...CATEGORIES_PJ.income,
    ...Array.from(incomeByCategory.keys()),
  ])

  allIncomeCategoryKeys.forEach((cat) => {
    const data = incomeByCategory.get(cat)
    if (!data || data.total === 0) return // omitir linhas com 0 no período para clareza
    const targetGroup = DRE_REVENUE_CATEGORIES_MAPPING[cat] || 'receita_bruta'

    const row = buildRow(cat, data)
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

  // 2. DEDUÇÕES vindas de despesa (ex: Impostos sobre SERVIÇOS - ISS)
  const issData = expenseByCategory.get('Impostos sobre SERVIÇOS - ISS')
  if (issData && issData.total > 0) {
    const row = buildRow('Impostos sobre SERVIÇOS - ISS', issData)
    deducoesReceita += row.total
    for (const [s, amt] of Object.entries(row.byService)) {
      deducoesByService[s] = (deducoesByService[s] || 0) + amt
    }
    deducoesRows.push(row)
    expenseByCategory.delete('Impostos sobre SERVIÇOS - ISS')
  }

  // 3. RECEITA LÍQUIDA = Receita Bruta - Deduções
  const receitaLiquida = receitaBruta - deducoesReceita
  const receitaLiquidaByService = initServiceMap()
  for (const s of [...SERVICES_PJ, 'Sem serviço']) {
    receitaLiquidaByService[s] = (receitaBrutaByService[s] || 0) - (deducoesByService[s] || 0)
  }

  // 4. CUSTOS DOS SERVIÇOS PRESTADOS
  let custosServicos = 0
  const custosServicosByService = initServiceMap()
  const custosServicosRows: DRECategoryRow[] = []

  const cspGroup = DRE_EXPENSE_GROUPS.find((g) => g.id === 'custos_servicos')!
  cspGroup.categories.forEach((cat) => {
    const data = expenseByCategory.get(cat)
    if (data && data.total > 0) {
      const row = buildRow(cat, data)
      custosServicos += row.total
      for (const [s, amt] of Object.entries(row.byService)) {
        custosServicosByService[s] = (custosServicosByService[s] || 0) + amt
      }
      custosServicosRows.push(row)
      expenseByCategory.delete(cat)
    }
  })

  // 5. LUCRO BRUTO = Receita Líquida - Custos dos Serviços
  const lucroBruto = receitaLiquida - custosServicos
  const lucroBrutoByService = initServiceMap()
  for (const s of [...SERVICES_PJ, 'Sem serviço']) {
    lucroBrutoByService[s] = (receitaLiquidaByService[s] || 0) - (custosServicosByService[s] || 0)
  }

  // 6. DESPESAS OPERACIONAIS (agrupadas em subgrupos legíveis)
  let despesasOperacionais = 0
  const despesasOperacionaisByService = initServiceMap()
  const despesasOperacionaisGroups: DREGroupResult[] = []

  const operationalGroupsDef = DRE_EXPENSE_GROUPS.filter(
    (g) => g.section === 'despesas_operacionais',
  )

  operationalGroupsDef.forEach((grp) => {
    let groupTotal = 0
    const groupByService = initServiceMap()
    const groupRows: DRECategoryRow[] = []

    grp.categories.forEach((cat) => {
      const data = expenseByCategory.get(cat)
      if (data && data.total > 0) {
        const row = buildRow(cat, data)
        groupTotal += row.total
        for (const [s, amt] of Object.entries(row.byService)) {
          groupByService[s] = (groupByService[s] || 0) + amt
          despesasOperacionaisByService[s] = (despesasOperacionaisByService[s] || 0) + amt
        }
        groupRows.push(row)
        expenseByCategory.delete(cat)
      }
    })

    if (groupRows.length > 0) {
      despesasOperacionais += groupTotal
      despesasOperacionaisGroups.push({
        id: grp.id,
        title: grp.title,
        section: grp.section,
        subgroup: grp.subgroup,
        total: groupTotal,
        byService: groupByService,
        semServico: groupByService['Sem serviço'] || 0,
        rows: groupRows,
      })
    }
  })

  // 7. RESULTADO FINANCEIRO (Despesas financeiras: comissão cartões, juros, financiamentos)
  let resultadoFinanceiro = 0
  const resultadoFinanceiroByService = initServiceMap()
  const resultadoFinanceiroRows: DRECategoryRow[] = []

  const finGroup = DRE_EXPENSE_GROUPS.find((g) => g.id === 'resultado_financeiro')!
  finGroup.categories.forEach((cat) => {
    const data = expenseByCategory.get(cat)
    if (data && data.total > 0) {
      const row = buildRow(cat, data)
      resultadoFinanceiro += row.total
      for (const [s, amt] of Object.entries(row.byService)) {
        resultadoFinanceiroByService[s] = (resultadoFinanceiroByService[s] || 0) + amt
      }
      resultadoFinanceiroRows.push(row)
      expenseByCategory.delete(cat)
    }
  })

  // 8. IMPOSTOS FINAIS (DARFs, Impostos Federais)
  let impostosFinais = 0
  const impostosFinaisByService = initServiceMap()
  const impostosFinaisRows: DRECategoryRow[] = []

  const impGroup = DRE_EXPENSE_GROUPS.find((g) => g.id === 'impostos_finais')!
  impGroup.categories.forEach((cat) => {
    const data = expenseByCategory.get(cat)
    if (data && data.total > 0) {
      const row = buildRow(cat, data)
      impostosFinais += row.total
      for (const [s, amt] of Object.entries(row.byService)) {
        impostosFinaisByService[s] = (impostosFinaisByService[s] || 0) + amt
      }
      impostosFinaisRows.push(row)
      expenseByCategory.delete(cat)
    }
  })

  // CUIDADO: NENHUMA categoria PJ pode ficar de fora. Se sobrar alguma despesa não mapeada,
  // adicionar automaticamente no grupo "Outras Despesas Operacionais".
  if (expenseByCategory.size > 0) {
    let unmappedTotal = 0
    const unmappedByService = initServiceMap()
    const unmappedRows: DRECategoryRow[] = []

    expenseByCategory.forEach((data, cat) => {
      if (data.total > 0) {
        const row = buildRow(cat, data)
        unmappedTotal += row.total
        for (const [s, amt] of Object.entries(row.byService)) {
          unmappedByService[s] = (unmappedByService[s] || 0) + amt
          despesasOperacionaisByService[s] = (despesasOperacionaisByService[s] || 0) + amt
        }
        unmappedRows.push(row)
      }
    })

    if (unmappedRows.length > 0) {
      despesasOperacionais += unmappedTotal
      const existingOutras = despesasOperacionaisGroups.find((g) => g.id === 'desp_outras')
      if (existingOutras) {
        existingOutras.total += unmappedTotal
        existingOutras.rows.push(...unmappedRows)
        for (const [s, amt] of Object.entries(unmappedByService)) {
          existingOutras.byService[s] = (existingOutras.byService[s] || 0) + amt
        }
      } else {
        despesasOperacionaisGroups.push({
          id: 'desp_outras',
          title: 'Outras Despesas Operacionais',
          section: 'despesas_operacionais',
          subgroup: 'Outras',
          total: unmappedTotal,
          byService: unmappedByService,
          semServico: unmappedByService['Sem serviço'] || 0,
          rows: unmappedRows,
        })
      }
    }
  }

  // Resultado Operacional = Lucro Bruto - Despesas Operacionais
  const resultadoOperacional = lucroBruto - despesasOperacionais
  const resultadoOperacionalByService = initServiceMap()
  for (const s of [...SERVICES_PJ, 'Sem serviço']) {
    resultadoOperacionalByService[s] =
      (lucroBrutoByService[s] || 0) - (despesasOperacionaisByService[s] || 0)
  }

  // 9. LUCRO LÍQUIDO DO PERÍODO = Resultado Operacional - Resultado Financeiro - Impostos Finais
  const lucroLiquido = resultadoOperacional - resultadoFinanceiro - impostosFinais
  const lucroLiquidoByService = initServiceMap()
  for (const s of [...SERVICES_PJ, 'Sem serviço']) {
    lucroLiquidoByService[s] =
      (resultadoOperacionalByService[s] || 0) -
      (resultadoFinanceiroByService[s] || 0) -
      (impostosFinaisByService[s] || 0)
  }

  // Resumo por Serviço (mini-tabela consolidada)
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
      (impostosFinaisByService[rawKey] || 0)
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
    impostosFinais,
    impostosFinaisRows,
    impostosFinaisByService,
    lucroLiquido,
    lucroLiquidoByService,
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
  addRow('1. RECEITA BRUTA', 'Total Receita Bruta', dre.receitaBruta, dre.receitaBrutaByService)
  dre.receitaBrutaRows.forEach((r) => {
    addRow('  Receita Bruta (detalhe)', r.category, r.total, r.byService)
  })

  // 2. Deduções
  addRow(
    '2. (-) DEDUÇÕES DE RECEITA',
    'Total Deduções',
    -dre.deducoesReceita,
    dre.deducoesByService,
  )
  dre.deducoesRows.forEach((r) => {
    addRow('  Dedução (detalhe)', r.category, -r.total, r.byService)
  })

  // 3. Receita Líquida
  addRow(
    '3. (=) RECEITA LÍQUIDA',
    'Receita Líquida Operacional',
    dre.receitaLiquida,
    dre.receitaLiquidaByService,
  )

  // 4. Custos
  addRow(
    '4. (-) CUSTOS DOS SERVIÇOS',
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
    'Antes do Financeiro e Impostos',
    dre.resultadoOperacional,
    dre.resultadoOperacionalByService,
  )

  // 8. Resultado Financeiro
  addRow(
    '7. (-) RESULTADO FINANCEIRO',
    'Total Despesas Financeiras',
    -dre.resultadoFinanceiro,
    dre.resultadoFinanceiroByService,
  )
  dre.resultadoFinanceiroRows.forEach((r) => {
    addRow('  Despesa Financeira (detalhe)', r.category, -r.total, r.byService)
  })

  // 9. Impostos Finais
  addRow(
    '8. (-) TRIBUTOS FEDERAIS',
    'DARFs e IRPJ',
    -dre.impostosFinais,
    dre.impostosFinaisByService,
  )
  dre.impostosFinaisRows.forEach((r) => {
    addRow('  Tributo Federal (detalhe)', r.category, -r.total, r.byService)
  })

  // 10. Lucro Líquido
  addRow(
    '9. (=) LUCRO LÍQUIDO DO PERÍODO',
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
