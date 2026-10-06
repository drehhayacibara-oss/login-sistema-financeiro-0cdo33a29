import pb from '@/lib/pocketbase/client'
import type { UserRole } from '@/context/AuthContext'

export const CATALOG_TYPES = [
  'accounts',
  'categories',
  'payment_methods',
  'doctors',
  'insurers',
  'cost_centers',
] as const

export type CatalogType = (typeof CATALOG_TYPES)[number]
export type CatalogDirection = 'income' | 'expense'
export type CatalogEntity = 'pf' | 'pj' | 'both'
export type CatalogAccountType = 'cash' | 'bank' | 'credit_card' | 'other'

export interface FinancialCatalogRecord {
  id: string
  name: string
  description: string
  active: boolean
  direction?: CatalogDirection
  entity?: CatalogEntity
  account_type?: CatalogAccountType
  crm?: string
  created: string
  updated: string
}

export interface FinancialCatalogInput {
  name: string
  description?: string
  direction?: CatalogDirection
  entity?: CatalogEntity
  account_type?: CatalogAccountType
  crm?: string
}

export interface CatalogDefinition {
  type: CatalogType
  collection: string
  label: string
  singular: string
  description: string
  readableByReception: boolean
  extraFields: Array<'direction' | 'entity' | 'account_type' | 'crm'>
}

export const CATALOG_DEFINITIONS: CatalogDefinition[] = [
  {
    type: 'accounts',
    collection: 'financial_accounts',
    label: 'Contas',
    singular: 'conta',
    description: 'Caixa, bancos e demais contas financeiras.',
    readableByReception: false,
    extraFields: ['account_type'],
  },
  {
    type: 'categories',
    collection: 'financial_categories',
    label: 'Categorias',
    singular: 'categoria',
    description: 'Classificação de receitas e despesas.',
    readableByReception: true,
    extraFields: ['direction', 'entity'],
  },
  {
    type: 'payment_methods',
    collection: 'financial_payment_methods',
    label: 'Formas de pagamento',
    singular: 'forma de pagamento',
    description: 'Meios aceitos para registrar recebimentos.',
    readableByReception: true,
    extraFields: [],
  },
  {
    type: 'doctors',
    collection: 'financial_doctors',
    label: 'Médicos',
    singular: 'médico',
    description: 'Profissionais relacionados às movimentações financeiras.',
    readableByReception: false,
    extraFields: ['crm'],
  },
  {
    type: 'insurers',
    collection: 'financial_insurers',
    label: 'Convênios',
    singular: 'convênio',
    description: 'Convênios e modalidades de atendimento particular.',
    readableByReception: false,
    extraFields: [],
  },
  {
    type: 'cost_centers',
    collection: 'financial_cost_centers',
    label: 'Centros/áreas',
    singular: 'centro/área',
    description: 'Serviços e centros de custo usados pelo financeiro e pela DRE.',
    readableByReception: true,
    extraFields: [],
  },
]

const TYPE_TO_DEFINITION = new Map<CatalogType, CatalogDefinition>(
  CATALOG_DEFINITIONS.map((definition) => [definition.type, definition]),
)

export function getVisibleCatalogDefinitions(role: UserRole): CatalogDefinition[] {
  return CATALOG_DEFINITIONS.filter(
    (definition) => role !== 'recepcao' || definition.readableByReception,
  )
}

export function getReadableCollectionNames(role: UserRole): string[] {
  return getVisibleCatalogDefinitions(role).map((definition) => definition.collection)
}

export function getCatalogDefinition(type: CatalogType): CatalogDefinition {
  const definition = TYPE_TO_DEFINITION.get(type)
  if (!definition) throw new Error('Tipo de cadastro inválido.')
  return definition
}

export async function listCatalogRecords(type: CatalogType): Promise<FinancialCatalogRecord[]> {
  const definition = getCatalogDefinition(type)
  const role = (pb.authStore.record as Record<string, unknown> | null)?.role
  if (role === 'recepcao' && !definition.readableByReception) {
    throw new Error('Seu perfil não tem permissão para consultar este cadastro.')
  }
  const records = await pb.collection(definition.collection).getFullList({
    filter: 'active = true',
    sort: 'name',
  })
  return records.map((record) => ({
    id: record.id,
    name: String(record.name || ''),
    description: String(record.description || ''),
    active: record.active === true,
    direction: record.direction as CatalogDirection | undefined,
    entity: record.entity as CatalogEntity | undefined,
    account_type: record.account_type as CatalogAccountType | undefined,
    crm: String(record.crm || ''),
    created: record.created,
    updated: record.updated,
  }))
}

