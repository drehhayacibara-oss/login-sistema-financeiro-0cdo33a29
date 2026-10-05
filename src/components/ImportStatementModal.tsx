import React, { useCallback, useId, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  CheckSquare,
  ClipboardPaste,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Info,
  Loader2,
  Sparkles,
  Square,
  Tag,
  UploadCloud,
  User,
  X,
} from 'lucide-react'
import { CATEGORIES_PF, CATEGORIES_PJ, SERVICES_PJ } from '@/constants/categories'
import { Briefcase } from 'lucide-react'
import {
  type ParsedStatementTransaction,
  markPossibleDuplicates,
  parseDateToISO,
  parseStatement,
} from '@/services/statementParser'
import {
  type CreateTransactionDTO,
  type Transaction,
  type TransactionEntity,
  type TransactionType,
  formatBRL,
  formatDatePtBR,
} from '@/services/transactions'

interface ImportStatementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingTransactions: Transaction[]
  onImportComplete: (createdCount: number) => void
  createTransactionFn: (dto: CreateTransactionDTO) => Promise<Transaction>
}

type ImportStep = 1 | 2 | 3
type InputMode = 'file' | 'text'

export const ImportStatementModal: React.FC<ImportStatementModalProps> = ({
  open,
  onOpenChange,
  existingTransactions,
  onImportComplete,
  createTransactionFn,
}) => {
  const fileInputId = useId()
  // Wizard state
  const [step, setStep] = useState<ImportStep>(1)
  const [inputMode, setInputMode] = useState<InputMode>('file')
  const [pastedText, setPastedText] = useState('')
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [rawFileContent, setRawFileContent] = useState<string>('')
  const [isDragOver, setIsDragOver] = useState(false)

  // Global context selection for batch import (default PJ)
  const [globalEntity, setGlobalEntity] = useState<TransactionEntity>('pj')
  // Global service selection for batch apply
  const [globalService, setGlobalService] = useState<string>('')

  // Parsed items
  const [parsedItems, setParsedItems] = useState<ParsedStatementTransaction[]>([])
  const [parseWarnings, setParseWarnings] = useState<string[]>([])
  const [detectedFormat, setDetectedFormat] = useState<string>('')

  // Column remapping fallback if CSV detection failed
  const [needsRemapping, setNeedsRemapping] = useState(false)
  const [rawHeaders, setRawHeaders] = useState<string[]>([])
  const [rawRowsSample, setRawRowsSample] = useState<string[][]>([])
  const [colMap, setColMap] = useState({ dateCol: 0, descCol: 1, amountCol: 2 })

  // Search/filter in Step 2
  const [filterQuery, setFilterQuery] = useState('')

  // Submission state
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  })
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Reseta estado ao fechar
  const resetAll = useCallback(() => {
    setStep(1)
    setInputMode('file')
    setPastedText('')
    setUploadedFileName(null)
    setRawFileContent('')
    setIsDragOver(false)
    setGlobalEntity('pj')
    setGlobalService('')
    setParsedItems([])
    setParseWarnings([])
    setDetectedFormat('')
    setNeedsRemapping(false)
    setRawHeaders([])
    setRawRowsSample([])
    setColMap({ dateCol: 0, descCol: 1, amountCol: 2 })
    setFilterQuery('')
    setIsImporting(false)
    setErrorMsg(null)
  }, [])

  const handleClose = (newOpen: boolean) => {
    if (!newOpen && !isImporting) {
      resetAll()
      onOpenChange(false)
    }
  }

  // Leitura do conteúdo do arquivo
  const processRawContent = (content: string, fileName?: string) => {
    setErrorMsg(null)
    if (!content.trim()) {
      setErrorMsg('O arquivo ou conteúdo informado está vazio.')
      return
    }

    const result = parseStatement(content, globalEntity)

    if (result.needsManualMapping) {
      setNeedsRemapping(true)
      setRawHeaders(result.rawHeaders || [])
      setRawRowsSample(result.rawRows || [])
      if (result.suggestedColumns) {
        setColMap(result.suggestedColumns)
      }
      setParseWarnings(result.warnings)
      setDetectedFormat(result.format.toUpperCase())
      setStep(2)
      return
    }

    if (result.transactions.length === 0) {
      setErrorMsg(
        result.warnings[0] ||
          'Nenhum lançamento foi reconhecido. Verifique se o arquivo é um CSV ou OFX válido.',
      )
      return
    }

    // Auto-detect duplicates com base nas transações já existentes do banco
    const withDuplicates = markPossibleDuplicates(result.transactions, existingTransactions)

    setParsedItems(withDuplicates)
    setParseWarnings(result.warnings)
    setDetectedFormat(result.format.toUpperCase())
    if (fileName) setUploadedFileName(fileName)
    setRawFileContent(content)
    setStep(2)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      processRawContent(text, file.name)
    }
    reader.onerror = () => {
      setErrorMsg('Falha ao ler o arquivo selecionado. Tente novamente.')
    }
    // Suporte tanto a UTF-8 quanto a ISO-8859-1 (muito comum em bancos brasileiros como BB e Caixa)
    reader.readAsText(file, 'UTF-8')
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      processRawContent(text, file.name)
    }
    reader.onerror = () => {
      setErrorMsg('Falha ao ler o arquivo selecionado. Tente novamente.')
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handlePastedSubmit = () => {
    if (!pastedText.trim()) {
      setErrorMsg('Cole o texto do seu extrato antes de prosseguir.')
      return
    }
    processRawContent(pastedText, 'Extrato colado')
  }

  // Aplica remapeamento manual em caso de CSV com colunas exóticas
  const applyManualMapping = () => {
    if (!rawFileContent) return

    const lines = rawFileContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)

    if (lines.length < 2) {
      setErrorMsg('Arquivo com poucas linhas para processar.')
      return
    }

    // Identifica separador provável
    const firstLine = lines[0]
    const delimiter = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ','

    const rows = lines
      .slice(1)
      .map((l) => l.split(delimiter).map((c) => c.replace(/^"|"$/g, '').trim()))

    const items: ParsedStatementTransaction[] = []
    let count = 0

    rows.forEach((row, rowIdx) => {
      const rawDate = row[colMap.dateCol]
      const rawDesc = row[colMap.descCol]
      const rawAmt = row[colMap.amountCol]

      const isoDate = parseDateToISO(rawDate)
      // Se não tiver data válida no remapeamento manual, pula a linha (cabeçalho repetido ou rodapé)
      if (!isoDate) return

      // Trata valor
      let cleanAmt = (rawAmt || '').replace(/R\$/gi, '').replace(/\s+/g, '')
      let isIncome = false
      if (cleanAmt.startsWith('-')) {
        isIncome = false
        cleanAmt = cleanAmt.replace('-', '')
      } else {
        isIncome = true
      }
      if (cleanAmt.includes(',') && cleanAmt.includes('.')) {
        if (cleanAmt.lastIndexOf(',') > cleanAmt.lastIndexOf('.')) {
          cleanAmt = cleanAmt.replace(/\./g, '').replace(',', '.')
        } else {
          cleanAmt = cleanAmt.replace(/,/g, '')
        }
      } else if (cleanAmt.includes(',')) {
        cleanAmt = cleanAmt.replace(',', '.')
      }
      const num = parseFloat(cleanAmt.replace(/[^0-9.]/g, ''))
      if (isNaN(num) || num <= 0) return

      count++
      items.push({
        tempId: `mapped-${count}-${Date.now()}-${rowIdx}`,
        date: isoDate,
        description: rawDesc || 'Lançamento bancário',
        amount: Math.round(num * 100) / 100,
        type: isIncome ? 'income' : 'expense',
        category: '',
        servico: globalEntity === 'pj' ? globalService || '' : '',
        entity: globalEntity,
        selected: true,
        hasValidDate: true,
        rawDate,
      })
    })

    if (items.length === 0) {
      setErrorMsg(
        'Não foi possível ler lançamentos com as colunas selecionadas. Tente outras colunas.',
      )
      return
    }

    const withDuplicates = markPossibleDuplicates(items, existingTransactions)
    setParsedItems(withDuplicates)
    setNeedsRemapping(false)
    setErrorMsg(null)
  }

  // Modificadores de itens no Step 2
  const toggleItemSelect = (tempId: string) => {
    setParsedItems((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, selected: !item.selected } : item)),
    )
  }

  const selectAll = () => {
    setParsedItems((prev) => prev.map((item) => ({ ...item, selected: true })))
  }

  const deselectAll = () => {
    setParsedItems((prev) => prev.map((item) => ({ ...item, selected: false })))
  }

  const updateItemField = (
    tempId: string,
    field: keyof ParsedStatementTransaction,
    value: unknown,
  ) => {
    setParsedItems((prev) =>
      prev.map((item) => {
        if (item.tempId !== tempId) return item
        const updated = { ...item, [field]: value }
        // Se mudou o tipo e a categoria não pertence mais, reseta a categoria
        if (field === 'type') {
          const list =
            updated.entity === 'pf'
              ? CATEGORIES_PF[value as TransactionType]
              : CATEGORIES_PJ[value as TransactionType]
          if (!list.includes(updated.category as never)) {
            updated.category = ''
          }
        }
        // Se mudou o entity e a categoria não pertence mais, reseta a categoria
        if (field === 'entity') {
          const list = value === 'pf' ? CATEGORIES_PF[updated.type] : CATEGORIES_PJ[updated.type]
          if (!list.includes(updated.category as never)) {
            updated.category = ''
          }
        }
        return updated
      }),
    )
  }

  // Atualiza contexto global para todos os itens
  const handleApplyGlobalEntity = (newEntity: TransactionEntity) => {
    setGlobalEntity(newEntity)
    setParsedItems((prev) =>
      prev.map((item) => {
        const list = newEntity === 'pf' ? CATEGORIES_PF[item.type] : CATEGORIES_PJ[item.type]
        const keepCat = list.includes(item.category as never) ? item.category : ''
        return {
          ...item,
          entity: newEntity,
          category: keepCat,
          servico: newEntity === 'pf' ? '' : item.servico,
        }
      }),
    )
  }

  // Aplica serviço em lote para todos os itens selecionados (ou todos da PJ)
  const handleApplyGlobalService = (newService: string) => {
    setGlobalService(newService)
    setParsedItems((prev) =>
      prev.map((item) => {
        if (item.entity !== 'pj') return item
        return {
          ...item,
          servico: newService,
        }
      }),
    )
  }

  // Filtro de busca no Step 2
  const filteredItems = useMemo(() => {
    if (!filterQuery.trim()) return parsedItems
    const q = filterQuery.toLowerCase()
    return parsedItems.filter(
      (it) =>
        it.description.toLowerCase().includes(q) ||
        it.date.includes(q) ||
        it.amount.toString().includes(q) ||
        it.category.toLowerCase().includes(q),
    )
  }, [parsedItems, filterQuery])

  // Contagens selecionadas
  const selectedItems = useMemo(() => parsedItems.filter((i) => i.selected), [parsedItems])

  const incomeCount = useMemo(
    () => selectedItems.filter((i) => i.type === 'income').length,
    [selectedItems],
  )
  const expenseCount = useMemo(
    () => selectedItems.filter((i) => i.type === 'expense').length,
    [selectedItems],
  )
  const totalIncomeAmount = useMemo(
    () => selectedItems.filter((i) => i.type === 'income').reduce((sum, i) => sum + i.amount, 0),
    [selectedItems],
  )
  const totalExpenseAmount = useMemo(
    () => selectedItems.filter((i) => i.type === 'expense').reduce((sum, i) => sum + i.amount, 0),
    [selectedItems],
  )

  const duplicatesCount = useMemo(
    () => parsedItems.filter((i) => i.isDuplicate).length,
    [parsedItems],
  )

  // Desmarcar todas as duplicatas rapidamente
  const deselectDuplicates = () => {
    setParsedItems((prev) =>
      prev.map((item) => (item.isDuplicate ? { ...item, selected: false } : item)),
    )
  }

  // Validação de itens antes de avançar para a Etapa 3 ou importar:
  // NUNCA permitir lançamentos selecionados sem data real do extrato ou com data inválida
  const invalidDateSelectedItems = useMemo(() => {
    return selectedItems.filter((i) => !i.date || !i.date.trim() || !parseDateToISO(i.date))
  }, [selectedItems])

  const handleAdvanceToStep3 = () => {
    if (invalidDateSelectedItems.length > 0) {
      setErrorMsg(
        `Existem ${invalidDateSelectedItems.length} lançamento(s) selecionado(s) com data ausente ou inválida. Ajuste a data no campo de cada linha ou desmarque-o(s) antes de avançar.`,
      )
      return
    }
    setErrorMsg(null)
    setStep(3)
  }

  // Disparo da importação (Etapa 3)
  const handleExecuteImport = async () => {
    if (selectedItems.length === 0) {
      setErrorMsg('Selecione pelo menos um lançamento para importar.')
      return
    }

    if (invalidDateSelectedItems.length > 0) {
      setErrorMsg(
        `Não é possível salvar: existem ${invalidDateSelectedItems.length} lançamento(s) selecionado(s) com data inválida ou ausente. Volte para a revisão e defina as datas.`,
      )
      setStep(2)
      return
    }

    try {
      setIsImporting(true)
      setErrorMsg(null)
      setImportProgress({ current: 0, total: selectedItems.length })

      let count = 0
      for (const item of selectedItems) {
        // Categoria padrão caso usuário não tenha preenchido
        const finalCategory =
          item.category.trim() ||
          (item.entity === 'pf'
            ? item.type === 'income'
              ? 'OUTRAS RECEITAS'
              : 'DESPESAS EXTRAS'
            : item.type === 'income'
              ? 'Receitas totais Cirurgias Hospitais Externos particular'
              : 'Outros Variaveis')

        // Garante que a data está em formato ISO YYYY-MM-DD
        const validIsoDate = parseDateToISO(item.date) || item.date
        if (!validIsoDate) {
          throw new Error(
            `O lançamento "${item.description.slice(0, 30)}" não possui data válida para gravação.`,
          )
        }

        await createTransactionFn({
          type: item.type,
          entity: item.entity,
          amount: item.amount,
          description: item.description.trim() || 'Lançamento bancário',
          category: finalCategory,
          servico: item.entity === 'pj' ? item.servico?.trim() || '' : '',
          date: validIsoDate,
        })

        count++
        setImportProgress({ current: count, total: selectedItems.length })
      }

      onImportComplete(count)
      resetAll()
      onOpenChange(false)
    } catch (err: unknown) {
      console.error('Erro na importação em lote:', err)
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Ocorreu um erro ao gravar as transações. Alguns itens podem não ter sido importados.',
      )
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col border border-white/10 bg-[#0D0D11] text-white shadow-2xl sm:rounded-2xl p-0 overflow-hidden">
        {/* Cabeçalho do Wizard */}
        <div className="border-b border-white/[0.08] p-5 sm:p-6 bg-[#08080B]/60">
          <DialogHeader className="text-left">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E10613]/15 text-[#E10613]">
                  <FileSpreadsheet className="h-5 w-5" />
                </span>
                Importar Extrato Bancário
              </DialogTitle>

              {/* Indicador de passos */}
              <div className="hidden sm:flex items-center gap-2 text-xs">
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-colors ${
                    step === 1
                      ? 'bg-[#E10613] text-white'
                      : step > 1
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-white/[0.04] text-white/40'
                  }`}
                >
                  <span>1. Enviar</span>
                </div>
                <span className="text-white/20">→</span>
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-colors ${
                    step === 2
                      ? 'bg-[#E10613] text-white'
                      : step > 2
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-white/[0.04] text-white/40'
                  }`}
                >
                  <span>2. Revisar</span>
                </div>
                <span className="text-white/20">→</span>
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-colors ${
                    step === 3 ? 'bg-[#E10613] text-white' : 'bg-white/[0.04] text-white/40'
                  }`}
                >
                  <span>3. Confirmar</span>
                </div>
              </div>
            </div>
            <DialogDescription className="text-xs text-white/50 mt-1">
              {step === 1 &&
                'Envie um arquivo CSV ou OFX do seu banco ou cole o extrato para criar transações de forma guiada.'}
              {step === 2 &&
                'Revise as linhas detectadas, ajuste categorias e desmarque o que não quiser salvar.'}
              {step === 3 &&
                'Tudo pronto! Confira o resumo das receitas e despesas antes de salvar no sistema.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Mensagem de Erro Geral */}
        {errorMsg && (
          <div className="mx-6 mt-4 flex items-center justify-between rounded-xl border border-[#E10613]/30 bg-[#E10613]/10 p-3 text-xs text-[#FCA5A5] animate-error-shake">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-[#E10613]" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-white/40 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Corpo do Wizard por Etapa */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar space-y-5">
          {/* ETAPA 1: Enviar Arquivo ou Colar */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Contexto Global de Importação */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#08080B]/40 p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-white/70 block">
                    Contexto padrão do extrato
                  </Label>
                  <span className="text-[11px] text-white/40">
                    Você poderá ajustar linha a linha na próxima etapa
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGlobalEntity('pj')}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs sm:text-sm font-bold transition-all ${
                      globalEntity === 'pj'
                        ? 'border-[#E10613]/60 bg-[#E10613]/15 text-white shadow-[0_0_15px_rgba(225,6,19,0.25)]'
                        : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <Building2
                      className={`h-4 w-4 ${globalEntity === 'pj' ? 'text-[#E10613]' : 'text-white/40'}`}
                    />
                    Pessoa Jurídica (PJ)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGlobalEntity('pf')}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs sm:text-sm font-bold transition-all ${
                      globalEntity === 'pf'
                        ? 'border-[#E10613]/60 bg-[#E10613]/15 text-white shadow-[0_0_15px_rgba(225,6,19,0.25)]'
                        : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <User
                      className={`h-4 w-4 ${globalEntity === 'pf' ? 'text-[#E10613]' : 'text-white/40'}`}
                    />
                    Pessoa Física (PF)
                  </button>
                </div>
              </div>

              {/* Toggle Modo: Arquivo ou Colar Texto */}
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#08080B] p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setInputMode('file')}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 font-bold transition-colors ${
                    inputMode === 'file'
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-white/40 hover:text-white'
                  }`}
                >
                  <UploadCloud className="h-4 w-4" />
                  Enviar arquivo (.CSV ou .OFX)
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('text')}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 font-bold transition-colors ${
                    inputMode === 'text'
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-white/40 hover:text-white'
                  }`}
                >
                  <ClipboardPaste className="h-4 w-4" />
                  Colar texto do extrato
                </button>
              </div>

              {/* Opção 1: Dropzone de Arquivo */}
              {inputMode === 'file' ? (
                <div>
                  <input
                    type="file"
                    id={fileInputId}
                    accept=".csv,.ofx,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div
                    onDragOver={(e) => {
                      e.preventDefault()
                      setIsDragOver(true)
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => {
                      document.getElementById(fileInputId)?.click()
                    }}
                    className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
                      isDragOver
                        ? 'border-[#E10613] bg-[#E10613]/10 scale-[1.01]'
                        : 'border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E10613]/15 text-[#E10613] mb-4">
                      <UploadCloud className="h-7 w-7" />
                    </div>
                    <p className="text-base font-bold text-white">
                      Arraste seu arquivo aqui ou clique para selecionar
                    </p>
                    <p className="mt-1 text-xs text-white/50 max-w-md">
                      Formatos aceitos: <strong className="text-white/80">.CSV</strong> (separado
                      por vírgula ou ponto e vírgula) ou{' '}
                      <strong className="text-white/80">.OFX</strong> (padrão de exportação
                      bancária).
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/70">
                      <FileText className="h-3.5 w-3.5 text-[#E10613]" />
                      Escolher arquivo no computador
                    </span>
                  </div>
                </div>
              ) : (
                /* Opção 2: Textarea para colar */
                <div className="space-y-3">
                  <Label htmlFor="paste-content" className="text-xs font-semibold text-white/70">
                    Cole o conteúdo do extrato copiado do internet banking:
                  </Label>
                  <textarea
                    id="paste-content"
                    rows={8}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Exemplo:&#10;05/04/2026;PIX RECEBIDO CLIENTE;250,00&#10;06/04/2026;ENERGIA ELETRICA;-120,50&#10;07/04/2026;PAGAMENTO FORNECEDOR;-800,00"
                    className="w-full rounded-xl border border-white/10 bg-[#08080B] p-3 text-xs font-mono text-white placeholder:text-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E10613]"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={handlePastedSubmit}
                      disabled={!pastedText.trim()}
                      className="rounded-xl bg-[#E10613] px-5 text-xs font-bold text-white hover:bg-[#C00510]"
                    >
                      Processar texto colado <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Guia simples para o usuário iniciante */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#08080B] p-4 text-xs text-white/60 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold">
                  <HelpCircle className="h-4 w-4 text-[#E10613]" />
                  <span>Como baixar o extrato no seu banco?</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-white/50 leading-relaxed text-[11px] sm:text-xs">
                  <li>
                    Acesse o Internet Banking ou aplicativo do seu banco (ex: Itaú, Bradesco,
                    Santander, Banco do Brasil, Nubank, Inter, Caixa, Sicredi, etc).
                  </li>
                  <li>
                    Vá até a tela de <strong className="text-white/70">Extrato</strong> e selecione
                    o período desejado (últimos 30 dias ou mês atual).
                  </li>
                  <li>
                    Procure pelo botão <strong className="text-white/70">Exportar</strong>,{' '}
                    <strong className="text-white/70">Salvar</strong> ou{' '}
                    <strong className="text-white/70">Baixar arquivo</strong> e escolha o formato{' '}
                    <strong className="text-white/70">OFX</strong> ou{' '}
                    <strong className="text-white/70">CSV</strong>.
                  </li>
                  <li>
                    Envie o arquivo baixado aqui no Rubra. Faremos a leitura de datas, valores e
                    identificaremos receitas e despesas automaticamente.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* ETAPA 2: Pré-visualizar e Revisar */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Fallback de remapeamento manual caso colunas não sejam reconhecidas */}
              {needsRemapping ? (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span>
                      Não conseguimos identificar as colunas do seu arquivo automaticamente
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-200/80 leading-relaxed">
                    Indique abaixo qual coluna corresponde à Data, à Descrição e ao Valor para
                    continuarmos:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <Label className="text-[11px] font-semibold text-white/80 block mb-1">
                        Coluna de Data:
                      </Label>
                      <select
                        value={colMap.dateCol}
                        onChange={(e) =>
                          setColMap((prev) => ({ ...prev, dateCol: Number(e.target.value) }))
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#08080B] p-2 text-xs text-white"
                      >
                        {rawHeaders.map((h, i) => (
                          <option key={i} value={i}>
                            Coluna {i + 1}: {h || `(sem título)`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-[11px] font-semibold text-white/80 block mb-1">
                        Coluna de Descrição:
                      </Label>
                      <select
                        value={colMap.descCol}
                        onChange={(e) =>
                          setColMap((prev) => ({ ...prev, descCol: Number(e.target.value) }))
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#08080B] p-2 text-xs text-white"
                      >
                        {rawHeaders.map((h, i) => (
                          <option key={i} value={i}>
                            Coluna {i + 1}: {h || `(sem título)`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-[11px] font-semibold text-white/80 block mb-1">
                        Coluna de Valor:
                      </Label>
                      <select
                        value={colMap.amountCol}
                        onChange={(e) =>
                          setColMap((prev) => ({ ...prev, amountCol: Number(e.target.value) }))
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#08080B] p-2 text-xs text-white"
                      >
                        {rawHeaders.map((h, i) => (
                          <option key={i} value={i}>
                            Coluna {i + 1}: {h || `(sem título)`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {rawRowsSample.length > 0 && (
                    <div className="mt-2 overflow-x-auto rounded-lg border border-white/10 bg-[#08080B]/60 p-2">
                      <p className="text-[10px] uppercase font-bold text-white/40 mb-1">
                        Amostra das primeiras linhas:
                      </p>
                      <div className="text-[10px] font-mono text-white/70 space-y-1">
                        {rawRowsSample.slice(0, 3).map((r, i) => (
                          <div key={i} className="truncate">
                            {r.join(' | ')}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="rounded-xl border-white/10 text-xs"
                    >
                      Voltar e reenviar outro arquivo
                    </Button>
                    <Button
                      type="button"
                      onClick={applyManualMapping}
                      className="rounded-xl bg-[#E10613] text-xs font-bold text-white hover:bg-[#C00510]"
                    >
                      Processar com estas colunas
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Barra de Ações Rápidas no topo da Etapa 2 */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#08080B] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        {selectedItems.length} de {parsedItems.length} selecionados
                      </span>
                      <span className="text-white/20">•</span>
                      <span className="text-xs text-emerald-400 font-semibold">
                        +{incomeCount} receitas ({formatBRL(totalIncomeAmount)})
                      </span>
                      <span className="text-white/20">•</span>
                      <span className="text-xs text-[#FCA5A5] font-semibold">
                        -{expenseCount} despesas ({formatBRL(totalExpenseAmount)})
                      </span>
                      {detectedFormat && (
                        <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-mono uppercase text-white/50">
                          {detectedFormat}
                        </span>
                      )}
                    </div>

                    {/* Seletores Globais em Lote: PF/PJ e Serviço */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-white/50 font-semibold">
                          Contexto em lote:
                        </span>
                        <div className="flex items-center rounded-xl border border-white/10 bg-[#0D0D11] p-0.5 text-xs">
                          <button
                            type="button"
                            onClick={() => handleApplyGlobalEntity('pj')}
                            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                              globalEntity === 'pj'
                                ? 'bg-[#E10613]/25 text-white border border-[#E10613]/50'
                                : 'text-white/40 hover:text-white'
                            }`}
                          >
                            <Building2 className="h-3 w-3" />
                            PJ
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyGlobalEntity('pf')}
                            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                              globalEntity === 'pf'
                                ? 'bg-sky-500/25 text-sky-300 border border-sky-500/50'
                                : 'text-white/40 hover:text-white'
                            }`}
                          >
                            <User className="h-3 w-3" />
                            PF
                          </button>
                        </div>
                      </div>

                      {/* Seletor em lote de Serviço para PJ */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-white/50 font-semibold flex items-center gap-1">
                          <Briefcase className="h-3 w-3 text-[#E10613]" />
                          Serviço em lote:
                        </span>
                        <select
                          value={globalService}
                          onChange={(e) => handleApplyGlobalService(e.target.value)}
                          className="h-7 rounded-lg border border-white/10 bg-[#0D0D11] px-2 text-[11px] text-white"
                        >
                          <option value="">(Sem serviço / Definir por linha)</option>
                          {SERVICES_PJ.map((srv) => (
                            <option key={srv} value={srv}>
                              {srv}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Alerta de datas ausentes/inválidas */}
                  {invalidDateSelectedItems.length > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-red-500/40 bg-red-500/15 p-3 text-xs text-red-200">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                        <span>
                          Atenção: <strong>{invalidDateSelectedItems.length}</strong> lançamento(s)
                          selecionado(s) está(ão) sem data válida do extrato. Ajuste o campo de data
                          ou desmarque a linha antes de avançar.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Alerta de avisos gerais de parsing (ex: OFX com campos incompletos) */}
                  {parseWarnings.length > 0 && invalidDateSelectedItems.length === 0 && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 space-y-1">
                      <div className="flex items-center gap-2 font-bold text-amber-400">
                        <Info className="h-4 w-4 shrink-0" />
                        <span>Avisos na leitura do extrato:</span>
                      </div>
                      <div className="max-h-24 overflow-y-auto pl-6 custom-scrollbar text-[11px] text-amber-200/80 space-y-0.5">
                        {parseWarnings.map((w, idx) => (
                          <p key={idx}>• {w}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Alerta de duplicatas detectadas */}
                  {duplicatesCount > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                        <span>
                          Detectamos <strong>{duplicatesCount}</strong> possível(is) lançamento(s)
                          duplicado(s) com base no seu histórico já salvo.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={deselectDuplicates}
                        className="self-start sm:self-auto rounded-lg border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-400/20"
                      >
                        Desmarcar duplicatas
                      </button>
                    </div>
                  )}

                  {/* Barra de controle: Selecionar todos / Desmarcar todos + Busca rápida */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAll}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-semibold text-white/70 hover:bg-white/[0.08] hover:text-white"
                      >
                        <CheckSquare className="h-3.5 w-3.5 text-emerald-400" />
                        Marcar todas
                      </button>
                      <button
                        type="button"
                        onClick={deselectAll}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-semibold text-white/70 hover:bg-white/[0.08] hover:text-white"
                      >
                        <Square className="h-3.5 w-3.5 text-white/40" />
                        Desmarcar todas
                      </button>
                    </div>

                    <div className="w-full sm:w-64">
                      <Input
                        type="text"
                        placeholder="Buscar nesta lista..."
                        value={filterQuery}
                        onChange={(e) => setFilterQuery(e.target.value)}
                        className="h-8 rounded-xl border-white/10 bg-[#08080B] text-xs text-white placeholder:text-white/30"
                      />
                    </div>
                  </div>

                  {/* Lista de Transações Detectadas */}
                  <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
                    {filteredItems.map((item) => {
                      const isIncome = item.type === 'income'
                      const categoriesList =
                        item.entity === 'pf' ? CATEGORIES_PF[item.type] : CATEGORIES_PJ[item.type]

                      return (
                        <div
                          key={item.tempId}
                          className={`rounded-xl border transition-all p-3 sm:p-3.5 ${
                            item.selected
                              ? 'border-white/15 bg-[#08080B]/80 shadow-sm'
                              : 'border-white/5 bg-white/[0.01] opacity-55'
                          } ${item.isDuplicate ? 'border-amber-500/30 bg-amber-500/[0.03]' : ''}`}
                        >
                          <div className="flex flex-col gap-3">
                            {/* Linha principal: Checkbox, Data, Tipo, Valor */}
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <input
                                  type="checkbox"
                                  checked={item.selected}
                                  onChange={() => toggleItemSelect(item.tempId)}
                                  className="h-4 w-4 rounded border-white/20 bg-[#0D0D11] text-[#E10613] focus:ring-[#E10613] cursor-pointer"
                                />

                                {/* Indicador / Toggle Tipo Receita vs Despesa */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateItemField(
                                      item.tempId,
                                      'type',
                                      isIncome ? 'expense' : 'income',
                                    )
                                  }
                                  title="Clique para alternar entre Receita e Despesa"
                                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all ${
                                    isIncome
                                      ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
                                      : 'border-[#E10613]/30 bg-[#E10613]/15 text-[#E10613]'
                                  }`}
                                >
                                  {isIncome ? (
                                    <ArrowUpRight className="h-4 w-4" />
                                  ) : (
                                    <ArrowDownRight className="h-4 w-4" />
                                  )}
                                </button>

                                {/* Data editável */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <input
                                    type="date"
                                    value={item.date}
                                    onChange={(e) =>
                                      updateItemField(item.tempId, 'date', e.target.value)
                                    }
                                    className={`h-8 rounded-lg border px-2 text-xs text-white [color-scheme:dark] transition-colors ${
                                      !item.date || !parseDateToISO(item.date)
                                        ? 'border-red-500 bg-red-500/10 text-red-200 ring-2 ring-red-500/50'
                                        : 'border-white/10 bg-[#0D0D11]'
                                    }`}
                                  />
                                  {(!item.date || !parseDateToISO(item.date)) && (
                                    <span
                                      title="Data ausente no extrato. Selecione a data correta."
                                      className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-400"
                                    >
                                      Sem data!
                                    </span>
                                  )}
                                </div>

                                {/* Toggle PF / PJ individual */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateItemField(
                                      item.tempId,
                                      'entity',
                                      item.entity === 'pj' ? 'pf' : 'pj',
                                    )
                                  }
                                  className={`h-8 px-2 rounded-lg border text-[10px] font-extrabold uppercase tracking-wider transition-colors shrink-0 ${
                                    item.entity === 'pf'
                                      ? 'border-sky-500/30 bg-sky-500/10 text-sky-400'
                                      : 'border-[#E10613]/30 bg-[#E10613]/10 text-[#FCA5A5]'
                                  }`}
                                >
                                  {item.entity === 'pf' ? 'PF' : 'PJ'}
                                </button>
                              </div>

                              {/* Valor */}
                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className={`text-sm sm:text-base font-extrabold ${
                                    isIncome ? 'text-emerald-400' : 'text-[#FCA5A5]'
                                  }`}
                                >
                                  {isIncome ? '+' : '-'} {formatBRL(item.amount)}
                                </span>
                              </div>
                            </div>

                            {/* Linha secundária: Descrição editável, Categoria e Serviço por linha */}
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pl-7 sm:pl-7">
                              {/* Descrição */}
                              <div className="sm:col-span-5">
                                <Input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) =>
                                    updateItemField(item.tempId, 'description', e.target.value)
                                  }
                                  placeholder="Descrição do lançamento"
                                  className="h-8 rounded-lg border-white/10 bg-[#0D0D11] text-xs text-white placeholder:text-white/30"
                                />
                              </div>

                              {/* Categoria */}
                              <div className="sm:col-span-4 relative">
                                <select
                                  value={item.category}
                                  onChange={(e) =>
                                    updateItemField(item.tempId, 'category', e.target.value)
                                  }
                                  className={`w-full h-8 rounded-lg border px-2.5 text-xs transition-colors ${
                                    item.category
                                      ? 'border-[#E10613]/50 bg-[#0D0D11] text-white font-medium'
                                      : 'border-white/10 bg-[#0D0D11] text-white/40'
                                  }`}
                                >
                                  <option value="">
                                    Selecione categoria ({item.entity.toUpperCase()})...
                                  </option>
                                  {categoriesList.map((cat) => (
                                    <option key={cat} value={cat}>
                                      {cat}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Serviço / Centro de Custo por linha */}
                              <div className="sm:col-span-3 relative">
                                <select
                                  value={item.servico || ''}
                                  disabled={item.entity !== 'pj'}
                                  onChange={(e) =>
                                    updateItemField(item.tempId, 'servico', e.target.value)
                                  }
                                  className={`w-full h-8 rounded-lg border px-2 text-[11px] transition-colors ${
                                    item.entity !== 'pj'
                                      ? 'border-white/5 bg-white/[0.02] text-white/20 cursor-not-allowed'
                                      : item.servico
                                        ? 'border-[#E10613]/60 bg-[#0D0D11] text-[#FCA5A5] font-semibold'
                                        : 'border-white/10 bg-[#0D0D11] text-white/40'
                                  }`}
                                >
                                  <option value="">(Sem serviço)</option>
                                  {SERVICES_PJ.map((srv) => (
                                    <option key={srv} value={srv}>
                                      {srv}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Alerta de duplicata discreto */}
                            {item.isDuplicate && (
                              <div className="flex items-center gap-1.5 pl-7 text-[11px] text-amber-400/90 font-medium">
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                <span>{item.duplicateReason}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ETAPA 3: Confirmação e Resumo */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/[0.08] bg-[#08080B] p-6 text-center">
                <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 mb-4">
                  <Sparkles className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-white">Pronto para importar</h3>
                <p className="mt-1 text-xs text-white/50 max-w-md mx-auto">
                  Confira o resumo financeiro dos lançamentos selecionados que serão adicionados ao
                  seu painel.
                </p>

                {/* Cards de Resumo */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                  {/* Total de Itens */}
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                      Lançamentos Selecionados
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-white">
                      {selectedItems.length}
                    </p>
                    <p className="text-[11px] text-white/40 mt-1">
                      {parsedItems.length - selectedItems.length} desmarcados
                    </p>
                  </div>

                  {/* Receitas */}
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/70">
                      {incomeCount} Receitas
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-emerald-400">
                      +{formatBRL(totalIncomeAmount)}
                    </p>
                    <p className="text-[11px] text-white/40 mt-1">Entradas previstas</p>
                  </div>

                  {/* Despesas */}
                  <div className="rounded-xl border border-[#E10613]/20 bg-[#E10613]/5 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#FCA5A5]/70">
                      {expenseCount} Despesas
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-[#FCA5A5]">
                      -{formatBRL(totalExpenseAmount)}
                    </p>
                    <p className="text-[11px] text-white/40 mt-1">Saídas previstas</p>
                  </div>
                </div>

                {/* Divisão PF / PJ */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-white/60">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-[#E10613]" />
                    Pessoa Jurídica (PJ):{' '}
                    <strong className="text-white">
                      {selectedItems.filter((i) => i.entity === 'pj').length} lançamentos
                    </strong>
                  </span>
                  <span className="text-white/20">•</span>
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-sky-400" />
                    Pessoa Física (PF):{' '}
                    <strong className="text-white">
                      {selectedItems.filter((i) => i.entity === 'pf').length} lançamentos
                    </strong>
                  </span>
                </div>
              </div>

              {/* Informação sobre gravação segura */}
              <div className="rounded-xl border border-white/[0.08] bg-[#08080B]/60 p-4 flex items-start gap-3 text-xs text-white/50">
                <Info className="h-4 w-4 shrink-0 text-[#E10613] mt-0.5" />
                <p className="leading-relaxed">
                  Os lançamentos serão gravados diretamente na base de dados do Rubra vinculados ao
                  seu usuário. Você poderá editá-los ou excluí-los a qualquer momento pelo extrato
                  do dashboard.
                </p>
              </div>

              {/* Barra de Progresso quando estiver importando */}
              {isImporting && (
                <div className="rounded-xl border border-[#E10613]/30 bg-[#E10613]/10 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-[#E10613]" />
                      Importando lançamentos...
                    </span>
                    <span>
                      {importProgress.current} de {importProgress.total}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-[#E10613] transition-all duration-200"
                      style={{
                        width: `${
                          importProgress.total > 0
                            ? Math.round((importProgress.current / importProgress.total) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé de Navegação do Wizard */}
        <div className="border-t border-white/[0.08] p-4 sm:p-5 bg-[#08080B]/80 flex items-center justify-between gap-3">
          {/* Botão Voltar ou Cancelar */}
          {step === 1 ? (
            <Button
              type="button"
              variant="outline"
              disabled={isImporting}
              onClick={() => handleClose(false)}
              className="rounded-xl border-white/10 bg-white/[0.02] text-xs font-semibold text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              Cancelar
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={isImporting}
              onClick={() => setStep((prev) => (prev > 1 ? ((prev - 1) as ImportStep) : prev))}
              className="rounded-xl border-white/10 bg-white/[0.02] text-xs font-semibold text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Voltar
            </Button>
          )}

          {/* Botão Avançar / Concluir */}
          <div className="flex items-center gap-2">
            {step === 2 && !needsRemapping && (
              <Button
                type="button"
                onClick={handleAdvanceToStep3}
                disabled={selectedItems.length === 0}
                className="rounded-xl bg-[#E10613] px-5 text-xs font-bold text-white shadow-[0_0_20px_rgba(225,6,19,0.3)] hover:bg-[#C00510]"
              >
                Avançar para confirmação ({selectedItems.length}){' '}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            )}

            {step === 3 && (
              <Button
                type="button"
                onClick={handleExecuteImport}
                disabled={isImporting || selectedItems.length === 0}
                className="rounded-xl bg-[#E10613] px-6 text-sm font-bold text-white shadow-[0_0_24px_rgba(225,6,19,0.4)] hover:bg-[#C00510] focus:ring-4 focus:ring-[#E10613]/30"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gravando {importProgress.current}/{importProgress.total}...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Confirmar e Importar {selectedItems.length} Lançamentos
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
