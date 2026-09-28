import React from 'react'
import { ArrowDownRight, ArrowUpRight, Calendar, DollarSign, Tag, Trash2 } from 'lucide-react'
import type { Transaction } from '@/services/transactions'
import { formatBRL, formatDatePtBR } from '@/services/transactions'

interface TransactionListProps {
  transactions: Transaction[]
  showEntityBadge?: boolean
  onDelete?: (id: string) => void
  onNewTransaction: () => void
  onImportStatement?: () => void
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  showEntityBadge = true,
  onDelete,
  onNewTransaction,
  onImportStatement,
}) => {
  if (transactions.length === 0) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#08080B]/40 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
          <DollarSign className="h-6 w-6 text-white/30" />
        </div>
        <p className="mt-4 text-base font-bold text-white">Nenhum lançamento encontrado</p>
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-white/40">
          Você ainda não possui transações cadastradas. Comece criando um lançamento manual ou
          importe seu extrato bancário.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onNewTransaction}
            className="inline-flex items-center gap-2 rounded-xl bg-[#E10613] px-4 py-2.5 text-xs font-bold text-white shadow-[0_0_20px_rgba(225,6,19,0.3)] transition-all hover:bg-[#C00510]"
          >
            Criar primeiro lançamento
          </button>
          {onImportStatement && (
            <button
              type="button"
              onClick={onImportStatement}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-white transition-all hover:border-[#E10613]/50 hover:bg-[#E10613]/10"
            >
              Importar extrato CSV / OFX
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#0D0D11]">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-white/[0.08] bg-[#08080B]/60 text-[11px] font-bold uppercase tracking-wider text-white/40">
          <tr>
            <th className="px-5 py-4">Tipo & Descrição</th>
            <th className="px-4 py-4">Categoria</th>
            <th className="px-4 py-4">Data</th>
            <th className="px-5 py-4 text-right">Valor</th>
            {onDelete && <th className="px-4 py-4 text-center w-12">Ação</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {transactions.map((t) => {
            const isIncome = t.type === 'income'
            return (
              <tr key={t.id} className="group transition-colors hover:bg-white/[0.02]">
                {/* Tipo e Descrição */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                        isIncome
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                          : 'border-[#E10613]/20 bg-[#E10613]/10 text-[#E10613]'
                      }`}
                    >
                      {isIncome ? (
                        <ArrowUpRight className="h-4 w-4 stroke-[2.5]" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 stroke-[2.5]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-white group-hover:text-white/95">
                          {t.description}
                        </p>
                        {showEntityBadge && (
                          <span
                            className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border ${
                              t.entity === 'pf'
                                ? 'border-sky-500/30 bg-sky-500/10 text-sky-400'
                                : 'border-[#E10613]/30 bg-[#E10613]/10 text-[#FCA5A5]'
                            }`}
                          >
                            {t.entity === 'pf' ? 'PF' : 'PJ'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/40 sm:hidden">
                        {showEntityBadge && (
                          <span className="font-bold text-white/60 mr-1">
                            [{t.entity === 'pf' ? 'PF' : 'PJ'}]
                          </span>
                        )}
                        {t.category} • {formatDatePtBR(t.date)}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Categoria */}
                <td className="hidden px-4 py-3.5 sm:table-cell">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-white/70">
                    <Tag className="h-3 w-3 text-white/35" />
                    {t.category}
                  </span>
                </td>

                {/* Data */}
                <td className="hidden px-4 py-3.5 text-xs text-white/60 sm:table-cell whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-white/30" />
                    {formatDatePtBR(t.date)}
                  </span>
                </td>

                {/* Valor */}
                <td className="px-5 py-3.5 text-right font-extrabold whitespace-nowrap">
                  <span className={`${isIncome ? 'text-emerald-400' : 'text-[#FCA5A5]'}`}>
                    {isIncome ? '+' : '-'} {formatBRL(t.amount)}
                  </span>
                </td>

                {/* Ação de Excluir */}
                {onDelete && (
                  <td className="px-4 py-3.5 text-center">
                    <button
                      type="button"
                      title="Excluir transação"
                      onClick={() => onDelete(t.id)}
                      className="rounded-lg p-1.5 text-white/30 transition-colors hover:bg-white/[0.06] hover:text-[#E10613] focus:outline-none focus:ring-2 focus:ring-[#E10613]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
