import type { Transaction, TransactionEntity, TransactionType } from './transactions'

export interface ParsedStatementTransaction {
  tempId: string
  date: string // YYYY-MM-DD
  description: string
  amount: number // Positive number
  type: TransactionType
  category: string
  servico?: string
  entity: TransactionEntity
  selected: boolean
  isDuplicate?: boolean
  duplicateReason?: string
  rawLine?: string
}

export interface ParseResult {
  transactions: ParsedStatementTransaction[]
  format: 'ofx' | 'csv' | 'unknown'
  totalFound: number
  warnings: string[]
  rawHeaders?: string[]
  rawRows?: string[][]
  needsManualMapping?: boolean
  suggestedColumns?: {
    dateCol: number
    descCol: number
    amountCol: number
  }
}

/**
 * Normaliza strings para comparação (remove acentos, pontuação, múltiplos espaços e lowercase)
 */
export function normalizeText(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Converte valores em formato numérico tolerando vírgula ou ponto:
 * "1.234,56", "-150,00", "(200.00)", "R$ 350,20", "45.00"
 */
export function parseBRLNumber(rawVal: string): { amount: number; isNegative: boolean } | null {
  if (!rawVal) return null
  let str = rawVal.trim()

  // Remove símbolos de moeda e espaços
  str = str.replace(/R\$/gi, '').replace(/\s+/g, '')

  // Trata formato contábil com parênteses: (150,00) => -150,00
  let isNegative = false
  if (/^\(.*\)$/.test(str)) {
    isNegative = true
    str = str.slice(1, -1)
  } else if (str.startsWith('-') || str.endsWith('-')) {
    isNegative = true
    str = str.replace(/-/g, '')
  } else if (str.startsWith('+')) {
    str = str.replace(/^\+/, '')
  }

  // Verifica se tem formato brasileiro com separador de milhar ponto e decimal vírgula
  // Ex: 1.234,56 ou 1234,56 ou 150,00
  if (str.includes(',') && str.includes('.')) {
    // Se a vírgula vier depois do ponto, ponto é milhar e vírgula é decimal (ex: 1.250,50)
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      str = str.replace(/\./g, '').replace(',', '.')
    } else {
      // Vírgula é milhar e ponto é decimal (ex: 1,250.50)
      str = str.replace(/,/g, '')
    }
  } else if (str.includes(',')) {
    // Só tem vírgula: trata como decimal (ex: 150,50)
    str = str.replace(',', '.')
  }

  // Limpa caracteres restantes que não sejam números ou ponto
  str = str.replace(/[^0-9.]/g, '')

  const num = parseFloat(str)
  if (isNaN(num)) return null

  return {
    amount: Math.abs(num),
    isNegative,
  }
}

/**
 * Normaliza qualquer data para YYYY-MM-DD
 * Aceita: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, YYYYMMDD
 */