function normalizeInput(type: CatalogType, input: FinancialCatalogInput) {
  const name = input.name.trim()
  if (!name) throw new Error('Informe o nome do cadastro.')
  if (name.length > 160) throw new Error('O nome deve ter no máximo 160 caracteres.')

  const description = (input.description || '').trim()
  if (description.length > 300) throw new Error('A descrição deve ter no máximo 300 caracteres.')

  const data: Record<string, string | boolean> = {
    name,
    description,
    active: true,
  }

  if (type === 'categories') {
    if (input.direction !== 'income' && input.direction !== 'expense') {
      throw new Error('Selecione se a categoria é de receita ou despesa.')
    }
    if (input.entity !== 'pf' && input.entity !== 'pj' && input.entity !== 'both') {
      throw new Error('Selecione a entidade atendida por esta categoria.')
    }
    data.direction = input.direction
    data.entity = input.entity
  }

  if (type === 'accounts') {
    if (!['cash', 'bank', 'credit_card', 'other'].includes(input.account_type || '')) {
      throw new Error('Selecione o tipo de conta.')
    }
    data.account_type = input.account_type as CatalogAccountType
  }

  if (type === 'doctors') {
    const crm = (input.crm || '').trim()
    if (crm.length > 40) throw new Error('O CRM deve ter no máximo 40 caracteres.')
    data.crm = crm
  }

  return data
}

async function ensureNoActiveDuplicate(
  type: CatalogType,
  name: string,
  excludeId?: string,
): Promise<void> {
  const definition = getCatalogDefinition(type)
  const filter = pb.filter('active = true && name ~ {:name}', { name })
  const records = await pb.collection(definition.collection).getList(1, 50, {
    filter,
    fields: 'id,name,active',
  })
  const normalizedName = name.toLocaleLowerCase('pt-BR')
  const duplicate = records.items.find(
    (record) =>
      record.id !== excludeId && String(record.name || '').trim().toLocaleLowerCase('pt-BR') === normalizedName,
  )
  if (duplicate) {
    throw new Error(`Já existe um cadastro ativo chamado “${String(duplicate.name)}” em ${definition.label.toLocaleLowerCase('pt-BR')}. Edite o registro existente.`)
  }
}

export async function createCatalogRecord(
  type: CatalogType,
  input: FinancialCatalogInput,
): Promise<FinancialCatalogRecord> {
  const role = (pb.authStore.record as Record<string, unknown> | null)?.role
  if (role !== 'gestao_financeira') throw new Error('Somente a Gestão Financeira pode criar cadastros.')
  const data = normalizeInput(type, input)
  await ensureNoActiveDuplicate(type, String(data.name))
  const definition = getCatalogDefinition(type)
  const record = await pb.collection(definition.collection).create(data)
  return {
    id: record.id,
    name: String(record.name || ''),
    description: String(record.description || ''),
    active: record.active === true,
    direction: record.direction as CatalogDirection | undefined,
    entity: record.entity as CatalogEntity | undefined,
    account_type: record.account_type as CatalogAccountType | undefined,
    crm: String(record.crm || ''),
    created: record.created,
    updated: record.updated,
  }
}

export async function updateCatalogRecord(
  type: CatalogType,
  id: string,
  input: FinancialCatalogInput,
): Promise<FinancialCatalogRecord> {
  const role = (pb.authStore.record as Record<string, unknown> | null)?.role
  if (role !== 'gestao_financeira') throw new Error('Somente a Gestão Financeira pode editar cadastros.')
  if (!id.trim()) throw new Error('Cadastro inválido para edição.')
  const data = normalizeInput(type, input)
  await ensureNoActiveDuplicate(type, String(data.name), id)
  const definition = getCatalogDefinition(type)
  const record = await pb.collection(definition.collection).update(id, data)
  return {
    id: record.id,
    name: String(record.name || ''),
    description: String(record.description || ''),
    active: record.active === true,
    direction: record.direction as CatalogDirection | undefined,
    entity: record.entity as CatalogEntity | undefined,
    account_type: record.account_type as CatalogAccountType | undefined,
    crm: String(record.crm || ''),
    created: record.created,
    updated: record.updated,
  }
}
