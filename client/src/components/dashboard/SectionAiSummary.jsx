import React, { useState } from 'react';
import { SparklesIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import api from '../../api';

const SectionAiSummary = ({ 
  insight, 
  loading: parentLoading, 
  platform = 'ga4', 
  sectionKey, 
  siteId, 
  startDate, 
  endDate, 
  device, 
  onInsightGenerated, 
  title = "AI SUMMARY" 
}) => {
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState(null);

    const handleGenerate = async () => {
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
        } catch (e) {
            console.error(`Failed to generate ${platform} section summary`, e);
            setError(e.response?.data?.message || "Generation failed. Try again.");
        } finally {
            setGenerating(false);
        }
    };

    const isLoading = parentLoading || generating;

    if (isLoading) {
        return (
            <div className="mt-4 p-5 bg-gradient-to-r from-neutral-50 to-neutral-100/50 dark:from-neutral-900/50 dark:to-neutral-900/30 border border-neutral-150/60 dark:border-neutral-850 rounded-2xl animate-pulse flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <SparklesIcon className="w-4 h-4 text-brand-500 animate-spin shrink-0" />
                        <div className="h-2.5 bg-neutral-200 dark:bg-neutral-850 rounded-full w-32" />
                    </div>
                    <div className="h-2 bg-neutral-200 dark:bg-neutral-850 rounded-full w-12" />
                </div>
                <div className="space-y-2.5 mt-1">
                    <div className="h-2 bg-neutral-200/80 dark:bg-neutral-800/80 rounded-full w-full" />
                    <div className="h-2 bg-neutral-200/80 dark:bg-neutral-800/80 rounded-full w-[94%]" />
                    <div className="h-2 bg-neutral-200/80 dark:bg-neutral-800/80 rounded-full w-[78%]" />
                </div>
            </div>
        );
    }

    if (insight) {
        return (
            <div className="mt-4 p-5 bg-white dark:bg-dark-card border border-neutral-150/70 dark:border-neutral-800 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in duration-500">
                <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-1 bg-brand-500/10 dark:bg-brand-500/20 rounded-lg">
                            <SparklesIcon className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" />
                        </div>
                        <h4 className="text-[11px] font-black text-neutral-800 dark:text-white uppercase tracking-widest">{title}</h4>
                    </div>
                    <button 
                        onClick={handleGenerate}
                        title="Regenerate Summary"
                        className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-all active:scale-90"
                    >
                        <ArrowPathIcon className="w-3.5 h-3.5 text-neutral-400 hover:text-brand-500 transition-colors" />
                    </button>
                </div>
                <p className="text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
                    {insight}
                </p>
                {error && (
                    <span className="text-[9px] font-bold text-red-500 mt-2 block">{error}</span>
                )}
            </div>
        );
    }

    return (
        <div 
            className="mt-4 p-2.5 pl-5 pr-3 bg-white dark:bg-dark-card border border-neutral-150/75 dark:border-neutral-800/90 rounded-2xl md:rounded-full flex flex-col md:flex-row md:items-center justify-between gap-4 group/unlock transition-all duration-300 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-[0_4px_16px_-2px_rgba(99,102,241,0.03)] hover:border-brand-500/20"
        >
            <div className="flex items-center gap-3">
                <div className="p-1.5 bg-brand-500/10 dark:bg-brand-500/20 rounded-full text-brand-500 dark:text-brand-400 shrink-0 group-hover/unlock:scale-105 transition-transform duration-350">
                    <SparklesIcon className="w-4 h-4" />
                </div>
                <span className="text-[12px] font-bold text-neutral-700 dark:text-neutral-300 tracking-wide select-none">
                    Click "Unlock AI Summary" to get insight.
                </span>
            </div>
            <button
                onClick={handleGenerate}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-550 hover:to-indigo-500 group-hover/unlock:scale-[1.03] text-white rounded-full text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 transition-all duration-300 active:scale-95 shadow-md shadow-indigo-600/15 shrink-0 cursor-pointer"
            >
                <SparklesIcon className="w-3.5 h-3.5" />
                UNLOCK AI SUMMARY
            </button>
            {error && (
                <span className="text-[9px] font-bold text-red-500 block w-full mt-1 pl-2">{error}</span>
            )}
        </div>
    );
};

export default SectionAiSummary;