export function parseDateToISO(rawDate: string): string | null {
  if (!rawDate) return null
  // Remove espaços e tags/colchetes acidentais no início ou fim
  let str = rawDate.trim()

  // Se vier com quebras de linha ou caracteres de fechamento SGML
  str = str.replace(/<.*$/, '').trim()

  // 1. OFX com timestamp e timezone (ex: 20241225120000 ou com fuso horario entre colchetes)
  // Ou simples YYYYMMDD (ex: 20241225)
  // Sempre extrair dia, mês e ano diretamente da string sem passar por Date() para evitar deslocamento de fuso!
  const matchOfx = str.match(/(\d{4})(\d{2})(\d{2})/)
  if (matchOfx && !str.includes('/') && !str.includes('-')) {
    const [, y, m, d] = matchOfx
    const yearNum = parseInt(y, 10)
    const monthNum = parseInt(m, 10)
    const dayNum = parseInt(d, 10)
    if (
      yearNum >= 1990 &&
      yearNum <= 2100 &&
      monthNum >= 1 &&
      monthNum <= 12 &&
      dayNum >= 1 &&
      dayNum <= 31
    ) {
      return `${y}-${m}-${d}`
    }
  }

  // 2. Formato brasileiro: DD/MM/YYYY ou DD-MM-YYYY (comum em CSVs do BB, Itaú, Bradesco, CEF, Nubank)
  // Também suporta com hora anexada (ex: "25/12/2024 14:30:00" ou "25/12/2024")
  const matchBr = str.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/)
  if (matchBr) {
    const d = matchBr[1].padStart(2, '0')
    const m = matchBr[2].padStart(2, '0')
    const y = matchBr[3]
    return `${y}-${m}-${d}`
  }

  // 3. Formato ISO: YYYY-MM-DD ou YYYY/MM/DD (com ou sem hora ISO: 2024-12-25T12:00:00)
  const matchIso = str.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/)
  if (matchIso) {
    const y = matchIso[1]
    const m = matchIso[2].padStart(2, '0')
    const d = matchIso[3].padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // 4. Formato compacto de CSV: DDMMYYYY (ex: 25122024)
  const matchCompactBr = str.match(/^(\d{2})(\d{2})(\d{4})$/)
  if (matchCompactBr) {
    const d = matchCompactBr[1]
    const m = matchCompactBr[2]
    const y = matchCompactBr[3]
    const monthNum = parseInt(m, 10)
    const dayNum = parseInt(d, 10)
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
      return `${y}-${m}-${d}`
    }
  }

  // 5. Caso ainda reste algo identificável como número de 8 dígitos dentro de uma string mais longa
  const matchAnyDate = str.match(/\b(\d{4})(\d{2})(\d{2})\b/)
  if (matchAnyDate) {
    const [, y, m, d] = matchAnyDate
    const yearNum = parseInt(y, 10)
    const monthNum = parseInt(m, 10)
    const dayNum = parseInt(d, 10)
    if (
      yearNum >= 1990 &&
      yearNum <= 2100 &&
      monthNum >= 1 &&
      monthNum <= 12 &&
      dayNum >= 1 &&
      dayNum <= 31
    ) {
      return `${y}-${m}-${d}`
    }
  }

  return null
}

/**
 * Parser de OFX (SGML/XML tolerante)
 */
