import React, { useState } from 'react';
import { SparklesIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import api from '../../api';

const SummaryStripCard = ({ 
  label, 
  value, 
  icon, 
  insight, 
  platform, 
  sectionKey, 
  siteId, 
  startDate, 
  endDate, 
  device, 
  onInsightGenerated, 
  loading, 
  isSyncing 
}) => {
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState(null);

    const handleGenerate = async (e) => {
        if (e) e.stopPropagation();
        if (!siteId || !startDate || !endDate) return;
        setGenerating(true);
        setError(null);
        try {
            const res = await api.post('/analytics/section-summary', {
                siteId,
                platform,
                sectionKey,
                startDate,
                endDate,
                device: device || 'all'
            });
            if (res.data?.success && res.data?.insight) {
                if (onInsightGenerated) {
                    onInsightGenerated(sectionKey, res.data.insight);
                }
            } else {
                setError("Failed to generate insight.");
            }
        } catch (err) {
            console.error("Strip card generation error", err);
            setError(err.response?.data?.message || "Generation failed. Try again.");
        } finally {
            setGenerating(false);
        }
    };

    const isLoading = loading || isSyncing;

    return (
        <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 shadow-sm group hover:border-brand-500/30 transition-all flex flex-col min-h-[125px]">
            <div className="flex items-center gap-4 mb-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 flex items-center justify-center border border-neutral-100 dark:border-neutral-700/50 group-hover:scale-110 transition-transform">
                    {icon}
                </div>
                <div>
                    <div className="text-xl font-black text-neutral-900 dark:text-white tabular-nums">
                        {isLoading ? <div className="h-6 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" /> : value}
                    </div>
                    <div className="text-xs text-neutral-800 dark:text-neutral-200 font-bold mt-0.5">{label}</div>
                </div>
            </div>
            {!isLoading && (
                <div className="border-t border-neutral-100 dark:border-neutral-800 pt-2 mt-auto">
                    {generating ? (
                        <div className="space-y-1.5 animate-pulse py-2 px-2.5 bg-brand-50/5 dark:bg-brand-500/5 border border-dashed border-brand-100/50 dark:border-brand-500/20 rounded-xl">
                            <div className="h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full w-[85%]" />
                            <div className="h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full w-[55%]" />
                        </div>
                    ) : insight ? (
                        <div className="relative group/insight-strip">
                            <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 leading-relaxed italic pr-5 whitespace-pre-line">
                                {insight}
                            </p>
                            <button
                                onClick={handleGenerate}
                                title="Regenerate"
                                className="absolute top-0 right-0 p-0.5 hover:bg-neutral-150 dark:hover:bg-neutral-800 rounded opacity-0 group-hover/insight-strip:opacity-100 transition-all duration-200 active:scale-95"
                            >
                                <ArrowPathIcon className="w-3 h-3 text-neutral-400 hover:text-brand-500" />
                            </button>
                        </div>
                    ) : (
                        <div 
                            className="flex items-center justify-between gap-3 py-1.5 pl-3 pr-2 bg-white dark:bg-neutral-900/50 border border-neutral-150/70 dark:border-neutral-800 rounded-xl group/unlock-strip transition-all duration-300 shadow-[0_1px_4px_rgba(0,0,0,0.02)] hover:border-brand-500/20 hover:shadow-[0_2px_8px_-1px_rgba(99,102,241,0.03)]"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <SparklesIcon className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                                <span className="text-[10.5px] font-bold text-neutral-700 dark:text-neutral-300 truncate select-none">
                                    Unlock AI Insight
                                </span>
                            </div>
                            <button
                                onClick={handleGenerate}
                                className="px-3 py-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-550 hover:to-indigo-500 group-hover/unlock-strip:scale-105 text-white rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-sm shrink-0 active:scale-95 cursor-pointer"
                            >
                                <SparklesIcon className="w-2.5 h-2.5" />
                                Unlock
                            </button>
                        </div>
                    )}
                    {error && (
                        <div className="text-[8px] font-bold text-red-500 mt-1">{error}</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SummaryStripCard;
