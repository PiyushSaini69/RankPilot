import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

const KpiCard = ({ title, value, change, changeText, valueSuffix, isPositive, Icon, loading = false, chartData = [], disconnected = false, onClick, insight, contextPrompt, platform }) => {

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

  // Dynamic brand styles based on platform
  const getBrandStyles = () => {
    if (disconnected) {
      return {
        container: 'bg-neutral-50/50 dark:bg-neutral-800/30 border-neutral-200/45 dark:border-neutral-700/40',
        iconClass: 'text-neutral-400 dark:text-neutral-500 w-[18px] h-[18px]'
      };
    }
    
    switch (platform) {
      case 'ga4':
        return {
          container: 'bg-rose-50/70 border-rose-100/80 dark:bg-rose-950/20 dark:border-rose-900/30',
          iconClass: 'text-rose-500 dark:text-rose-400 w-[18px] h-[18px]'
        };
      case 'gsc':
        return {
          container: 'bg-sky-50/70 border-sky-100/80 dark:bg-sky-950/20 dark:border-sky-900/30',
          iconClass: 'text-sky-500 dark:text-sky-400 w-[18px] h-[18px]'
        };
      case 'google-ads':
        return {
          container: 'bg-amber-50/70 border-amber-100/80 dark:bg-amber-950/20 dark:border-amber-900/30',
          iconClass: 'text-amber-500 dark:text-amber-400 w-[18px] h-[18px]'
        };
      case 'facebook':
        return {
          container: 'bg-indigo-50/70 border-indigo-100/80 dark:bg-indigo-950/20 dark:border-indigo-900/30',
          iconClass: 'text-indigo-500 dark:text-indigo-400 w-[18px] h-[18px]'
        };
      case 'conversions':
        return {
          container: 'bg-emerald-50/70 border-emerald-100/80 dark:bg-emerald-950/20 dark:border-emerald-900/30',
          iconClass: 'text-emerald-500 dark:text-emerald-400 w-[18px] h-[18px]'
        };
      case 'efficiency':
        return {
          container: 'bg-purple-50/70 border-purple-100/80 dark:bg-purple-950/20 dark:border-purple-900/30',
          iconClass: 'text-purple-500 dark:text-purple-450 w-[18px] h-[18px]'
        };
      default:
        return {
          container: isPositive
            ? 'bg-green-50/70 border-green-100/80 dark:bg-emerald-900/20 dark:border-emerald-800/30'
            : 'bg-red-50/70 border-red-100/80 dark:bg-red-900/20 dark:border-red-800/30',
          iconClass: `w-[18px] h-[18px] ${isPositive ? 'text-green-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`
        };
    }
  };

  const brand = getBrandStyles();

  const getPlatformFriendlyName = () => {
    switch (platform) {
      case 'ga4': return 'Google Analytics';
      case 'gsc': return 'Search Console';
      case 'google-ads': return 'Google Ads';
      case 'facebook': return 'Facebook Ads';
      case 'conversions': return 'Ad Platforms';
      case 'efficiency': return 'Marketing Accounts';
      default: return 'Platform';
    }
  };

  const getPlatformDescription = () => {
    switch (platform) {
      case 'ga4': return 'Link Google Analytics to track real-time traffic, user sessions, and website page engagement.';
      case 'gsc': return 'Link Google Search Console to monitor organic search clicks, search impressions, and keywords rankings.';
      case 'google-ads': return 'Connect Google Ads to track pay-per-click budget spend, campaign conversions, and ROI.';
      case 'facebook': return 'Connect Facebook Ads to measure social ad spend, campaign reach, and target impressions.';
      case 'conversions': return 'Connect advertising channels to track lead submissions and conversion actions in one place.';
      case 'efficiency': return 'Connect Google & Facebook Ads to measure click-through rate, cost-per-click, and ROAS.';
      default: return 'Link your analytics and advertising integrations to unlock automated tracking and AI analytics.';
    }
  };

  return (
    <div
      className={`group relative bg-white dark:bg-dark-card rounded-2xl border border-neutral-200/80 dark:border-neutral-700/60 p-5 overflow-hidden flex flex-col justify-between min-h-[190px] shadow-sm transition-all duration-300 cursor-default ${disconnected ? 'hide-in-pdf' : ''}`}
    >

      {/* Subtle background glow on hover */}
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none ${disconnected ? 'bg-brand-500/[0.05]' : (isPositive ? 'bg-green-400/[0.08]' : 'bg-red-400/[0.08]')
        } -mr-16 -mt-16`} />

      {/* Header section: title + value + icon */}
      <div className="relative z-10 flex justify-between items-start mb-2">
        <div className="mb-1 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-800 dark:text-neutral-200 leading-none">
            {title}
          </span>
          <div className="flex flex-col gap-1.5 mt-2.5">
            {disconnected ? (
              <div className="space-y-1 pr-6">
                <div className="text-3xl font-black text-neutral-300 dark:text-neutral-700 tracking-tight leading-none select-none">
                  —
                </div>
                <p className="text-[12px] font-bold text-neutral-400/90 dark:text-neutral-500/90 leading-relaxed">
                  {getPlatformDescription()}
                </p>
              </div>
            ) : (
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tabular-nums tracking-tight leading-none">
                  {value}
                </h3>
                {valueSuffix && (
                  <span className="text-sm font-bold text-neutral-400 dark:text-neutral-500 ml-1">{valueSuffix}</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {Icon && (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm border ${brand.container}`}>
              <Icon className={`${brand.iconClass} w-5 h-5 stroke-[1.8]`} />
            </div>
          )}
        </div>
      </div>

      {/* AreaChart for gradient fill effect */}
      <div className={`relative z-10 w-full ${disconnected ? 'opacity-20 grayscale' : ''}`} style={{ height: '52px', marginTop: '4px', marginBottom: '4px' }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
        <p className="text-[12px] font-semibold text-neutral-500 dark:text-neutral-400 leading-relaxed mb-3">
          {insight}
        </p>
      )}

      {/* Bottom Row: change badge + context text */}
      <div className="relative z-10 flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800/80 mt-auto">

        {/* Change Badge / Action */}
        {disconnected ? (
          <div 
            onClick={onClick}
            className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest flex items-center gap-1 hover:gap-1.5 cursor-pointer hover:underline active:scale-95 transition-all"
          >
            Connect {getPlatformFriendlyName()} <ArrowUpIcon className="w-3 h-3 rotate-45 stroke-[2.5]" />
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
          <span className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 italic tracking-tight">
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
