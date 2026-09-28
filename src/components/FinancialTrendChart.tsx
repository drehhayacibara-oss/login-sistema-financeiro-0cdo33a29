import React from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import type { MonthlyChartData } from '@/services/transactions'
import { formatBRL } from '@/services/transactions'

interface FinancialTrendChartProps {
  data: MonthlyChartData[]
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color: string
    dataKey: string
  }>
  label?: string
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const income = payload.find((p) => p.dataKey === 'income')?.value || 0
    const expense = payload.find((p) => p.dataKey === 'expense')?.value || 0
    const balance = income - expense

    return (
      <div className="rounded-xl border border-white/10 bg-[#0D0D11]/95 p-3.5 shadow-2xl backdrop-blur-md">
        <p className="text-xs font-bold uppercase tracking-wider text-white/50">{label}</p>
        <div className="mt-2 space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Receitas:
            </span>
            <span className="font-bold text-white">{formatBRL(income)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[#FCA5A5]">
              <span className="h-2 w-2 rounded-full bg-[#E10613]" />
              Despesas:
            </span>
            <span className="font-bold text-white">{formatBRL(expense)}</span>
          </div>
          <div className="border-t border-white/10 pt-1.5 flex items-center justify-between gap-4">
            <span className="text-white/60">Saldo Líquido:</span>
            <span
              className={`font-extrabold ${balance >= 0 ? 'text-emerald-400' : 'text-[#E10613]'}`}
            >
              {formatBRL(balance)}
            </span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export const FinancialTrendChart: React.FC<FinancialTrendChartProps> = ({ data }) => {
  const hasData = data.some((d) => d.income > 0 || d.expense > 0)

  if (!hasData) {
    return (
      <div className="flex h-[280px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#08080B]/40 text-center p-6">
        <p className="text-sm font-semibold text-white/70">
          Nenhum histórico financeiro encontrado
        </p>
        <p className="mt-1 max-w-xs text-xs text-white/40">
          Cadastre novas receitas e despesas para acompanhar o comparativo mensal.
        </p>
      </div>
    )
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255, 255, 255, 0.05)"
            vertical={false}
          />
          <XAxis
            dataKey="monthLabel"
            stroke="rgba(255, 255, 255, 0.3)"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
          />
          <YAxis
            stroke="rgba(255, 255, 255, 0.3)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => {
              if (val >= 1000) return `R$${(val / 1000).toFixed(0)}k`
              return `R$${val}`
            }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
            formatter={(val) => (
              <span className="text-xs text-white/70">
                {val === 'income' ? 'Receitas' : 'Despesas'}
              </span>
            )}
          />
          <Bar
            dataKey="income"
            name="income"
            fill="#10B981"
            radius={[6, 6, 0, 0]}
            maxBarSize={36}
          />
          <Bar
            dataKey="expense"
            name="expense"
            fill="#E10613"
            radius={[6, 6, 0, 0]}
            maxBarSize={36}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