export function parseOFX(content: string, defaultEntity: TransactionEntity = 'pj'): ParseResult {
  const transactions: ParsedStatementTransaction[] = []
  const warnings: string[] = []

  // Extrair blocos <STMTTRN>...</STMTTRN> ou STMTTRN sem tag de fechamento (formato clássico OFX SGML)
  // Alguns arquivos usam tags em maiúsculas ou minúsculas
  const trnRegex = /<STMTTRN>([\s\S]*?)(?=<\/STMTTRN>|<STMTTRN>|$)/gi
  let match: RegExpExecArray | null

  let count = 0
  while ((match = trnRegex.exec(content)) !== null) {
    const block = match[1]
    if (!block.trim()) continue

    // Extrair campos comuns
    // Tags OFX podem ter fechamento opcional (ex: <DTPOSTED>20241225... ou <DTPOSTED>20241225...</DTPOSTED>)
    // e podem vir na mesma linha de outra tag
    const trnTypeMatch = block.match(/<TRNTYPE>\s*([^<\r\n]+)/i)
    const dtPostedMatch = block.match(/<DTPOSTED>\s*([^<\r\n]+)/i)
    const dtUserMatch = block.match(/<DTUSER>\s*([^<\r\n]+)/i)
    const trnAmtMatch = block.match(/<TRNAMT>\s*([^<\r\n]+)/i)
    const memoMatch = block.match(/<MEMO>\s*([^<\r\n]+)/i)
    const nameMatch = block.match(/<NAME>\s*([^<\r\n]+)/i)

    // Se <DTPOSTED> não vier, tenta <DTUSER> como fallback da transação no OFX
    const rawDate =
      (dtPostedMatch ? dtPostedMatch[1].trim() : '') || (dtUserMatch ? dtUserMatch[1].trim() : '')
    const rawAmt = trnAmtMatch ? trnAmtMatch[1].trim() : ''
    const memo = memoMatch ? memoMatch[1].trim() : ''
    const name = nameMatch ? nameMatch[1].trim() : ''

    const description = (name || memo || 'Lançamento bancário').replace(/\s+/g, ' ').trim()
    const isoDate = parseDateToISO(rawDate) || ''

    if (!isoDate) {
      warnings.push(
        `Aviso: transação "${description.slice(0, 30)}" sem data válida no extrato OFX (campo original: "${rawDate}").`,
      )
    }

    const parsedNum = parseBRLNumber(rawAmt)
    if (!parsedNum || parsedNum.amount === 0) continue

    // TRNTYPE também ajuda: CREDIT = income, DEBIT = expense
    const trnType = trnTypeMatch ? trnTypeMatch[1].trim().toUpperCase() : ''
    let isIncome = false
    if (trnType === 'CREDIT') {
      isIncome = true
    } else if (trnType === 'DEBIT') {
      isIncome = false
    } else {
      isIncome = !parsedNum.isNegative
    }

    count++
    transactions.push({
      tempId: `ofx-${count}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: isoDate || new Date().toISOString().slice(0, 10),
      description,
      amount: Math.round(parsedNum.amount * 100) / 100,
      type: isIncome ? 'income' : 'expense',
      category: '',
      entity: defaultEntity,
      selected: true,
      rawLine: block.slice(0, 100),
    })
  }

  if (transactions.length === 0) {
    warnings.push('Nenhuma transação encontrada no formato OFX.')
  }

  return {
    transactions,
    format: 'ofx',
    totalFound: transactions.length,
    warnings,
  }
}

/**
 * Divide linha de CSV respeitando aspas
 */
function splitCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

/**
 * Detecta delimitador de CSV (, ; ou \t)
 */
function detectDelimiter(lines: string[]): string {
  const candidates = [';', ',', '\t']
  const counts: Record<string, number> = { ';': 0, ',': 0, '\t': 0 }

  for (const line of lines.slice(0, 5)) {
    if (!line.trim()) continue
    for (const c of candidates) {
      const parts = line.split(c)
      if (parts.length > 1) {
        counts[c] += parts.length
      }
    }
  }

  let best = ';'
  let max = -1
  for (const c of candidates) {
    if (counts[c] > max) {
      max = counts[c]
      best = c
    }
  }
  return best
}

/**
 * Identifica colunas pelo cabeçalho
 */
function findColumnIndicesByHeader(headers: string[]): {
  dateCol: number
  descCol: number
  amountCol: number
  incomeCol: number
  expenseCol: number
} {
  let dateCol = -1
  let descCol = -1
  let amountCol = -1
  let incomeCol = -1
  let expenseCol = -1

  headers.forEach((h, idx) => {
    const norm = normalizeText(h)

    // Data
    if (
      dateCol === -1 &&
      (norm.includes('data') ||
        norm.includes('date') ||
        norm.includes('dt lancamento') ||
        norm.includes('dt movimento') ||
        norm === 'dt')
    ) {
      dateCol = idx
    }

    // Descrição / Histórico
    if (
      descCol === -1 &&
      (norm.includes('descricao') ||
        norm.includes('historico') ||
        norm.includes('discriminacao') ||
        norm.includes('memo') ||
        norm.includes('detalhes') ||
        norm.includes('transacao') ||
        norm.includes('narrativa'))
    ) {
      descCol = idx
    }

    // Entrada / Crédito
    if (
      incomeCol === -1 &&
      (norm.includes('entrada') ||
        norm.includes('credito') ||
        norm.includes('receita') ||
        norm === 'cr')
    ) {
      incomeCol = idx
    }

    // Saída / Débito
    if (
      expenseCol === -1 &&
      (norm.includes('saida') ||
        norm.includes('debito') ||
        norm.includes('despesa') ||
        norm === 'db')
    ) {
      expenseCol = idx
    }

    // Valor geral
    if (
      amountCol === -1 &&
      (norm.includes('valor') ||
        norm.includes('amount') ||
        norm.includes('saldo') ||
        norm.includes('montante'))
    ) {
      amountCol = idx
    }
  })

  return { dateCol, descCol, amountCol, incomeCol, expenseCol }
}

/**
 * Heurística por conteúdo de colunas
 */
function inferColumnIndicesByContent(rows: string[][]): {
  dateCol: number
  descCol: number
  amountCol: number
} {
  if (rows.length === 0) return { dateCol: -1, descCol: -1, amountCol: -1 }

  const numCols = Math.max(...rows.map((r) => r.length))
  const dateScores = new Array(numCols).fill(0)
  const amountScores = new Array(numCols).fill(0)
  const textScores = new Array(numCols).fill(0)

  for (const row of rows.slice(0, 10)) {
    row.forEach((cell, idx) => {
      if (!cell) return
      if (parseDateToISO(cell)) {
        dateScores[idx] += 2
      }
      if (parseBRLNumber(cell) !== null) {
        amountScores[idx] += 1
      }
      if (cell.length > 5 && isNaN(Number(cell.replace(/,/g, '')))) {
        textScores[idx] += 1
      }
    })
  }

  // Maior score de data
  const dateCol = dateScores.indexOf(Math.max(...dateScores))
  // Para valor, evitar a coluna de data
  let amountCol = -1
  let maxAmount = 0
  amountScores.forEach((score, idx) => {
    if (idx !== dateCol && score > maxAmount) {
      maxAmount = score
      amountCol = idx
    }
  })

  // Para texto/descrição, evitar data e valor
  let descCol = -1
  let maxText = -1
  textScores.forEach((score, idx) => {
    if (idx !== dateCol && idx !== amountCol && score > maxText) {
      maxText = score
      descCol = idx
    }
  })

  return { dateCol, descCol, amountCol }
}

/**
 * Parser de CSV tolerante a formatos brasileiros e bancos variados
 */
export function parseCSV(content: string, defaultEntity: TransactionEntity = 'pj'): ParseResult {
  const warnings: string[] = []
  const rawLines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (rawLines.length === 0) {
    return {
      transactions: [],
      format: 'csv',
      totalFound: 0,
      warnings: ['O arquivo enviado está vazio.'],
    }
  }

  const delimiter = detectDelimiter(rawLines)
  const parsedRows = rawLines.map((line) => splitCSVLine(line, delimiter))

  // Analisa primeira linha como cabeçalho provável
  const firstRow = parsedRows[0]
  const headerDetection = findColumnIndicesByHeader(firstRow)

  let dateCol = headerDetection.dateCol
  let descCol = headerDetection.descCol
  let amountCol = headerDetection.amountCol
  let incomeCol = headerDetection.incomeCol
  let expenseCol = headerDetection.expenseCol

  let dataRowsStart = 0
  const isFirstRowHeader =
    dateCol !== -1 || descCol !== -1 || amountCol !== -1 || incomeCol !== -1 || expenseCol !== -1

  if (isFirstRowHeader) {
    dataRowsStart = 1
  }

  const dataRows = parsedRows.slice(dataRowsStart)

  // Se não encontrou colunas essenciais pelo cabeçalho, tenta inferir pelo conteúdo
  if (dateCol === -1 || descCol === -1 || (amountCol === -1 && incomeCol === -1)) {
    const heuristic = inferColumnIndicesByContent(dataRows)
    if (dateCol === -1) dateCol = heuristic.dateCol
    if (descCol === -1) descCol = heuristic.descCol
    if (amountCol === -1 && incomeCol === -1) amountCol = heuristic.amountCol
  }

  const needsManualMapping =
    dateCol === -1 || descCol === -1 || (amountCol === -1 && incomeCol === -1)

  if (needsManualMapping) {
    warnings.push(
      'Não foi possível identificar todas as colunas automaticamente. Confira o mapeamento abaixo.',
    )
    return {
      transactions: [],
      format: 'csv',
      totalFound: 0,
      warnings,
      rawHeaders: firstRow,
      rawRows: parsedRows.slice(0, 10),
      needsManualMapping: true,
      suggestedColumns: {
        dateCol: Math.max(0, dateCol),
        descCol: Math.max(0, descCol),
        amountCol: Math.max(0, amountCol),
      },
    }
  }

  const transactions: ParsedStatementTransaction[] = []
  let count = 0

  for (let rIndex = 0; rIndex < dataRows.length; rIndex++) {
    const row = dataRows[rIndex]
    if (row.length === 0 || row.every((c) => !c.trim())) continue

    const rawDate = row[dateCol] || ''
    const rawDesc = row[descCol] || ''

    const isoDate = parseDateToISO(rawDate)
    if (!isoDate) {
      // Linha de cabeçalho intermediário ou rodapé
      continue
    }

    let parsedAmount = 0
    let isIncome = false

    // Se tem colunas separadas de Entrada e Saída
    if (incomeCol !== -1 || expenseCol !== -1) {
      const rawIn = incomeCol !== -1 ? row[incomeCol] : ''
      const rawOut = expenseCol !== -1 ? row[expenseCol] : ''

      const parsedIn = parseBRLNumber(rawIn)
      const parsedOut = parseBRLNumber(rawOut)

      if (parsedIn && parsedIn.amount > 0) {
        parsedAmount = parsedIn.amount
        isIncome = true
      } else if (parsedOut && parsedOut.amount > 0) {
        parsedAmount = parsedOut.amount
        isIncome = false
      }
    }

    // Se ainda não determinou valor e tem coluna geral de valor
    if (parsedAmount === 0 && amountCol !== -1) {
      const rawAmt = row[amountCol] || ''
      const parsed = parseBRLNumber(rawAmt)
      if (parsed && parsed.amount > 0) {
        parsedAmount = parsed.amount
        // Se negativo ou se histórico indicar débito/saída/pagamento
        isIncome = !parsed.isNegative
      }
    }

    if (parsedAmount === 0) {
      // Ignora linhas sem valor válido
      continue
    }

    // Heurística de descrição caso o sinal venha com texto
    const normDesc = normalizeText(rawDesc)
    if (
      normDesc.includes('estorno') ||
      normDesc.includes('ted recebida') ||
      normDesc.includes('pix recebido')
    ) {
      isIncome = true
    } else if (
      normDesc.includes('tarifa') ||
      normDesc.includes('pagamento pix') ||
      normDesc.includes('debito')
    ) {
      // Se não havia sido marcado explicitamente
      if (!row[amountCol]?.includes('+')) {
        isIncome = false
      }
    }

    count++
    transactions.push({
      tempId: `csv-${count}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: isoDate,
      description: rawDesc.replace(/\s+/g, ' ').trim() || 'Lançamento bancário',
      amount: Math.round(parsedAmount * 100) / 100,
      type: isIncome ? 'income' : 'expense',
      category: '',
      entity: defaultEntity,
      selected: true,
      rawLine: row.join('; '),
    })
  }

  if (transactions.length === 0) {
    warnings.push('Não encontramos linhas com formato válido de data e valor no CSV.')
  }

  return {
    transactions,
    format: 'csv',
    totalFound: transactions.length,
    warnings,
    rawHeaders: firstRow,
    rawRows: parsedRows.slice(0, 10),
  }
}

