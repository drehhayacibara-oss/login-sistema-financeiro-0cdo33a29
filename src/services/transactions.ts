import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export type TransactionType = 'income' | 'expense'
export type TransactionEntity = 'pf' | 'pj'

export interface Transaction {
  id: string
  user: string
  type: TransactionType
  entity: TransactionEntity
  amount: number
  description: string
  category: string
  servico?: string
  date: string
  created: string
  updated: string
}

export interface CreateTransactionDTO {
  type: TransactionType
  entity: TransactionEntity
  amount: number
  description: string
  category: string
  servico?: string
  date: string
}

export interface TransactionSummary {
  totalBalance: number
  monthIncome: number
  monthExpense: number
  netMonth: number
  allTimeIncome: number
  allTimeExpense: number
}

export interface CategorySummary {
  category: string
  total: number
  percentage: number
  count: number
}

export interface MonthlyChartData {
  monthKey: string
  monthLabel: string
  income: number
  expense: number
  balance: number
}

function mapRecordToTransaction(record: RecordModel): Transaction {
  return {
    id: record.id,
    user: record.user as string,
    type: record.type as TransactionType,
    entity: (record.entity as TransactionEntity) || 'pj',
    amount: Number(record.amount) || 0,
    description: (record.description as string) || '',
    category: (record.category as string) || 'Geral',
    servico: (record.servico as string) || undefined,
    date: (record.date as string) || record.created,
    created: record.created,
    updated: record.updated,
  }
}

export async function fetchTransactions(): Promise<Transaction[]> {
  const records = await pb.collection('transactions').getFullList({
    sort: '-date,-created',
  })
  return records.map(mapRecordToTransaction)
}

export async function createTransaction(data: CreateTransactionDTO): Promise<Transaction> {
  const userId = pb.authStore.record?.id
  if (!userId) {
    throw new Error('Usuário não autenticado.')
  }

  if (!data.date || !data.date.trim()) {
    throw new Error('A data da transação é obrigatória.')
  }

  // Format date correctly for PocketBase:
  // Se for YYYY-MM-DD, grava 'YYYY-MM-DD 12:00:00.000Z' (meio-dia UTC) para evitar que
  // qualquer fuso horário (ex: UTC-3 brasileiro) recue o dia ao exibir
  let formattedDate = data.date.trim()
  const isoDayMatch = formattedDate.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoDayMatch) {
    formattedDate = `${isoDayMatch[1]} 12:00:00.000Z`
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
    formattedDate = `${formattedDate} 12:00:00.000Z`
  }

  const record = await pb.collection('transactions').create({
    user: userId,
    type: data.type,
    entity: data.entity || 'pj',
    amount: data.amount,
    description: data.description.trim(),
    category: data.category.trim(),
    servico: data.servico?.trim() || '',
    date: formattedDate,
  })

  return mapRecordToTransaction(record)
}

export async function deleteTransaction(id: string): Promise<boolean> {
  return await pb.collection('transactions').delete(id)
}

export function calculateSummary(
  transactions: Transaction[],
  selectedMonth?: string,
): TransactionSummary {
  // If selectedMonth is YYYY-MM, filter for that month's income and expense
  const currentMonthKey = selectedMonth || new Date().toISOString().slice(0, 7) // '2026-09'

  let allTimeIncome = 0
  let allTimeExpense = 0
  let monthIncome = 0
  let monthExpense = 0

  for (const t of transactions) {
    const val = Number(t.amount) || 0
    if (t.type === 'income') {
      allTimeIncome += val
    } else {
      allTimeExpense += val
    }

    const tMonthKey = t.date ? t.date.slice(0, 7) : ''
    if (tMonthKey === currentMonthKey) {
      if (t.type === 'income') {
        monthIncome += val
      } else {
        monthExpense += val
      }
    }
  }

  const totalBalance = allTimeIncome - allTimeExpense
  const netMonth = monthIncome - monthExpense

  return {
    totalBalance,
    monthIncome,
    monthExpense,
    netMonth,
    allTimeIncome,
    allTimeExpense,
  }
}

export function calculateExpenseCategories(
  transactions: Transaction[],
  selectedMonth?: string,
): CategorySummary[] {
  const currentMonthKey = selectedMonth || new Date().toISOString().slice(0, 7)

  // Filter only expenses for selected month (or if none found, overall expenses as fallback)
  let expenses = transactions.filter(
    (t) => t.type === 'expense' && t.date.slice(0, 7) === currentMonthKey,
  )

  if (expenses.length === 0) {
    expenses = transactions.filter((t) => t.type === 'expense')
  }

  const categoryMap = new Map<string, { total: number; count: number }>()
  let totalExpense = 0

  for (const t of expenses) {
    const cat = t.category || 'Outros'
    const current = categoryMap.get(cat) || { total: 0, count: 0 }
    current.total += t.amount
    current.count += 1
    categoryMap.set(cat, current)
    totalExpense += t.amount
  }

  const results: CategorySummary[] = []
  categoryMap.forEach((val, key) => {
    results.push({
      category: key,
      total: val.total,
      percentage: totalExpense > 0 ? (val.total / totalExpense) * 100 : 0,
      count: val.count,
    })
  })

  // Sort descending by total
  return results.sort((a, b) => b.total - a.total)
}

export function calculateMonthlyTrend(transactions: Transaction[], count = 6): MonthlyChartData[] {
  const monthNames = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ]

  // Generate last `count` months list
  const now = new Date()
  const months: { key: string; label: string }[] = []

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`
    months.push({ key, label })
  }

  return months.map(({ key, label }) => {
    const monthItems = transactions.filter((t) => t.date && t.date.slice(0, 7) === key)
    const income = monthItems
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    const expense = monthItems
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

    return {
      monthKey: key,
      monthLabel: label,
      income,
      expense,
      balance: income - expense,
    }
  })
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatDatePtBR(dateString: string): string {
  if (!dateString) return ''
  try {
    // Se a string começar com YYYY-MM-DD (ex: "2024-12-25" ou "2024-12-25 12:00:00.000Z" ou "2024-12-25T12:00:00.000Z"),
    // extrai diretamente os componentes numéricos sem instanciar Date() com timezone do navegador.
    // Isso é imune a atrasos de timezone (UTC-3 recuando 2024-12-25 00:00:00 para 2024-12-24).
    const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const [, y, m, d] = match
      return `${d}/${m}/${y}`
    }

    // Se for formato brasileiro DD/MM/YYYY
    const matchBr = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
    if (matchBr) {
      return dateString.slice(0, 10)
    }

    const d = new Date(dateString)
    if (isNaN(d.getTime())) return dateString
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d)
  } catch {
    return dateString
  }
}
