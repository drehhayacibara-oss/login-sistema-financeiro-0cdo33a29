// Categorias oficiais do Rubra
// PF: 4 receitas / 10 despesas
// PJ: 8 receitas / 30 despesas na ordem exata definida pela usuária.

export const CATEGORIES_PJ: { income: string[]; expense: string[] } = {
  income: [
    'CARTAO DE DEBITO',
    'CARTAO DE CREDITO',
    'ANTECIPACAO DE CARTAO DE CREDITO',
    'PIX',
    'DINHEIRO',
    'CHEQUE',
    'ALUGUEL DE SALAS',
    'TED',
  ],
  expense: [
    'ALUGUEL EXTERNO',
    'APLICACAO DE MEDICACAO EXTERNAS',
    'ASSOCIAÇÃO/ENTIDADES E ANUIDADES',
    'COLETA RESIDENCIA',
    'CONTADOR',
    'CONVENIO',
    'COPA',
    'DEPOSITOS BANCARIOS',
    'DESPESAS PREDIAIS',
    'EMPRESTIMO',
    'ESTERILIZAÇÃO',
    'FORNECEDORES DE OPME',
    'FORNECEDORES MATERIAS E MEDICAMENTOS',
    'HONORARIO ANESTESISTA',
    'IMPOSTOS FEDERAIS',
    'IMPOSTOS MUNICIPAIS',
    'INVESTIMENTOS',
    'JUROS BANCARIOS',
    'LABORATORIO DE APOIO',
    'MANUTENÇÃO',
    'MARKETING/PROPAGANDA',
    'MATERIAL DE ESCRITORIO',
    'MATERIAL DE LIMPEZA/HIGIENE',
    'PARCELAMENTO DE IMPOSTOS',
    'REFEIÇÃO/HOTELARIA',
    'REPASSE MEDICO',
    'SALARIOS',
    'SEGUROS',
    'TARIFAS BANCARIAS',
    'TELEFONIA/INTERNET',
  ],
} as const

// Lista oficial e padronizada de Serviços / Centros de Custo PJ do Rubra
// Exatamente nesta grafia e ordem, serve para receitas e despesas:
export const SERVICES_PJ = [
  'CENTRO CIRURGICO',
  'CIRURGIAS EXTERNAS',
  'LABORATORIO',
  'LITOTRIPSIA',
  'CONSULTORIO',
  'CLINICA GERAL',
] as const

export type ServicePJ = (typeof SERVICES_PJ)[number]

export const CATEGORIES_PF: { income: string[]; expense: string[] } = {
  income: ['APOSENTADORIA INSTITUTO', 'APOSENTADORIA INSS', 'OUTRAS RECEITAS', 'PROLABORE'],
  expense: [
    'CASA DA AVENIDA 3',
    'REFORMA',
    'FILHOS',
    'CASA DA AVENIDA 47',
    'CARROS E MOTOS',
    'CARTOES',
    'TAXA E JUROS BANCARIOS',
    'EMPRESTIMO',
    'INVESTIMENTO',
    'DESPESAS EXTRAS',
  ],
} as const
