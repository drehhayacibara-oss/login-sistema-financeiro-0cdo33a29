import React from 'react'
import type { CategorySummary } from '@/services/transactions'
import { formatBRL } from '@/services/transactions'

interface ExpenseCategoriesCardProps {
  categories: CategorySummary[]
}

const CATEGORY_COLORS = [
  '#E10613', // Rubra Red
  '#F59E0B', // Amber
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#6366F1', // Indigo
  '#14B8A6', // Teal
]

export const ExpenseCategoriesCard: React.FC<ExpenseCategoriesCardProps> = ({ categories }) => {
  const totalExpense = categories.reduce((sum, c) => sum + c.total, 0)

  if (categories.length === 0 || totalExpense === 0) {
    return (
      <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#08080B]/40 p-6 text-center">
        <p className="text-sm font-semibold text-white/70">Nenhuma despesa registrada</p>
        <p className="mt-1 max-w-xs text-xs text-white/40">
          Assim que você cadastrar despesas, a distribuição por categorias será exibida aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col justify-between h-full space-y-5">
      {/* Total das despesas */}
      <div className="flex items-baseline justify-between border-b border-white/[0.08] pb-4">
        <span className="text-xs uppercase tracking-wider text-white/40">Total em Despesas</span>
        <span className="text-lg font-extrabold text-[#FCA5A5]">{formatBRL(totalExpense)}</span>
      </div>

      {/* Barra de distribuição empilhada */}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/[0.05]">
        {categories.slice(0, 5).map((cat, idx) => (
          <div
            key={cat.category}
            title={`${cat.category}: ${cat.percentage.toFixed(1)}%`}
            style={{
              width: `${cat.percentage}%`,
              backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
            }}
            className="transition-all hover:opacity-85"
          />
        ))}
      </div>

      {/* Lista detalhada por categoria */}
      <div className="space-y-3 overflow-y-auto max-h-[220px] pr-1">
        {categories.map((cat, idx) => {
          const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
          return (
            <div key={cat.category} className="group flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate font-semibold text-white/80 group-hover:text-white">
                    {cat.category}
                  </span>
                  <span className="text-[10px] text-white/35">({cat.count})</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-white">{formatBRL(cat.total)}</span>
                  <span className="text-[11px] font-semibold text-white/40 w-11 text-right">
                    {cat.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/[0.04]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(cat.percentage, 2)}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
