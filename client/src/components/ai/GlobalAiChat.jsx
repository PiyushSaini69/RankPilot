import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    SparklesIcon,
    XMarkIcon,
    PaperAirplaneIcon,
    ArrowPathIcon,
    ChatBubbleLeftRightIcon,
    MinusIcon,
    ExclamationTriangleIcon,
    DocumentTextIcon,
    DocumentDuplicateIcon,
    CheckIcon,
    PencilIcon,
    ChartBarIcon,
    ArrowUpRightIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ChartRenderer from './ChartRenderer';
import { useAuthStore } from '../../store/authStore';
import { useAccountsStore } from '../../store/accountsStore';
import { getApiUrl } from '../../api';
import { getSuggestedQuestions } from '../../api/aiApi';
import { useAiChatStore } from '../../store/aiChatStore';




const TypingIndicator = () => {
    const [phrase, setPhrase] = useState("Thinking");
    const phrases = ["Thinking", "Analyzing Data", "Drafting Response", "Refining Insights"];

    useEffect(() => {
        let i = 0;
        const interval = setInterval(() => {
            i = (i + 1) % phrases.length;
            setPhrase(phrases[i]);
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-center gap-3 py-1">
            <div className="flex items-center gap-1">
                {[0, 150, 300].map(delay => (
                    <span
                        key={delay}
                        className="w-1 h-1 rounded-full bg-brand-500 animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                    />
                ))}
            </div>
            <span className="text-[10px] font-black text-brand-600/80 dark:text-brand-400 uppercase tracking-[0.15em] animate-pulse">
                {phrase}
            </span>
        </div>
    );
};

const GlobalChatMessage = ({ msg, onEdit, onRetry, MD }) => {
    const isUser = msg.role === 'user';
    const [isCopied, setIsCopied] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const isLongMessage = msg.content?.length > 400 || (msg.content?.split('\n').length > 6);

    const handleCopy = () => {
        if (!msg.content) return;
        navigator.clipboard.writeText(msg.content);
        setIsCopied(true);
        toast.success("Copied to clipboard!", {
            style: { background: '#333', color: '#fff', fontSize: '10px' }
        });
        setTimeout(() => setIsCopied(false), 2000);
    };

    if (isUser) {
        return (
            <div className="flex justify-end mb-4 w-full group">
                <div className="flex flex-col items-end max-w-[85%]">
                    <div className={`px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-2xl text-[13px] text-zinc-800 dark:text-zinc-100 leading-relaxed break-words relative overflow-hidden transition-all duration-500 shadow-sm dark:shadow-none ${(!isExpanded && isLongMessage) ? 'max-h-[180px]' : 'max-h-[5000px]'}`}>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                        {!isExpanded && isLongMessage && (
                            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-zinc-100 dark:from-zinc-800 via-zinc-100/90 dark:via-zinc-800/90 to-transparent pointer-events-none flex items-end justify-start px-4 pb-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
                                    className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 pointer-events-auto transition-colors"
                                >
                                    Show more
                                </button>
                            </div>
                        )}
                    </div>
                    {isExpanded && isLongMessage && (
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="text-[10px] font-bold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 mt-1.5 self-start pl-2 transition-colors"
                        >
                            Show less
                        </button>
                    )}
                    <div className="flex items-center gap-3 mt-2 pr-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-neutral-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider cursor-default" title={format(new Date(msg.createdAt || Date.now()), 'PPP p')}>
                            {format(new Date(msg.createdAt || Date.now()), 'HH:mm')}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => onRetry?.(msg.content)} className="hover:text-neutral-900 dark:hover:text-white transition-colors p-1" title="Retry">
                                <ArrowPathIcon className="w-3 h-3" />
                            </button>
                            <button onClick={() => onEdit?.(msg.content)} className="hover:text-neutral-900 dark:hover:text-white transition-colors p-1" title="Edit">
                                <PencilIcon className="w-3 h-3" />
                            </button>
                            <button onClick={handleCopy} className="hover:text-neutral-900 dark:hover:text-white transition-colors p-1" title="Copy">
                                {isCopied ? <CheckIcon className="w-3 h-3 text-green-500" /> : <DocumentDuplicateIcon className="w-3 h-3" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex justify-start w-full max-w-full mb-6 group">
            <div className="flex-1 min-w-0 overflow-hidden w-full pl-1">
                {msg.isLoading ? (
                    <div className="bg-white dark:bg-neutral-800/80 border border-neutral-100 dark:border-neutral-700/50 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm backdrop-blur-sm w-fit">
                        <TypingIndicator />
                    </div>
                ) : msg.isError ? (
                    <div className="flex items-center gap-3.5 p-3.5 bg-red-50/50 dark:bg-red-900/10 border border-red-100/50 dark:border-red-900/30 rounded-2xl shadow-sm">
                        <ExclamationTriangleIcon className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                        <p className="text-[12px] font-bold text-red-700 dark:text-red-300 leading-snug">
                            {msg.content}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-[13px] leading-relaxed text-neutral-800 dark:text-neutral-100 break-words [word-break:break-word]">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>
                                {msg.content}
                            </ReactMarkdown>
                        </div>
                        {msg.content && (
                            <div className="flex items-center gap-3 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider cursor-default" title={format(new Date(msg.createdAt || Date.now()), 'PPP p')}>
                                    {format(new Date(msg.createdAt || Date.now()), 'HH:mm')}
                                </span>
                                <button
                                    onClick={handleCopy}
                                    className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-all border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 shadow-sm"
                                    title="Copy response"
                                >
                                    {isCopied ? <CheckIcon className="w-3 h-3 text-green-500" /> : <DocumentDuplicateIcon className="w-3 h-3" />}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

/**
 * GlobalAiChat — Floating bubble chat for the entire project
 */
const GlobalAiChat = () => {
    const { user, token } = useAuthStore();
    const {
        activeSiteId,
        activeGscSite,
        activeGa4PropertyId,
        activeGoogleAdsCustomerId,
        activeFacebookAdAccountId
    } = useAccountsStore();
    const location = useLocation();
    const navigate = useNavigate();

    const allowedPaths = [
        '/dashboard',
        '/dashboard/gsc',
        '/dashboard/ga4',
        '/dashboard/google-ads',
        '/dashboard/facebook-ads'
    ];

    if (!allowedPaths.includes(location.pathname)) {
        return null;
    }

    // Check if the relevant data source is connected for the current page
    let isSourceConnected = true;
    if (location.pathname === '/dashboard') {
        isSourceConnected = !!(activeGscSite || activeGa4PropertyId || activeGoogleAdsCustomerId || activeFacebookAdAccountId);
    } else if (location.pathname === '/dashboard/gsc') {
        isSourceConnected = !!activeGscSite;
    } else if (location.pathname === '/dashboard/ga4') {
        isSourceConnected = !!activeGa4PropertyId;
    } else if (location.pathname === '/dashboard/google-ads') {
        isSourceConnected = !!activeGoogleAdsCustomerId;
    } else if (location.pathname === '/dashboard/facebook-ads') {
        isSourceConnected = !!activeFacebookAdAccountId;
    }

    if (!isSourceConnected) {
        return null;
    }

    const { isOpen, setIsOpen, initialQuestion, clearInitialQuestion } = useAiChatStore();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [conversationId, setConversationId] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const panelRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const conversationIdRef = useRef(null);

    // Sync ref for access inside MD overrides
    useEffect(() => {
        conversationIdRef.current = conversationId;
    }, [conversationId]);

    /* ── Markdown Component Overrides (Compact for Sidebar/Bubble) ── */
    const MD = {
        p: ({ children }) => <p className="leading-relaxed text-[14px] text-neutral-700 dark:text-neutral-200 mb-3 last:mb-0 break-words [word-break:break-word]">{children}</p>,
        strong: ({ children }) => <strong className="font-extrabold text-neutral-900 dark:text-white break-words [word-break:break-word]">{children}</strong>,
        ul: ({ children }) => <ul className="space-y-2.5 mb-4 pl-6 list-disc marker:text-neutral-900 dark:marker:text-white marker:font-bold">{children}</ul>,
        ol: ({ children }) => <ol className="space-y-2.5 mb-4 pl-6 list-decimal marker:text-neutral-900 dark:marker:text-white marker:font-bold">{children}</ol>,
        li: ({ children }) => {
            const getNestedText = (child) => {
                if (typeof child === 'string' || typeof child === 'number') return child;
                if (Array.isArray(child)) return child.map(getNestedText).join('');
                if (child?.props?.children) return getNestedText(child.props.children);
                return '';
            };
            const text = getNestedText(children);

            // 1. Roadmap Item Detection: Emoji + Priority + (Timeframe) - Title: Description
            const roadmapMatch = text.match(/^(🔴|🟡|🟢)\s*(HIGH|MEDIUM|LOW)\s*\(([^)]+)\)\s*[-–—]\s*(.*?):\s*([\s\S]*)$/i);

            if (roadmapMatch) {
                const [_, icon, priority, timeframe, title, description] = roadmapMatch;
                const borderClass = icon === '🔴' ? 'border-l-rose-500' : icon === '🟡' ? 'border-l-amber-500' : 'border-l-emerald-500';

                return (
                    <div className={`my-4 p-4 pl-5 border-l-4 border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-transparent rounded-xl shadow-sm list-none`}>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{priority} • {timeframe}</span>
                        </div>
                        <h4 className="text-[14px] font-bold text-neutral-900 dark:text-white mb-1.5 leading-tight">
                            {title}
                        </h4>
                        <p className="text-[12px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                            {description}
                        </p>
                    </div>
                );
            }

            // 2. Simple Priority Detection
            const priorityMatch = text.match(/^(🔴|🟡|🟢)/);

            if (priorityMatch) {
                const icon = priorityMatch[1];
                const cleanText = text.replace(icon, '').trim();

                return (
                    <li className="flex items-start gap-2.5 mb-3 last:mb-0 group/item list-none">
                        <span className={`shrink-0 mt-0.5 text-[13px]`}>{icon}</span>
                        <span className="text-[14px] text-neutral-700 dark:text-neutral-200 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
                            {cleanText}
                        </span>
                    </li>
                );
            }
            return <li className="text-[14px] text-neutral-700 dark:text-neutral-100 break-words [word-break:break-word] pl-2 mb-2 last:mb-0">{children}</li>;
        },
        h1: ({ children }) => <h1 className="text-xl font-extrabold text-neutral-900 dark:text-white mt-12 mb-5 tracking-tight border-t border-neutral-200 dark:border-neutral-700/80 pt-8 first:mt-0 first:border-0 first:pt-0">{children}</h1>,
        h2: ({ children }) => {
            const text = React.Children.toArray(children).join('');
            const typeMatch = text.match(/^(🟢|🟡|🔴)/);

            if (typeMatch) {
                const icon = typeMatch[1];
                const colorClass = icon === '🟢' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                    icon === '🟡' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                        'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
                return (
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border ${colorClass} text-[10px] font-black uppercase tracking-widest my-5 animate-in fade-in slide-in-from-left-2 duration-500`}>
                        <span className="animate-pulse">{icon}</span>
                        {children}
                    </div>
                );
            }
            return <h2 className="text-lg font-bold text-neutral-900 dark:text-white mt-10 mb-4 tracking-tight border-t border-neutral-200 dark:border-neutral-700/60 pt-6 first:mt-0 first:border-0 first:pt-0">{children}</h2>;
        },
        h3: ({ children }) => {
            const text = React.Children.toArray(children).join('');
            if (text.toLowerCase().includes('strategic roadmap')) {
                return (
                    <div className="flex items-center gap-2 mb-5 mt-8 pb-3 border-b border-neutral-100 dark:border-neutral-900">
                        <SparklesIcon className="w-4 h-4 text-neutral-400" />
                        <h3 className="text-base font-bold text-neutral-900 dark:text-white m-0">
                            {text.replace(/^[💡\s]+/, '')}
                        </h3>
                    </div>
                );
            }
            return <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-200 mt-8 mb-3 pt-4 border-t border-neutral-200 dark:border-neutral-700/40 first:mt-0 first:border-0 first:pt-0">{children}</h3>;
        },
        hr: () => <div className="h-[1px] w-full bg-neutral-100 dark:bg-neutral-800/60 my-8" />,
        a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-600 dark:text-brand-400 font-bold underline decoration-brand-500/30 underline-offset-2 hover:decoration-brand-500 transition-all">{children}</a>,
        code: ({ inline, className, children, ...props }) => {
            const text = String(children).trim();
            const match = /language-json-chart-(\w+)/.exec(className || '');
            const looksLikeChart = text.includes('"chartType"') || text.includes('"datasets"') || text.includes('"labels"');
            const isJson = /language-json/.test(className || '') || (text.startsWith('{')) || looksLikeChart;

            if (!inline && (match || isJson || looksLikeChart)) {
                // If it looks like a chart, we show the premium button immediately
                // even if parsing fails (streaming). The chart page will handle full parsing.
                if (looksLikeChart || match) {
                    return (
                        <div className="my-6 p-5 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/60 dark:border-neutral-800/60 rounded-[1.25rem] flex items-center justify-between gap-4 transition-all hover:border-brand-500/30">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="w-11 h-11 rounded-xl bg-brand-500/10 dark:bg-brand-500/20 flex items-center justify-center shrink-0">
                                    <ChartBarIcon className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-[14px] font-bold text-neutral-900 dark:text-white leading-tight">Visualization Ready</h4>
                                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium truncate">Click to view</p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    const currentId = conversationIdRef.current || conversationId;
                                    if (!currentId) {
                                        toast.error("Syncing conversation... please wait for the first response.");
                                        return;
                                    }
                                    setIsOpen(false);
                                    setTimeout(() => {
                                        const idxParam = props.messageIndex !== undefined ? `&scrollToIndex=${props.messageIndex}` : '';
                                        navigate(`/dashboard/ai-chat?conversationId=${currentId}${idxParam}`);
                                    }, 100);
                                }}
                                className="shrink-0 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[11px] font-bold rounded-xl transition-all hover:bg-black dark:hover:bg-neutral-100 active:scale-95 flex items-center gap-1.5"
                            >
                                <span>View</span>
                                <ArrowUpRightIcon className="w-3 h-3" strokeWidth={2.5} />
                            </button>
                        </div>
                    );
                }

                try {
                    const cleanedJson = text
                        .replace(/```json\n?/g, '')
                        .replace(/```/g, '')
                        .replace(/[\u0000-\u001F]+/g, '')
                        .trim();

                    let chartData = null;
                    try {
                        chartData = JSON.parse(cleanedJson);
                    } catch (e) {
                        try { chartData = JSON.parse(cleanedJson + '}'); }
                        catch (e2) {
                            try { chartData = JSON.parse(cleanedJson + ']}'); }
                            catch (e3) {
                                try { chartData = JSON.parse(cleanedJson + '}]}'); }
                                catch (e4) { throw e; }
                            }
                        }
                    }

                    const hasChartKeys = (obj) => {
                        const keys = ['labels', 'label', 'datasets', 'dataset', 'chartType', 'series', 'categories', 'xAxis', 'yAxis', 'layout', 'metrics', 'charts'];
                        const rootKeys = Object.keys(obj || {});
                        const nestedKeys = (obj?.data && !Array.isArray(obj.data)) ? Object.keys(obj.data) : [];
                        const isDataArray = Array.isArray(obj?.data);
                        return keys.some(k => rootKeys.includes(k) || nestedKeys.includes(k)) || (isDataArray && rootKeys.includes('series'));
                    };

                    const looksLikeChart = text.includes('"chartType"') || text.includes('"datasets"') || text.includes('"labels"');

                    if (!match && isJson && !hasChartKeys(chartData) && !looksLikeChart) {
                        return (
                            <div className="my-4 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-zinc-900/50 p-4">
                                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                                    <DocumentTextIcon className="w-3.5 h-3.5 text-neutral-400" />
                                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Raw Data / JSON</span>
                                </div>
                                <code className="text-[11px] font-mono text-neutral-800 dark:text-neutral-300 block whitespace-pre overflow-x-auto" {...props}>{children}</code>
                            </div>
                        );
                    }

                    return (
                        <div className="my-8 relative group overflow-hidden">
                            {/* Premium Card Background with Glow */}
                            <div className="absolute inset-0 bg-brand-500/5 dark:bg-brand-500/10 blur-2xl rounded-[2.5rem] -z-10 group-hover:bg-brand-500/15 transition-colors duration-500" />

                            <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6 px-8 py-7 bg-white/80 dark:bg-neutral-900/40 backdrop-blur-xl border border-neutral-200/50 dark:border-neutral-800/50 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] transition-all duration-300 group-hover:translate-y-[-2px] group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]">

                                <div className="flex items-center gap-5 flex-1 min-w-0 w-full">
                                    {/* Branded Icon with Pulse Effect */}
                                    <div className="relative shrink-0 w-14 h-14 rounded-[1.25rem] bg-brand-500 flex items-center justify-center shadow-[0_10px_20px_rgba(59,130,246,0.3)] transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110">
                                        <ChartBarIcon className="w-7 h-7 text-white" />
                                        <div className="absolute inset-0 rounded-[1.25rem] bg-brand-500 animate-ping opacity-20" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-[16px] font-black text-neutral-900 dark:text-white tracking-tight leading-none mb-1.5 flex items-center gap-2">
                                            Visual Insight Ready
                                            <span className="hidden xs:inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-brand-500/10 text-brand-600 dark:text-brand-400 uppercase tracking-widest border border-brand-500/20">
                                                AI Analysis
                                            </span>
                                        </h4>
                                        <p className="text-[13px] text-neutral-500 dark:text-neutral-400 font-medium">
                                            Open full canvas for interactive charts.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        const currentId = conversationIdRef.current;
                                        if (!currentId) {
                                            toast.error("Syncing conversation... please try in a moment.");
                                            return;
                                        }
                                        setIsOpen(false);
                                        // Small delay to ensure panel closes smoothly before navigation
                                        setTimeout(() => {
                                            navigate(`/dashboard/ai-chat?conversationId=${currentId}`);
                                        }, 100);
                                    }}
                                    className="shrink-0 w-full sm:w-auto px-7 py-3.5 bg-neutral-900 dark:bg-white hover:bg-black dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-[12px] font-black rounded-2xl transition-all shadow-xl shadow-neutral-900/10 dark:shadow-white/10 active:scale-95 flex items-center justify-center gap-2 group/btn"
                                >
                                    <span>View Insight</span>
                                    <ArrowUpRightIcon className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" strokeWidth={3} />
                                </button>
                            </div>
                        </div>
                    );
                } catch (err) { }
            }

            return inline
                ? <code className="bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-[11px] font-mono text-brand-600 dark:text-brand-400">{children}</code>
                : <pre className="bg-neutral-900 text-neutral-100 p-2 rounded-lg text-[11px] overflow-x-auto my-2 border border-neutral-800 tracking-tight font-mono">{children}</pre>;
        },
    };

    const getMD = (idx) => ({
        ...MD,
        code: (props) => MD.code({ ...props, messageIndex: idx })
    });

    /* ── Core send function ── */
    const sendMessage = useCallback(async (text) => {
        const question = (typeof text === 'string' ? text : input).trim();
        if (!question || loading) return;

        setInput('');
        setMessages(prev => [
            ...prev,
            { role: 'user', content: question },
            { role: 'assistant', content: '', isLoading: true }
        ]);
        setLoading(true);

        try {
            const url = getApiUrl('/ai/ask');
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    question,
                    conversationId: conversationId || undefined,
                    siteId: activeSiteId || undefined,
                    history: messages
                        .filter(m => !m.isLoading)
                        .map(m => ({ role: m.role, content: m.content })),
                }),
            });

            if (!response.ok) throw new Error('Failed to fetch');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulated = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                for (const line of chunk.split('\n')) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const data = JSON.parse(line.slice(6));

                        if (data.conversationId) {
                            setConversationId(data.conversationId);
                            conversationIdRef.current = data.conversationId;
                        }

                        if (data.chunk) {
                            accumulated += data.chunk;
                            setMessages(prev => {
                                const updated = [...prev];
                                const last = updated[updated.length - 1];
                                if (last?.role === 'assistant') {
                                    updated[updated.length - 1] = {
                                        ...last,
                                        content: accumulated,
                                        isLoading: false,
                                    };
                                }
                                return updated;
                            });

                            if (scrollContainerRef.current) {
                                const container = scrollContainerRef.current;
                                if (container.scrollHeight - container.scrollTop - container.clientHeight < 150) {
                                    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
                                }
                            }
                        }

                        if (data.error) {
                            setMessages(prev => {
                                const updated = [...prev];
                                const last = updated[updated.length - 1];
                                if (last?.role === 'assistant') {
                                    updated[updated.length - 1] = {
                                        ...last,
                                        content: accumulated ? `${accumulated}\n\n**⚠️ AI Interrupted:** ${data.error}` : data.error,
                                        isLoading: false,
                                        isError: !accumulated
                                    };
                                }
                                return updated;
                            });
                            break;
                        }
                    } catch { }
                }
            }
        } catch (err) {
            setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === 'assistant') {
                    updated[updated.length - 1] = {
                        ...last,
                        content: "Sorry, I'm having trouble connecting right now. Please try again.",
                        isLoading: false,
                        isError: true,
                    };
                }
                return updated;
            });
        } finally {
            setLoading(false);
        }
    }, [input, loading, token, activeSiteId, messages, conversationId]);

    const loadSuggestions = useCallback(async () => {
        if (!activeSiteId) return;
        setSuggestionsLoading(true);
        try {
            const res = await getSuggestedQuestions(activeSiteId);
            if (res.data && res.data.questions) {
                setSuggestions(res.data.questions);
            }
        } catch (err) {
            console.error("Failed to load suggestions:", err);
            setSuggestions([
                "How is my site performing?",
                "Top 5 organic keywords?",
                "Where is my traffic leaving?",
            ]);
        } finally {
            setSuggestionsLoading(false);
        }
    }, [activeSiteId]);

    useEffect(() => {
        if (isOpen && suggestions.length === 0) {
            loadSuggestions();
        }
    }, [isOpen, suggestions.length, loadSuggestions]);

    useEffect(() => {
        setSuggestions([]); // Reset when site changes to force re-fetch
    }, [activeSiteId]);

    /* ── Scroll to bottom ── */
    const scrollToEnd = useCallback((force = false) => {
        if (!isOpen) return;
        if (!scrollContainerRef.current) return;

        const container = scrollContainerRef.current;
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;

        if (force || isNearBottom) {
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: force ? 'smooth' : 'auto' });
            }, 10);
        }
    }, [isOpen]);

    useEffect(() => {
        if (messages.length > 0) {
            scrollToEnd(true);
        }
    }, [messages.length]); // Scroll ONLY when messages are added, not on open/re-render

    /* ── Handle initial question from store ── */
    useEffect(() => {
        if (initialQuestion) {
            sendMessage(initialQuestion);
            clearInitialQuestion();
        }
    }, [initialQuestion, sendMessage, clearInitialQuestion]);

    /* ── Focus input ── */
    useEffect(() => {
        if (isOpen && !loading) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen, loading]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleReset = () => {
        setMessages([]);
        setConversationId(null);
        conversationIdRef.current = null;
        setInput('');
    };

    // Don't render if not logged in
    if (!user) return null;

    return (
        <>
            {/* Floating Bubble */}
            <div className="fixed bottom-6 right-6 z-[99999] group">
                {/* Tooltip */}
                {!isOpen && (
                    <div className="absolute bottom-full right-0 mb-4 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none translate-y-2 group-hover:translate-y-0">
                        <div className="relative bg-neutral-900 text-white text-[11px] font-black px-4 py-2 rounded-xl whitespace-nowrap shadow-2xl uppercase tracking-widest border border-white/10">
                            ✨ Ask AI about your data
                            <div className="absolute -bottom-1 right-8 w-2 h-2 bg-neutral-900 rotate-45 border-r border-b border-white/10"></div>
                        </div>
                    </div>
                )}

                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`relative flex items-center gap-2.5 px-6 py-4 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl overflow-hidden ${isOpen
                            ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                            : 'bg-brand-600 text-white shadow-brand-500/40'
                        }`}
                >
                    {/* Shine/Shimmer Effect */}
                    {!isOpen && (
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none"></div>
                    )}

                    {isOpen ? (
                        <>
                            <XMarkIcon className="w-5 h-5 relative z-10" strokeWidth={2.5} />
                            <span className="text-sm font-black tracking-wide relative z-10">Close</span>
                        </>
                    ) : (
                        <>
                            <SparklesIcon className="w-5 h-5 animate-pulse relative z-10" strokeWidth={2.5} />
                            <span className="text-sm font-black tracking-wide relative z-10">Ask AI</span>
                            {/* Live Dot */}
                            <div className="relative flex h-2 w-2 ml-1 relative z-10">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                            </div>
                        </>
                    )}
                </button>
            </div>

            {/* Chat Panel */}
            {isOpen && (
                <div
                    className="fixed bottom-24 right-6 z-[99998] w-[calc(100vw-48px)] sm:w-[400px] h-[550px] max-h-[calc(100vh-120px)] bg-white dark:bg-black border border-neutral-200/80 dark:border-neutral-800 rounded-[2rem] shadow-[0_32px_80px_-12px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden transition-all duration-300"
                    style={{ animation: 'slideIn 0.3s cubic-bezier(0.22,1,0.36,1)' }}
                >
                    {/* Header */}
                    <div className="shrink-0 flex items-center justify-between px-6 py-5 border-b border-neutral-100 dark:border-neutral-900 bg-white dark:bg-black">
                        <div className="flex flex-col">
                            <h2 className="text-[15px] font-bold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
                                <SparklesIcon className="w-4 h-4 text-brand-500" />
                                RankPilot Intelligence
                            </h2>
                            <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-[0.2em] mt-0.5">
                                Pro Analytics Assistant
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={handleReset}
                                title="Reset Chat"
                                className="w-9 h-9 flex items-center justify-center rounded-2xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
                            >
                                <ArrowPathIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-9 h-9 flex items-center justify-center rounded-2xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div ref={scrollContainerRef} className="flex-1 flex flex-col overflow-y-auto px-6 py-6 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-white dark:bg-black">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center py-8 text-center min-h-full">
                                <h3 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight mb-2">How can I assist you?</h3>
                                <p className="text-sm text-neutral-400 dark:text-neutral-500 max-w-[280px] leading-relaxed font-medium">
                                    I'm your AI analytics partner. Ask me anything about your site performance.
                                </p>
                                <div className="mt-10 grid grid-cols-1 gap-3 w-full max-w-[320px]">
                                    {suggestionsLoading ? (
                                        [1, 2].map(i => (
                                            <div key={i} className="h-12 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl animate-pulse" />
                                        ))
                                    ) : (
                                        (suggestions.length > 0 ? suggestions.slice(0, 4) : [
                                            "How is my site performing overall?",
                                            "Show my top 5 organic keywords.",
                                            "Which pages have high traffic but low conversions?",
                                            "Explain the drop in my GSC clicks.",
                                        ]).map((q, i) => (
                                            <button
                                                key={i}
                                                onClick={() => sendMessage(q)}
                                                className="px-5 py-3.5 bg-neutral-50 dark:bg-neutral-800/30 border border-neutral-100 dark:border-neutral-700/30 rounded-2xl text-[12px] font-bold text-neutral-500 dark:text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-white dark:hover:bg-neutral-800 hover:border-brand-500/30 hover:shadow-xl hover:shadow-brand-500/5 transition-all text-left active:scale-95"
                                            >
                                                {q}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            <GlobalChatMessage
                                key={idx}
                                idx={idx}
                                msg={msg}
                                MD={getMD(idx)}
                                onEdit={(content) => { setInput(content); inputRef.current?.focus(); }}
                                onRetry={(content) => sendMessage(content)}
                            />
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="shrink-0 p-4 bg-white dark:bg-black border-t border-neutral-100 dark:border-neutral-900">
                        <div className="relative flex items-end gap-2 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/50 dark:border-neutral-700/50 rounded-[1.5rem] px-4 py-2.5 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:bg-white dark:focus-within:bg-neutral-800 transition-all shadow-inner">
                            <textarea
                                ref={inputRef}
                                rows={1}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={loading}
                                placeholder="Message RankPilot..."
                                className="flex-1 bg-transparent border-none outline-none text-[14px] text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 resize-none max-h-32 min-h-[24px] py-1.5 leading-relaxed font-medium"
                            />
                            <button
                                onClick={() => sendMessage()}
                                disabled={!input.trim() || loading}
                                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xl disabled:opacity-20 hover:scale-105 active:scale-95 transition-all"
                            >
                                {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PaperAirplaneIcon className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-[10px] text-center text-neutral-400 font-bold mt-4 uppercase tracking-[0.15em] opacity-40">
                            RankPilot AI can make mistakes.
                        </p>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes shimmer {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 2s infinite ease-in-out;
                }
                .animate-bounce-subtle {
                    animation: bounceSubtle 3s infinite ease-in-out;
                }
                @keyframes bounceSubtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
            `}</style>
        </>
    );
};

export default GlobalAiChat;
