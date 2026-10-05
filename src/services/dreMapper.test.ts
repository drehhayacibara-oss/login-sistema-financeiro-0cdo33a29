import { describe, it, expect } from 'vitest'
import { calculateDRE } from './dreMapper'
import { CATEGORIES_PJ, SERVICES_PJ } from '@/constants/categories'
import type { Transaction } from './transactions'

describe('DRE Mapper com Novas Categorias PJ de Fluxo de Caixa', () => {
  it('apenas processa transações de Pessoa Jurídica (PJ) e ignora PF rigorosamente', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        type: 'income',
        amount: 1000,
        category: 'PIX',
        date: '2026-04-10',
        entity: 'pj',
        servico: 'CONSULTORIO',
        description: 'Consulta Dr. Edson',
        user: 'user1',
        created: '2026-04-10',
        updated: '2026-04-10',
      },
      {
        id: '2',
        type: 'income',
        amount: 5000,
        category: 'PROLABORE',
        date: '2026-04-10',
        entity: 'pf',
        description: 'Retirada PF',
        user: 'user1',
        created: '2026-04-10',
        updated: '2026-04-10',
      },
      {
        id: '3',
        type: 'expense',
        amount: 2000,
        category: 'FILHOS',
        date: '2026-04-10',
        entity: 'pf',
        description: 'Despesa pessoal',
        user: 'user1',
        created: '2026-04-10',
        updated: '2026-04-10',
      },
    ]

    const result = calculateDRE(transactions, { mode: 'month', monthKey: '2026-04' })
    expect(result.totalTransactionsPJ).toBe(1)
    expect(result.receitaBruta).toBe(1000)
    expect(result.receitaBrutaByService['CONSULTORIO']).toBe(1000)
    expect(result.lucroLiquido).toBe(1000)
  })

  it('remapeia corretamente as 8 receitas de fluxo de caixa como Receita Bruta', () => {
    const incomeTxs: Transaction[] = CATEGORIES_PJ.income.map((cat, idx) => ({
      id: `inc-${idx}`,
      type: 'income',
      amount: 100,
      category: cat,
      date: '2026-05-15',
      entity: 'pj',
      servico: 'CENTRO CIRURGICO',
      description: `Entrada ${cat}`,
      user: 'u1',
      created: '2026-05-15',
      updated: '2026-05-15',
    }))

    const result = calculateDRE(incomeTxs, { mode: 'month', monthKey: '2026-05' })
    expect(result.receitaBruta).toBe(800)
    expect(result.receitaBrutaRows.length).toBe(8)
    expect(result.receitaBrutaByService['CENTRO CIRURGICO']).toBe(800)
  })

  it('remapeia todas as 30 despesas PJ nas seções contábeis corretas sem faltar nenhuma', () => {
    const expenseTxs: Transaction[] = CATEGORIES_PJ.expense.map((cat, idx) => ({
      id: `exp-${idx}`,
      type: 'expense',
      amount: 10,
      category: cat,
      date: '2026-06-01',
      entity: 'pj',
      servico: idx % 2 === 0 ? 'CENTRO CIRURGICO' : 'LITOTRIPSIA',
      description: `Despesa ${cat}`,
      user: 'u1',
      created: '2026-06-01',
      updated: '2026-06-01',
    }))

    const result = calculateDRE(expenseTxs, { mode: 'month', monthKey: '2026-06' })

    // 7 custos diretos * 10 = 70
    expect(result.custosServicos).toBe(70)
    expect(result.custosServicosRows.length).toBe(7)

    // 15 despesas operacionais * 10 = 150
    expect(result.despesasOperacionais).toBe(150)

    // 4 resultado financeiro * 10 = 40
    expect(result.resultadoFinanceiro).toBe(40)
    expect(result.resultadoFinanceiroRows.length).toBe(4)

    // 3 tributos * 10 = 30
    expect(result.tributos).toBe(30)
    expect(result.tributosRows.length).toBe(3)

    // 1 investimento * 10 = 10
    expect(result.investimentos).toBe(10)
    expect(result.investimentosRows.length).toBe(1)

    // Total de despesas: 70 + 150 + 40 + 30 + 10 = 300
    // Lucro Líquido = 0 - 300 = -300
    expect(result.lucroLiquido).toBe(-300)
  })

  it('não perde lançamentos com categorias antigas ou não mapeadas e aloca em outras despesas', () => {
    const transactions: Transaction[] = [
      {
        id: 'old-1',
        type: 'expense',
        amount: 250,
        category: 'Categoria Antiga Desconhecida',
        date: '2026-07-10',
        entity: 'pj',
        servico: 'CLINICA GERAL',
        description: 'Gasto histórico',
        user: 'u1',
        created: '2026-07-10',
        updated: '2026-07-10',
      },
      {
        id: 'inc-1',
        type: 'income',
        amount: 1000,
        category: 'PIX',
        date: '2026-07-10',
        entity: 'pj',
        servico: 'CLINICA GERAL',
        description: 'Recebimento',
        user: 'u1',
        created: '2026-07-10',
        updated: '2026-07-10',
      },
    ]

    const result = calculateDRE(transactions, { mode: 'month', monthKey: '2026-07' })
    expect(result.receitaBruta).toBe(1000)
    expect(result.despesasOperacionais).toBe(250)
    expect(result.outrasNaoMapeadasTotal).toBe(250)
    expect(result.lucroLiquido).toBe(750)
  })

  it('calcula o resumo de serviços corretamente para os 6 serviços oficiais', () => {
    const transactions: Transaction[] = [
      {
        id: 'tx-1',
        type: 'income',
        amount: 2000,
        category: 'PIX',
        date: '2026-08-01',
        entity: 'pj',
        servico: 'CENTRO CIRURGICO',
        description: '',
        user: 'u1',
        created: '2026-08-01',
        updated: '2026-08-01',
      },
      {
        id: 'tx-2',
        type: 'expense',
        amount: 500,
        category: 'HONORARIO ANESTESISTA',
        date: '2026-08-01',
        entity: 'pj',
        servico: 'CENTRO CIRURGICO',
        description: '',
        user: 'u1',
        created: '2026-08-01',
        updated: '2026-08-01',
      },
    ]

    const result = calculateDRE(transactions, { mode: 'month', monthKey: '2026-08' })
    const cc = result.serviceSummaries.find((s) => s.serviceName === 'CENTRO CIRURGICO')
    expect(cc).toBeDefined()
    expect(cc?.receita).toBe(2000)
    expect(cc?.custosDespesas).toBe(500)
    expect(cc?.resultado).toBe(1500)
    expect(cc?.margem).toBe(75)
  })
})
