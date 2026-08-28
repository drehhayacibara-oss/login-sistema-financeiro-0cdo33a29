import React from 'react'
import { TrendingUp, ArrowUpRight, ShieldCheck, Cpu, Zap } from 'lucide-react'

export const BrandPanel: React.FC = () => {
  return (
    <div className="relative w-full h-full flex flex-col justify-between p-8 xl:p-12 2xl:p-16 overflow-hidden bg-[#08080B] select-none">
      {/* Background Subtle Grid Texture */}
      <div className="absolute inset-0 bg-grid-subtle pointer-events-none" />

      {/* Animated Deep-Red Radial Glow in the Upper-Left Corner */}
      <div
        className="absolute -top-24 -left-24 w-[480px] h-[480px] rounded-full bg-[#E10613]/15 blur-[120px] pointer-events-none animate-glow-pulse"
        aria-hidden="true"
      />

      {/* Secondary ambient glow */}
      <div
        className="absolute top-1/2 left-1/3 w-[360px] h-[360px] rounded-full bg-[#E10613]/8 blur-[140px] pointer-events-none"
        aria-hidden="true"
      />

      {/* Vignette Bottom Gradient */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#08080B] via-[#08080B]/80 to-transparent pointer-events-none" />

      {/* TOP BRAND BLOCK */}
      <div className="relative z-10 flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-[#E10613] flex items-center justify-center shadow-[0_0_24px_rgba(225,6,19,0.5)] border border-white/20">
          <TrendingUp className="w-6 h-6 text-white stroke-[2.5]" />
        </div>
        <div className="flex flex-col">
          <span className="text-white text-2xl font-extrabold tracking-[0.2em] leading-none">
            RUBRA
          </span>
          <span className="text-[10px] tracking-[0.16em] uppercase text-white/40 font-bold mt-1">
            Financial Suite
          </span>
        </div>
      </div>

      {/* CENTER / HEADLINE & MOCK BALANCE CARD */}
      <div className="relative z-10 my-auto py-8 max-w-[520px]">
        {/* Headline block */}
        <div className="mb-8">
          <h1 className="text-3xl xl:text-4xl 2xl:text-[44px] font-extrabold text-white leading-[1.15] tracking-tight">
            Precisão{' '}
            <span className="relative inline-block text-white">
              financeira
              <span className="absolute left-0 bottom-1 w-full h-[4px] bg-[#E10613] rounded-full" />
            </span>{' '}
            em cada decisão.
          </h1>
          <p className="mt-4 text-[#A0A0AA] text-sm xl:text-base leading-relaxed">
            A Rubra concentra receitas, despesas e investimentos em um único painel, com segurança
            de nível bancário.
          </p>
        </div>

        {/* Mock balance card (floating) */}
        <div className="relative rounded-2xl bg-[#121216]/90 border border-white/10 p-5 xl:p-6 shadow-[0_20px_60px_rgba(225,6,19,0.18)] backdrop-blur-md animate-float-slow transition-all">
          {/* Card Top Row */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#63636D]">
              Saldo Total
            </span>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E10613] text-white text-xs font-bold shadow-[0_0_12px_rgba(225,6,19,0.4)]">
              <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>+12,4% no mês</span>
            </div>
          </div>

          {/* Card Value */}
          <div className="text-2xl xl:text-3xl 2xl:text-[34px] font-extrabold text-white tracking-tight font-tabular mb-4">
            R$ 84.320,00
          </div>

          {/* Sparkline Graphic */}
          <div className="relative w-full h-16 xl:h-20 mb-4 overflow-hidden rounded-lg bg-[#0D0D11]/60 border border-white/5 p-2">
            {/* Grid ticks */}
            <div className="absolute inset-0 flex flex-col justify-between p-2 opacity-15 pointer-events-none">
              <div className="w-full border-b border-dashed border-white" />
              <div className="w-full border-b border-dashed border-white" />
              <div className="w-full border-b border-dashed border-white" />
            </div>

            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 300 60"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="rubraSparkGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E10613" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#E10613" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Gradient fill */}
              <polygon
                points="0,60 0,46 40,40 80,48 120,32 160,35 200,20 240,24 280,10 300,6 300,60"
                fill="url(#rubraSparkGradient)"
              />

              {/* Stroke line */}
              <polyline
                fill="none"
                stroke="#E10613"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points="0,46 40,40 80,48 120,32 160,35 200,20 240,24 280,10 300,6"
              />

              {/* Endpoint glow circle */}
              <circle cx="300" cy="6" r="4" fill="#FFFFFF" stroke="#E10613" strokeWidth="2.5" />
            </svg>
          </div>

          {/* Card Bottom Row */}
          <div className="flex items-center justify-between text-xs text-[#A0A0AA] pt-2 border-t border-white/5 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400/80" />
              <span>
                Receitas <strong className="text-white font-semibold">R$ 120,4 mil</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#E10613]" />
              <span>
                Despesas <strong className="text-white font-semibold">R$ 36,1 mil</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* STATS ROW (BOTTOM) */}
      <div className="relative z-10 grid grid-cols-3 gap-4 pt-6 border-t border-white/10 text-left">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-[#63636D] font-bold">
            Volume Total
          </div>
          <div className="text-sm xl:text-base font-extrabold text-white mt-1">
            R$ 2,4 bi <span className="text-xs font-normal text-white/50">processados</span>
          </div>
        </div>

        <div className="border-l border-white/10 pl-4">
          <div className="text-[11px] uppercase tracking-[0.12em] text-[#63636D] font-bold">
            SLA de Sistema
          </div>
          <div className="text-sm xl:text-base font-extrabold text-white mt-1">
            99,9% <span className="text-xs font-normal text-white/50">disponibilidade</span>
          </div>
        </div>

        <div className="border-l border-white/10 pl-4">
          <div className="text-[11px] uppercase tracking-[0.12em] text-[#63636D] font-bold">
            Comunidade
          </div>
          <div className="text-sm xl:text-base font-extrabold text-white mt-1">
            +48 mil <span className="text-xs font-normal text-white/50">contas</span>
          </div>
        </div>
      </div>
    </div>
  )
}