/**
 * Parser principal: detecta se é OFX ou CSV e executa o processamento correspondente
 */
export function parseStatement(
  content: string,
  defaultEntity: TransactionEntity = 'pj',
): ParseResult {
  const trimmed = content.trim()
  if (!trimmed) {
    return {
      transactions: [],
      format: 'unknown',
      totalFound: 0,
      warnings: ['Extrato vazio. Envie um arquivo ou cole os dados.'],
    }
  }

  // Verifica se é OFX
  if (
    trimmed.toUpperCase().includes('<OFX>') ||
    trimmed.toUpperCase().includes('<STMTTRN>') ||
    trimmed.toUpperCase().includes('OFXHEADER')
  ) {
    return parseOFX(trimmed, defaultEntity)
  }

  // Caso contrário, trata como CSV / texto tabulado
  return parseCSV(trimmed, defaultEntity)
}

/**
 * Detecta duplicatas comparando transações do extrato com as já salvas no banco
 * Critério: mesma data (ou ±1 dia de compensação) + mesmo valor (margem 0.01) + descrição muito parecida
 */
export function markPossibleDuplicates(
  statementTransactions: ParsedStatementTransaction[],
  existingTransactions: Transaction[],
): ParsedStatementTransaction[] {
  return statementTransactions.map((st) => {
    const stNormDesc = normalizeText(st.description)
    const stDate = st.date.slice(0, 10)

    const duplicateMatch = existingTransactions.find((ex) => {
      // 1. Mesmo valor com tolerância de centavos
      const amountDiff = Math.abs(ex.amount - st.amount)
      if (amountDiff > 0.05) return false

      // 2. Mesmo tipo (se existente tem tipo compatível)
      if (ex.type !== st.type) return false

      // 3. Data igual ou ±1 dia (diferença de final de semana ou compensação bancária)
      const exDate = ex.date ? ex.date.slice(0, 10) : ''
      const dateMatches =
        exDate === stDate ||
        Math.abs(new Date(exDate).getTime() - new Date(stDate).getTime()) <= 86400000 * 2

      if (!dateMatches) return false

      // 4. Descrição similar (contém ou palavras-chave em comum)
      const exNormDesc = normalizeText(ex.description)
      if (stNormDesc.includes(exNormDesc) || exNormDesc.includes(stNormDesc)) return true

      // Tokens em comum
      const stWords = stNormDesc.split(' ').filter((w) => w.length >= 3)
      const exWords = new Set(exNormDesc.split(' ').filter((w) => w.length >= 3))
      const common = stWords.filter((w) => exWords.has(w))

      return common.length >= 1
    })

    if (duplicateMatch) {
      return {
        ...st,
        isDuplicate: true,
        duplicateReason: `Possível duplicata: já existe "${duplicateMatch.description}" de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(duplicateMatch.amount)} em ${duplicateMatch.date.slice(0, 10)}.`,
      }
    }

    return st
  })
}
