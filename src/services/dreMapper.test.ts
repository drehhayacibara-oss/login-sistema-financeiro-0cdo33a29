import { describe, it, expect } from 'vitest'
import { calculateDRE } from './dreMapper'
import { CATEGORIES_PJ } from '@/constants/categories'
import type { Transaction } from './transactions'
import type { ServiceEntry } from './serviceEntries'

describe('DRE Mapper com Regra de Ouro (Receitas de Lançamentos de Serviços + Despesas do Fluxo de Caixa)', () => {
  it('apenas processa despesas da PJ do fluxo de caixa e calcula receitas SOMENTE de serviceEntries', () => {
    const transactions: Transaction[] = [
      // Entrada no fluxo de caixa (DEVE SER IGNORADA NA DRE para evitar dupla contagem)
      {
        id: '1',
        type: 'income',
        amount: 1000,
        category: 'PIX',
        date: '2026-04-10',
        entity: 'pj',
        servico: 'CONSULTORIO',
        description: 'Entrada bancária',
        user: 'user1',
        created: '2026-04-10',
        updated: '2026-04-10',
      },
      // Entrada PF (deve ser ignorada)
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
      // Despesa PF (deve ser ignorada)
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
      // Despesa PJ (DEVE ENTRAR)
      {
        id: '4',
        type: 'expense',
        amount: 300,
        category: 'SALARIOS',
        date: '2026-04-10',
        entity: 'pj',
        servico: 'CONSULTORIO',
        description: 'Salário secretária',
        user: 'user1',
        created: '2026-04-10',
        updated: '2026-04-10',
      },
    ]

    const serviceEntries: ServiceEntry[] = [
      {
        id: 'se-1',
        user: 'user1',
        date: '2026-04-10',
        servico: 'CONSULTORIO',
        payment_method: 'PIX',
        amount: 1500,
        notes: 'Consulta paciente A',
        created: '2026-04-10',
        updated: '2026-04-10',
      },
    ]

    const result = calculateDRE(
      transactions,
      { mode: 'month', monthKey: '2026-04' },
      [],
      serviceEntries,
    )
    expect(result.totalTransactionsPJ).toBe(1) // 1 despesa PJ
    expect(result.totalServiceEntries).toBe(1)
    expect(result.receitaBruta).toBe(1500)
    expect(result.receitaBrutaByService['CONSULTORIO']).toBe(1500)
    expect(result.despesasOperacionais).toBe(300)
    expect(result.lucroLiquido).toBe(1200)
  })

  it('mapeia corretamente as 8 formas de pagamento de receitas dos lançamentos de serviços', () => {
    const serviceEntries: ServiceEntry[] = CATEGORIES_PJ.income.map((method, idx) => ({
      id: `se-${idx}`,
      user: 'u1',
      date: '2026-05-15',
      servico: 'CENTRO CIRURGICO',
      payment_method: method,
      amount: 100,
      notes: `Atendimento ${method}`,
      created: '2026-05-15',
      updated: '2026-05-15',
    }))

    const result = calculateDRE([], { mode: 'month', monthKey: '2026-05' }, [], serviceEntries)
    expect(result.receitaBruta).toBe(800)
    expect(result.receitaBrutaRows.length).toBe(8)
    expect(result.receitaBrutaByService['CENTRO CIRURGICO']).toBe(800)
  })

  it('remapeia todas as 30 despesas PJ nas seções contábeis corretas a partir do fluxo de caixa', () => {
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

    const result = calculateDRE(expenseTxs, { mode: 'month', monthKey: '2026-06' }, [], [])

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

    // Lucro Líquido = 0 - 300 = -300
    expect(result.lucroLiquido).toBe(-300)
  })

  it('calcula o resumo de serviços combinando receitas de serviceEntries e despesas do fluxo de caixa', () => {
    const serviceEntries: ServiceEntry[] = [
      {
        id: 'se-1',
        user: 'u1',
        date: '2026-08-01',
        servico: 'CENTRO CIRURGICO',
        payment_method: 'PIX',
        amount: 2000,
        notes: '',
        created: '2026-08-01',
        updated: '2026-08-01',
      },
    ]

    const transactions: Transaction[] = [
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

    const result = calculateDRE(
      transactions,
      { mode: 'month', monthKey: '2026-08' },
      [],
      serviceEntries,
    )
    const cc = result.serviceSummaries.find((s) => s.serviceName === 'CENTRO CIRURGICO')
    expect(cc).toBeDefined()
    expect(cc?.receita).toBe(2000)
    expect(cc?.custosDespesas).toBe(500)
    expect(cc?.resultado).toBe(1500)
    expect(cc?.margem).toBe(75)
  })
})
