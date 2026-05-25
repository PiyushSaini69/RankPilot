import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

const KpiCard = ({ title, value, change, changeText, valueSuffix, isPositive, Icon, loading = false, chartData = [], disconnected = false, onClick, insight, contextPrompt }) => {

  // Loading state matching the updated dimensions
  if (loading) return (
    <div className="w-full rounded-2xl bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700/60 p-5 min-h-[190px] flex flex-col justify-between animate-pulse">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="h-3 w-28 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
          <div className="h-9 w-36 bg-neutral-200 dark:bg-neutral-700 rounded-xl" />
        </div>
        <div className="w-9 h-9 bg-neutral-200 dark:bg-neutral-700 rounded-xl" />
      </div>
      <div className="h-10 w-full bg-neutral-100 dark:bg-neutral-800 rounded-xl mt-4" />
      <div className="h-3 w-full bg-neutral-50 dark:bg-neutral-800/50 rounded-full mt-3" />
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
        <div className="h-6 w-16 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
        <div className="h-3 w-24 bg-neutral-100 dark:bg-neutral-800 rounded-full" />
      </div>
    </div>
  );

  // Sparkline data processing
  const sparkData = (chartData && chartData.length >= 2)
    ? chartData.map((v, i) => ({ i, v: Number(v) || 0 }))
    : Array.from({ length: 10 }, (_, i) => ({
      i,
      v: disconnected ? 20 : (isPositive
        ? 20 + i * 3 + Math.sin(i) * 5
        : 50 - i * 2 + Math.sin(i) * 5)
    }));

  const gradientId = isPositive ? 'sparkGreen' : 'sparkRed';
  const strokeColor = disconnected ? '#94A3B8' : (isPositive ? '#10B981' : '#EF4444');

  return (
    <div
      onClick={onClick}
      className={`group relative bg-white dark:bg-dark-card rounded-2xl border border-neutral-200/80 dark:border-neutral-700/60 p-5 overflow-hidden flex flex-col justify-between min-h-[190px] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${(disconnected || onClick) ? 'cursor-pointer' : 'cursor-default'} ${disconnected ? 'hover:border-brand-500/50 hide-in-pdf' : ''}`}
    >

      {/* Subtle background glow on hover */}
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none ${disconnected ? 'bg-brand-500/[0.05]' : (isPositive ? 'bg-green-400/[0.08]' : 'bg-red-400/[0.08]')
        } -mr-16 -mt-16`} />

      {/* Header section: title + value + icon */}
      <div className="relative z-10 flex justify-between items-start mb-2">
        <div className="mb-1">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500 leading-none">
            {title}
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            {disconnected ? (
              <p className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 leading-relaxed mt-1 pr-10 italic">
                {insight}
              </p>
            ) : (
              <>
                <h3 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tabular-nums tracking-tight leading-none">
                  {value}
                </h3>
                {valueSuffix && (
                  <span className="text-sm font-bold text-neutral-400 dark:text-neutral-500 ml-1">{valueSuffix}</span>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {Icon && (
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm ${disconnected ? 'bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-700/50' : (
                isPositive
                  ? 'bg-green-50 dark:bg-emerald-900/20 border border-green-100 dark:border-emerald-800/50'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50'
              )
              }`}>
              <Icon className={`w-[18px] h-[18px] ${disconnected ? 'text-neutral-300' : (isPositive ? 'text-green-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400')}`} />
            </div>
          )}
        </div>
      </div>

      {/* AreaChart for gradient fill effect */}
      <div className={`relative z-10 w-full ${disconnected ? 'opacity-20 grayscale' : ''}`} style={{ height: '52px', marginTop: '4px', marginBottom: '4px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkData} margin={{ top: 3, right: 0, left: 0, bottom: 3 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={strokeColor} stopOpacity={0.15} />
                <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={strokeColor}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              strokeLinecap="round"
              isAnimationActive={!disconnected && localStorage.getItem('is-pdf-export') !== 'true'}
              animationDuration={900}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* AI Insight Snippet */}
      {insight && !disconnected && (
        <p className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 leading-relaxed mb-3">
          {insight}
        </p>
      )}

      {/* Bottom Row: change badge + context text */}
      <div className="relative z-10 flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800/80 mt-auto">

        {/* Change Badge / Action */}
        {disconnected ? (
          <div className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
            Unlock Insights <ArrowUpIcon className="w-3 h-3 rotate-45" />
          </div>
        ) : change !== undefined ? (
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black border ${isPositive
              ? 'bg-green-50 text-green-700 border-green-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50'
              : 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50'
            }`}>
            {isPositive
              ? <ArrowUpIcon className="w-3 h-3 stroke-[3]" />
              : <ArrowDownIcon className="w-3 h-3 stroke-[3]" />
            }
            {Math.abs(parseFloat(change || 0)).toFixed(1)}%
          </div>
        ) : (
          <div className="h-7 w-16 bg-neutral-100 dark:bg-neutral-800 rounded-full animate-pulse" />
        )}

        {/* Context text */}
        {changeText && (
          <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 italic tracking-tight">
            {disconnected ? 'Setup Required' : changeText}
          </span>
        )}
      </div>

      {/* Bottom progress bar — visible on hover */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
        <div
          className={`h-full transition-all duration-700 ease-out origin-left scale-x-0 group-hover:scale-x-100 ${disconnected ? 'bg-brand-500' : (
              isPositive
                ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                : 'bg-gradient-to-r from-red-400 to-rose-500'
            )
            }`}
          style={{ width: disconnected ? '100%' : `${Math.min(100, Math.abs(change || 50) + 20)}%` }}
        />
      </div>

    </div>
  );
};

export default KpiCard;
