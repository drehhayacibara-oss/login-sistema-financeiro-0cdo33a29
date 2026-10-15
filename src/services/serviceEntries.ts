import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'
import type { ServicePJ } from '@/constants/categories'
import { CATEGORIES_PJ } from '@/constants/categories'

export type PaymentMethodPJ = (typeof CATEGORIES_PJ.income)[number]

export interface ServiceEntry {
  id: string
  user: string
  date: string
  servico: ServicePJ
  payment_method: PaymentMethodPJ
  amount: number
  notes: string
  created: string
  updated: string
  expand?: {
    user?: {
      id: string
      name?: string
      email?: string
    }
  }
}

export interface CreateServiceEntryDTO {
  date: string
  servico: ServicePJ
  payment_method: PaymentMethodPJ
  amount: number
  notes?: string
}

export interface UpdateServiceEntryDTO {
  date?: string
  servico?: ServicePJ
  payment_method?: PaymentMethodPJ
  amount?: number
  notes?: string
}

function normalizeDateForPocketbase(rawDate: string): string {
  const trimmed = rawDate.trim()
  const isoDayMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoDayMatch) {
    return `${isoDayMatch[1]} 12:00:00.000Z`
  }
  const brMatch = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/)
  if (brMatch) {
    const d = brMatch[1].padStart(2, '0')
    const m = brMatch[2].padStart(2, '0')
    const y = brMatch[3]
    return `${y}-${m}-${d} 12:00:00.000Z`
  }
  return trimmed
}

function mapRecordToServiceEntry(record: RecordModel): ServiceEntry {
  return {
    id: record.id,
    user: record.user as string,
    date: (record.date as string) || record.created,
    servico: record.servico as ServicePJ,
    payment_method: record.payment_method as PaymentMethodPJ,
    amount: Number(record.amount) || 0,
    notes: (record.notes as string) || '',
    created: record.created,
    updated: record.updated,
    expand: record.expand,
  }
}

export async function fetchServiceEntries(): Promise<ServiceEntry[]> {
  const records = await pb.collection('service_entries').getFullList({
    sort: '-date,-created',
    expand: 'user',
  })
  return records.map(mapRecordToServiceEntry)
}

export async function createServiceEntry(data: CreateServiceEntryDTO): Promise<ServiceEntry> {
  const userId = pb.authStore.record?.id
  if (!userId) {
    throw new Error('Usuário não autenticado.')
  }
  if (!data.date || !data.date.trim()) {
    throw new Error('A data do lançamento é obrigatória.')
  }
  if (!data.servico) {
    throw new Error('O serviço é obrigatório.')
  }
  if (!data.payment_method) {
    throw new Error('A forma de pagamento é obrigatória.')
  }
  if (data.amount <= 0 || isNaN(data.amount)) {
    throw new Error('O valor do lançamento deve ser maior que zero.')
  }

  const record = await pb.collection('service_entries').create({
    user: userId,
    date: normalizeDateForPocketbase(data.date),
    servico: data.servico,
    payment_method: data.payment_method,
    amount: data.amount,
    notes: data.notes?.trim() || '',
  })

  return mapRecordToServiceEntry(record)
}

export async function updateServiceEntry(
  id: string,
  data: UpdateServiceEntryDTO,
): Promise<ServiceEntry> {
  const payload: Record<string, unknown> = {}
  if (data.date !== undefined) payload.date = normalizeDateForPocketbase(data.date)
  if (data.servico !== undefined) payload.servico = data.servico
  if (data.payment_method !== undefined) payload.payment_method = data.payment_method
  if (data.amount !== undefined) {
    if (data.amount <= 0 || isNaN(data.amount)) {
      throw new Error('O valor do lançamento deve ser maior que zero.')
    }
    payload.amount = data.amount
  }
  if (data.notes !== undefined) payload.notes = data.notes.trim()

  const record = await pb.collection('service_entries').update(id, payload)
  return mapRecordToServiceEntry(record)
}

export async function deleteServiceEntry(id: string): Promise<boolean> {
  return await pb.collection('service_entries').delete(id)
}
