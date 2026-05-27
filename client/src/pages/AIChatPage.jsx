import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/ui/DashboardLayout';
import { useAccountsStore } from '../store/accountsStore';
import { useAuthStore } from '../store/authStore';
import Logo from '../components/ui/Logo';
import {
    PaperAirplaneIcon,
    SparklesIcon,
    ChatBubbleLeftRightIcon,
    TrashIcon,
    PlusIcon,
    ChartBarIcon,
    ArrowPathIcon,
    ChevronDownIcon,
    DocumentTextIcon,
    CursorArrowRaysIcon,
    InboxStackIcon,
    SpeakerWaveIcon,
    MagnifyingGlassIcon,
    ArrowTrendingUpIcon,
    LinkIcon,
    GlobeAltIcon,
    DocumentDuplicateIcon,
    HandThumbUpIcon,
    HandThumbDownIcon,
    CheckIcon,
    PencilIcon,
    ArrowUpRightIcon
} from '@heroicons/react/24/outline';
import {
    getConversations,
    getConversation,
    deleteConversation,
    getWeeklyInsight,
    refreshWeeklyInsight,
    getSuggestedQuestions,
} from '../api/aiApi';
import { getApiUrl } from '../api/index';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ChartRenderer from '../components/ai/ChartRenderer';
import DashboardCanvas from '../components/ai/DashboardCanvas';

const MarkdownComponents = {
    code({ inline, className, children, ...props }) {
        const match = /language-json-chart-(\w+)/.exec(className || '');
        const isJson = /language-json/.test(className || '');
        const text = String(children).trim();

        if (!inline && (match || isJson)) {
            try {
                let cleanedJson = text
                    .replace(/```json\n?/g, '')
                    .replace(/```/g, '')
                    .replace(/[\u0000-\u001F]+/g, '') // Strip all unescaped control characters (newlines, tabs, etc.)
                    .trim();

                let chartData;
                try {
                    chartData = JSON.parse(cleanedJson);
                } catch (e) {
                    // Auto-repair incomplete JSON from LLM stream
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

                if (!match && isJson && !hasChartKeys(chartData)) {
                    return (
                        <div className="my-6 rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-zinc-900/50 p-4">
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                                <DocumentTextIcon className="w-3.5 h-3.5 text-neutral-400" />
                                <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Raw Data / JSON</span>
                            </div>
                            <code className="text-[12px] font-mono text-neutral-800 dark:text-neutral-300 block whitespace-pre overflow-x-auto" {...props}>{children}</code>
                        </div>
                    );
                }

                const finalType = match ? match[1] : (chartData.chartType || 'line');

                if (chartData.layout === 'dashboard' || finalType === 'dashboard') {
                    // Trigger canvas open automatically, but only once per unique dashboard payload to avoid infinite re-render loops
                    if (!window[`canvas_opened_${text.length}`]) {
                        window[`canvas_opened_${text.length}`] = true;
                        setTimeout(() => window.dispatchEvent(new CustomEvent('open-ai-canvas', { detail: chartData })), 50);
                    }

                    return (
                        <div className="my-6 p-5 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex flex-wrap items-center justify-between gap-4 bg-neutral-50/50 dark:bg-neutral-900/20 transition-all hover:bg-white dark:hover:bg-neutral-900 shadow-sm hover:shadow-md group/card">
                            <div className="flex items-center gap-4 flex-1 min-w-[220px]">
                                <div className="w-10 h-10 shrink-0 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center transition-transform group-hover/card:scale-105">
                                    <ChartBarIcon className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[13px] font-black text-neutral-900 dark:text-white uppercase tracking-wider">AI Visualization Ready</p>
                                    <p className="text-[11px] font-bold text-neutral-400 mt-0.5 tracking-tight">Interactive analytics dashboard generated</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => window.dispatchEvent(new CustomEvent('open-ai-canvas', { detail: chartData }))}
                                className="shrink-0 px-6 py-2.5 bg-neutral-900 dark:bg-white hover:bg-black dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-[11px] font-black rounded-xl transition-all shadow-lg active:scale-95 text-center flex items-center gap-2 group/btn"
                            >
                                <span>Open Canvas</span>
                                <ArrowUpRightIcon className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" strokeWidth={3} />
                            </button>
                        </div>
                    );
                }

                return (
                    <div className="my-8 w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        <div className="min-w-[500px]">
                            <ChartRenderer type={finalType} data={chartData} />
                        </div>
                    </div>
                );
            } catch (err) {
                if (match || (isJson && text.length > 20)) {
                    if (text.trim().endsWith('}') || text.trim().endsWith(']')) {
                        return (
                            <div className="my-6 rounded-2xl overflow-hidden border border-red-200 dark:border-red-900/30 shadow-sm bg-red-50 dark:bg-red-900/10 p-4">
                                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-red-100 dark:border-red-900/20">
                                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Malformed Chart Data</span>
                                </div>
                                <code className="text-[12px] font-mono text-red-400 block whitespace-pre overflow-x-auto">{text}</code>
                                <div className="mt-3 text-[10px] text-red-500/70 font-mono">Error: {err.message}</div>
                            </div>
                        );
                    }
                    return (
                        <div className="my-6 p-8 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl flex flex-col items-center justify-center bg-neutral-50/50 dark:bg-neutral-800/20 backdrop-blur-sm">
                            <div className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-ping mb-4" />
                            <span className="text-[11px] font-black text-neutral-400 uppercase tracking-[0.2em] leading-none">
                                {`Generating ${match ? match[1] : 'Advanced Analytics'}...`}
                            </span>
                        </div>
                    );
                }
            }
        }
        return (
            <code className="px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-brand-600 dark:text-brand-400 font-bold text-[13px]" {...props}>
                {children}
            </code>
        );
    },
    ul: ({ children }) => <ul className="space-y-2.5 mb-6 pl-6 list-disc marker:text-neutral-900 dark:marker:text-white marker:font-bold">{children}</ul>,
    ol: ({ children }) => <ol className="space-y-2.5 mb-6 pl-6 list-decimal marker:text-neutral-900 dark:marker:text-white marker:font-bold">{children}</ol>,
    li: ({ children }) => {
        const getNestedText = (child) => {
            if (typeof child === 'string' || typeof child === 'number') return child;
            if (Array.isArray(child)) return child.map(getNestedText).join('');
            if (child?.props?.children) return getNestedText(child.props.children);
            return '';
        };
        const text = getNestedText(children);

        // 1. Roadmap Item Detection: Emoji + Priority + (Timeframe) - Title: Description
        // Using a more robust regex that handles different hyphens and extra colons
        const roadmapMatch = text.match(/^(🔴|🟡|🟢)\s*(HIGH|MEDIUM|LOW)\s*\(([^)]+)\)\s*[-–—]\s*(.*?):\s*([\s\S]*)$/i);

        if (roadmapMatch) {
            const [_, icon, priority, timeframe, title, description] = roadmapMatch;
            const borderClass = icon === '🔴' ? 'border-l-rose-500' : icon === '🟡' ? 'border-l-amber-500' : 'border-l-emerald-500';

            return (
                <div className={`my-6 p-5 pl-7 border-l-4 border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-transparent rounded-xl shadow-sm transition-all hover:border-neutral-200 dark:hover:border-neutral-700 list-none`}>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{priority} • {timeframe}</span>
                    </div>
                    <h4 className="text-[16px] font-bold text-neutral-900 dark:text-white mb-2 leading-tight">
                        {title}
                    </h4>
                    <p className="text-[14px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
                        {description}
                    </p>
                </div>
            );
        }

        // 2. Original Priority List Item Detection
        const priorityMatch = text.match(/^(🔴|🟡|🟢)/);

        if (priorityMatch) {
            const icon = priorityMatch[1];
            const cleanText = text.replace(icon, '').trim();
            const colorClass = icon === '🔴' ? 'text-rose-500' : icon === '🟡' ? 'text-amber-500' : 'text-emerald-500';

            return (
                <li className="flex items-start gap-2.5 mb-4 last:mb-0 group/item list-none">
                    <span className={`shrink-0 mt-1 text-[14px]`}>{icon}</span>
                    <span className="text-[15px] text-neutral-700 dark:text-neutral-200 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
                        {cleanText}
                    </span>
                </li>
            );
        }
        return <li className="text-[15px] text-neutral-700 dark:text-neutral-200 break-words [word-break:break-word] pl-2 mb-2 last:mb-0">{children}</li>;
    },
    h1: ({ children }) => <h1 className="text-2xl font-black text-neutral-900 dark:text-white mt-12 mb-6 tracking-tight border-t border-neutral-200 dark:border-neutral-700 pt-10 first:mt-0 first:border-0 first:pt-0">{children}</h1>,
    h2: ({ children }) => {
        const text = React.Children.toArray(children).join('');
        const typeMatch = text.match(/^(🟢|🟡|🔴)/);

        if (typeMatch) {
            const icon = typeMatch[1];
            const colorClass = icon === '🟢' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                icon === '🟡' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                    'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
            return (
                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border ${colorClass} text-[11px] font-black uppercase tracking-[0.15em] my-6 animate-in fade-in slide-in-from-left-4 duration-500`}>
                    <span className="animate-pulse">{icon}</span>
                    {children}
                </div>
            );
        }
        return <h2 className="text-xl font-bold text-neutral-900 dark:text-white mt-10 mb-5 tracking-tight border-t border-neutral-200 dark:border-neutral-700/60 pt-8 first:mt-0 first:border-0 first:pt-0">{children}</h2>;
    },
    h3: ({ children }) => {
        const text = React.Children.toArray(children).join('');
        if (text.toLowerCase().includes('strategic roadmap')) {
            return (
                <div className="flex items-center gap-3 mb-6 mt-10 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                    <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-400">
                        <SparklesIcon className="w-4 h-4" />
                    </div>
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white m-0 tracking-tight">
                        {text.replace(/^[💡\s]+/, '')}
                    </h3>
                </div>
            );
        }
        return <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200 mt-8 mb-4 pt-6 border-t border-neutral-200 dark:border-neutral-700/40 first:mt-0 first:border-0 first:pt-0">{children}</h3>;
    },
    p: ({ children }) => <p className="mb-5 leading-relaxed text-[15px] text-neutral-700 dark:text-neutral-200 break-words [word-break:break-word]">{children}</p>,
    strong: ({ children }) => <strong className="font-extrabold text-neutral-900 dark:text-white break-words [word-break:break-word]">{children}</strong>,
    table: ({ children }) => (
        <div className="my-10 w-full overflow-x-auto border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-xl">
            <table className="w-full text-left border-collapse min-w-[600px]">
                {children}
            </table>
        </div>
    ),
    thead: ({ children }) => <thead className="bg-neutral-50 dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-700">{children}</thead>,
    tbody: ({ children }) => <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50 bg-white dark:bg-dark-card">{children}</tbody>,
    tr: ({ children }) => <tr className="hover:bg-brand-50/30 dark:hover:bg-brand-900/5 transition-colors">{children}</tr>,
    th: ({ children }) => <th className="px-6 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400 whitespace-nowrap">{children}</th>,
    td: ({ children }) => <td className="px-6 py-5 text-[14px] text-neutral-700 dark:text-neutral-100 font-bold">{children}</td>
};

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

const ChatMessage = React.memo(({ msg, userName, userAvatar, onEdit, onRetry }) => {
    const isUser = msg.role === 'user';
    const [isCopied, setIsCopied] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const isLongMessage = msg.content?.length > 600 || (msg.content?.split('\n').length > 10);

    const handleCopy = () => {
        if (!msg.content) return;
        navigator.clipboard.writeText(msg.content);
        setIsCopied(true);
        toast.success("Copied to clipboard!", {
            style: {
                background: '#333',
                color: '#fff',
                fontSize: '12px'
            }
        });
        setTimeout(() => setIsCopied(false), 2000);
    };

    if (isUser) {
        return (
            <div className="flex justify-end mb-4 w-full">
                <div className="flex flex-col items-end max-w-[90%] sm:max-w-[75%] group">
                    <div className={`px-5 py-3.5 bg-zinc-100 dark:bg-zinc-800 rounded-2xl text-[15px] text-zinc-800 dark:text-zinc-100 leading-relaxed break-words relative overflow-hidden transition-all duration-500 shadow-sm dark:shadow-none ${(!isExpanded && isLongMessage) ? 'max-h-[280px]' : 'max-h-[5000px]'}`}>
                        <div className="whitespace-pre-wrap">{msg.content}</div>

                        {!isExpanded && isLongMessage && (
                            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-zinc-100 dark:from-zinc-800 via-zinc-100/90 dark:via-zinc-800/90 to-transparent pointer-events-none flex items-end justify-start px-5 pb-3">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
                                    className="text-[13px] font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 pointer-events-auto transition-colors"
                                >
                                    Show more
                                </button>
                            </div>
                        )}
                    </div>
                    {isExpanded && isLongMessage && (
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="text-[12px] font-bold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 mt-2 self-start pl-2 transition-colors"
                        >
                            Show less
                        </button>
                    )}
                    {/* User Actions Bar */}
                    <div className="flex items-center gap-2.5 mt-1.5 pr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-neutral-400 dark:text-neutral-500">
                        <span className="text-[12px] font-medium mr-1 cursor-default hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors" title={format(new Date(msg.createdAt || Date.now()), 'PPP p')}>
                            {format(new Date(msg.createdAt || Date.now()), 'MMM d')}
                        </span>
                        <button onClick={() => onRetry?.(msg.content)} className="hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors" title="Retry">
                            <ArrowPathIcon className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onEdit?.(msg.content)} className="hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors" title="Edit">
                            <PencilIcon className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={handleCopy} className="hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors" title="Copy text">
                            {isCopied ? <CheckIcon className="w-3.5 h-3.5 text-green-500" /> : <DocumentDuplicateIcon className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex justify-start w-full max-w-full mb-6">
            <div className="flex-1 min-w-0 overflow-hidden w-full group pl-1">
                {msg.isError ? (
                    <div className="px-4 py-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30 rounded-xl text-sm text-red-600 dark:text-red-400">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={MarkdownComponents}
                        >
                            {msg.content}
                        </ReactMarkdown>
                    </div>
                ) : (
                    <>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed text-neutral-800 dark:text-neutral-100 break-words [word-break:break-word] [&_a]:break-all">
                            {msg.content ? (
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={MarkdownComponents}
                                >
                                    {msg.content}
                                </ReactMarkdown>
                            ) : msg.isLoading ? (
                                <TypingIndicator />
                            ) : (
                                <div className="py-2 text-neutral-400 font-medium italic text-[14px] flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 animate-pulse" />
                                    No response generated by the server.
                                </div>
                            )}
                        </div>

                        {/* Actions Bar (Copy Only) */}
                        {msg.content && !msg.isLoading && (
                            <div className="flex items-center gap-2 mt-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <span className="text-[11px] font-medium text-neutral-400 mr-1 cursor-default" title={format(new Date(msg.createdAt || Date.now()), 'PPP p')}>
                                    {format(new Date(msg.createdAt || Date.now()), 'MMM d')}
                                </span>
                                <button
                                    onClick={handleCopy}
                                    className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors flex items-center justify-center bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/50 shadow-sm"
                                    title="Copy response"
                                >
                                    {isCopied ? <CheckIcon className="w-3.5 h-3.5 text-green-500" /> : <DocumentDuplicateIcon className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
});

const AIChatPage = () => {
    const { userSites, gsc, ga4, googleAds, facebook, activeSiteId } = useAccountsStore();
    const { user } = useAuthStore();
    const navigate = useNavigate();

    const activeSite = userSites?.find?.(s => s._id === activeSiteId);
    const isSyncingHistorical = !!(activeSite && (
        (activeSite.ga4PropertyId && !activeSite.ga4HistoricalComplete) ||
        (activeSite.gscSiteUrl && !activeSite.gscHistoricalComplete) ||
        (activeSite.googleAdsCustomerId && !activeSite.googleAdsHistoricalComplete) ||
        (activeSite.facebookAdAccountId && !activeSite.facebookAdsHistoricalComplete)
    ));



    const hasConnections = !!(gsc?.gscSiteUrl || ga4?.ga4PropertyId || googleAds?.googleAdsCustomerId || facebook?.facebookAdAccountId);
    const [searchParams, setSearchParams] = useSearchParams();
    const urlConversationId = searchParams.get('conversationId');

    const [messages, setMessages] = useState([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);

    const [conversations, setConversations] = useState([]);
    const [activeConversationId, setActiveConversationId] = useState(null);

    const [weeklyInsight, setWeeklyInsight] = useState(null);
    const [insightLoading, setInsightLoading] = useState(false);

    const [suggestions, setSuggestions] = useState([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);

    const [isCanvasOpen, setIsCanvasOpen] = useState(false);
    const [canvasData, setCanvasData] = useState(null);
    const [isCanvasFullscreen, setIsCanvasFullscreen] = useState(false);

    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isInsightOpen, setIsInsightOpen] = useState(false);
    const [chatToDelete, setChatToDelete] = useState(null);
    const messagesEndRef = useRef(null);
    const sourceMenuRef = useRef(null);
    const textareaRef = useRef(null);
    const chatContainerRef = useRef(null);
    const scrollTargetRef = useRef(null); // To store index from URL

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
        }
    }, [query]);
    useEffect(() => {
        const handleOpenCanvas = (e) => {
            setCanvasData(e.detail);
            setIsCanvasOpen(true);
            setIsCanvasFullscreen(false);
        };
        window.addEventListener('open-ai-canvas', handleOpenCanvas);
        return () => window.removeEventListener('open-ai-canvas', handleOpenCanvas);
    }, []);
    useEffect(() => {
        loadConversations();
        loadWeeklyInsight();
        loadSuggestions();

        // Restore last active conversation from localStorage
        if (activeSiteId && !urlConversationId) {
            const savedConvId = localStorage.getItem(`rankpilot_active_conversation_id_${activeSiteId}`);
            if (savedConvId) {
                loadConversationDetails(savedConvId);
            } else {
                handleNewChat();
            }
        }
    }, [activeSiteId, urlConversationId]);

    useEffect(() => {
        if (urlConversationId) {
            const scrollIdx = searchParams.get('scrollToIndex');
            if (scrollIdx) scrollTargetRef.current = scrollIdx;

            loadConversationDetails(urlConversationId);

            // Clear params after loading
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('conversationId');
            newParams.delete('scrollToIndex');
            setSearchParams(newParams, { replace: true });
        }
    }, [urlConversationId]);

    // Handle scroll to target once messages are loaded
    useEffect(() => {
        if (scrollTargetRef.current && messages.length > 0) {
            const index = parseInt(scrollTargetRef.current);
            scrollTargetRef.current = null; // Reset

            setTimeout(() => {
                const element = document.getElementById(`chat-message-${index}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Highlight the target message briefly
                    element.classList.add('ring-2', 'ring-brand-500/20', 'bg-brand-500/[0.02]');
                    setTimeout(() => {
                        element.classList.remove('ring-2', 'ring-brand-500/20', 'bg-brand-500/[0.02]');
                    }, 2000);
                }
            }, 500);
        }
    }, [messages.length]);

    const loadConversations = async () => {
        try {
            const res = await getConversations(activeSiteId);
            setConversations(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const loadConversationDetails = async (id) => {
        try {
            // Clear all previous canvas trigger flags to allow re-triggering for new conversation
            Object.keys(window).forEach(key => {
                if (key.startsWith('canvas_opened_')) {
                    delete window[key];
                }
            });

            const res = await getConversation(id);
            setMessages(res.data.messages);
            setActiveConversationId(res.data._id);
            if (activeSiteId) {
                localStorage.setItem(`rankpilot_active_conversation_id_${activeSiteId}`, res.data._id);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleNewChat = () => {
        setActiveConversationId(null);
        setMessages([]);
        if (activeSiteId) {
            localStorage.removeItem(`rankpilot_active_conversation_id_${activeSiteId}`);
        }
    };

    const handleDeleteConversation = (id, e) => {
        e.stopPropagation();
        setChatToDelete(id);
    };

    const confirmDelete = async () => {
        if (!chatToDelete) return;
        try {
            await deleteConversation(chatToDelete);
            if (activeConversationId === chatToDelete) {
                handleNewChat();
            }
            setChatToDelete(null);
            loadConversations();
        } catch (err) {
            console.error(err);
        }
    };

    const loadWeeklyInsight = async () => {
        setInsightLoading(true);
        try {
            const res = await getWeeklyInsight(activeSiteId);
            if (res.data) setWeeklyInsight(res.data);
        } catch (err) {
            console.error(err);
            setWeeklyInsight(null);
        } finally {
            setInsightLoading(false);
        }
    };

    const handleRefreshInsight = async () => {
        setInsightLoading(true);
        try {
            const res = await refreshWeeklyInsight(activeSiteId);
            setWeeklyInsight(res.data);
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to refresh insights.");
        } finally {
            setInsightLoading(false);
        }
    };

    const loadSuggestions = async () => {
        setSuggestionsLoading(true);
        try {
            const res = await getSuggestedQuestions(activeSiteId);
            const questions = res.data?.questions || [];
            if (questions.length > 0) {
                setSuggestions(questions);
            } else {
                // Use fallbacks if empty
                setSuggestions([
                    "Find keywords with high impressions but low CTR.",
                    "Identify GA4 conversion leaks in my funnel.",
                    "Which Google Ads campaigns have highest ROI?",
                    "Compare ROAS across Meta Ads audiences."
                ]);
            }
        } catch (err) {
            console.error(err);
            setSuggestions([
                "Find keywords with high impressions but low CTR.",
                "Identify GA4 conversion leaks in my funnel.",
                "Which Google Ads campaigns have highest ROI?",
                "Compare ROAS across Meta Ads audiences."
            ]);
        } finally {
            setSuggestionsLoading(false);
        }
    };

    const handleSendMessage = async (e, customQuery = null) => {
        if (e) e.preventDefault();
        const textToUse = customQuery || query;
        if (!textToUse.trim() || loading) return;

        const currentQuery = textToUse.trim();
        if (!customQuery) setQuery('');

        const newMessages = [...messages, { role: 'user', content: currentQuery }];
        setMessages([...newMessages, { role: 'assistant', content: '', isLoading: true }]);
        setLoading(true);

        const scrollToEnd = (force = false) => {
            if (!chatContainerRef.current) return;
            const container = chatContainerRef.current;
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;

            if (force || isNearBottom) {
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: force ? 'smooth' : 'auto', block: 'end' });
                }, 10);
            }
        };
        scrollToEnd(true);

        try {
            const token = useAuthStore.getState().token;
            const url = getApiUrl('/ai/ask');
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    question: currentQuery,
                    conversationId: activeConversationId,
                    siteId: activeSiteId,
                    history: messages.filter(m => !m.isLoading).slice(-15).map(m => ({ role: m.role, content: m.content })),
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || errorData.message || `Server error: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            if (data.error) {
                                // Sync conversation ID even on error to prevent duplicates
                                if (!activeConversationId && data.conversationId) {
                                    setActiveConversationId(data.conversationId);
                                    if (activeSiteId) {
                                        localStorage.setItem(`rankpilot_active_conversation_id_${activeSiteId}`, data.conversationId);
                                    }
                                    loadConversations();
                                }

                                setMessages(prev => {
                                    const updated = [...prev];
                                    const lastMsg = updated[updated.length - 1];
                                    if (lastMsg && lastMsg.role === 'assistant') {
                                        updated[updated.length - 1] = {
                                            ...lastMsg,
                                            content: accumulatedContent ? `${accumulatedContent}\n\n**⚠️ AI Interrupted:** ${data.error}` : data.error,
                                            isLoading: false,
                                            isError: !accumulatedContent // Only turn the whole box red if it failed immediately
                                        };
                                    }
                                    return updated;
                                });
                                break;
                            }

                            if (data.chunk) {
                                accumulatedContent += data.chunk;
                                setMessages(prev => {
                                    const updated = [...prev];
                                    const lastMsg = updated[updated.length - 1];
                                    if (lastMsg && lastMsg.role === 'assistant') {
                                        updated[updated.length - 1] = { ...lastMsg, content: accumulatedContent, isLoading: false };
                                    }
                                    return updated;
                                });
                                scrollToEnd();
                            }

                            if (data.done) {
                                if (!activeConversationId && data.conversationId) {
                                    setActiveConversationId(data.conversationId);
                                    if (activeSiteId) {
                                        localStorage.setItem(`rankpilot_active_conversation_id_${activeSiteId}`, data.conversationId);
                                    }
                                    loadConversations();
                                }
                            }
                        } catch (e) {
                            // Only skip JSON parse errors in chunks
                            console.error("SSE JSON Parse Error:", e);
                        }
                    }
                }
            }
        } catch (err) {
            console.error("AI Error:", err);
            const getFriendlyError = (msg) => {
                if (msg.includes('API_KEY_INVALID')) return "There's a configuration issue with the AI connection.";
                if (msg.includes('QuotaFailure') || msg.includes('limit') || msg.includes('429')) return "High volume of requests. Please wait a minute.";
                if (msg.includes('Network') || msg.includes('fetch')) return "Trouble connecting to the analytics server.";
                if (msg.includes('safety')) return "Falls outside safety guidelines.";
                return "Unexpected error while analyzing your data.";
            };

            const friendlyMsg = getFriendlyError(err.message || "");
            const rawError = err.message || "Unknown error";

            setMessages(prev => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                    const existingContent = lastMsg.content || "";
                    updated[updated.length - 1] = {
                        ...lastMsg,
                        content: existingContent ? `${existingContent}\n\n**⚠️ AI Interrupted:** ${friendlyMsg}\n\n---\n*Technical details: ${rawError}*` : `${friendlyMsg}\n\n---\n*Technical details: ${rawError}*`,
                        isLoading: false,
                        isError: !existingContent
                    };
                }
                return updated;
            });
        } finally {
            setLoading(false);
            setMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                    updated[lastIdx] = {
                        ...updated[lastIdx],
                        isLoading: false
                    };
                }
                return updated;
            });
        }
    };

    const toggleSource = (source) => {
        setSelectedSources(prev =>
            prev.includes(source)
                ? prev.filter(s => s !== source)
                : [...prev, source]
        );
    };

    const getTimeGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    const sourceLabels = {
        'gsc': 'Google Search Console',
        'ga4': 'Google Analytics 4',
        'google-ads': 'Google Ads',
        'facebook-ads': 'Facebook Ads'
    };

    return (
        <DashboardLayout noScroll>
            <div className="flex-1 flex flex-col min-h-0 h-full w-full overflow-hidden bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700/60 rounded-2xl shadow-sm relative">

                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-24 bg-brand-500/10 blur-[60px] pointer-events-none z-0" />

                {hasConnections ? (
                    <>
                        {/* 2. MOBILE HEADER — shrink-0 */}
                        <div className="lg:hidden shrink-0 flex items-center justify-between px-4 py-3.5 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-dark-card w-full z-[60]">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center shadow-md shadow-brand-500/30">
                                    <SparklesIcon className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-sm font-black text-neutral-900 dark:text-white">RankPilot AI</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button type="button" title="Weekly Insight"
                                    onClick={() => { setIsInsightOpen(!isInsightOpen); setIsHistoryOpen(false); if (!isInsightOpen && !weeklyInsight) loadWeeklyInsight(); }}
                                    className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${isInsightOpen ? 'text-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'text-neutral-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20'}`}>
                                    <InboxStackIcon className={`w-4 h-4 ${insightLoading ? 'animate-pulse' : ''}`} />
                                </button>
                                <button type="button" title="Chat History"
                                    onClick={() => { setIsHistoryOpen(!isHistoryOpen); setIsInsightOpen(false); }}
                                    className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${isHistoryOpen ? 'text-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'text-neutral-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20'}`}>
                                    <ChatBubbleLeftRightIcon className="w-4 h-4" />
                                </button>
                                <button type="button" title="New Chat"
                                    onClick={() => { handleNewChat(); setIsHistoryOpen(false); setIsInsightOpen(false); }}
                                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 transition-all active:scale-95">
                                    <PlusIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 flex min-h-0 relative w-full overflow-hidden">
                            {/* 3. HISTORY DRAWER */}
                            {isHistoryOpen && (
                                <div className="absolute inset-0 lg:static lg:w-72 lg:border-r border-neutral-100 dark:border-neutral-800 z-50 flex flex-col overflow-hidden bg-white dark:bg-dark-card animate-in slide-in-from-left duration-300 shrink-0">
                                    {/* Header */}
                                    <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                                                <ChatBubbleLeftRightIcon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                                            </div>
                                            <div>
                                                <h2 className="text-sm font-black text-neutral-900 dark:text-white">Chat History</h2>
                                                <p className="text-[10px] text-neutral-400 font-medium">{conversations.length} conversations</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setIsHistoryOpen(false)}
                                            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-all">
                                            <PlusIcon className="w-4 h-4 rotate-45" />
                                        </button>
                                    </div>

                                    {/* List */}
                                    <div className="flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] p-3">
                                        {conversations.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-center py-12">
                                                <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                                                    <ChatBubbleLeftRightIcon className="w-7 h-7 text-neutral-300 dark:text-neutral-600" />
                                                </div>
                                                <p className="text-sm font-black text-neutral-500 dark:text-neutral-400">No chats yet</p>
                                                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1 font-medium">Start a new conversation</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                {conversations.map(conv => (
                                                    <div key={conv._id}
                                                        onClick={() => { loadConversationDetails(conv._id); setIsHistoryOpen(window.innerWidth >= 1024); }}
                                                        className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${activeConversationId === conv._id
                                                            ? 'bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800'
                                                            : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50 border border-transparent'
                                                            }`}>
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${activeConversationId === conv._id
                                                                ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                                                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
                                                                }`}>
                                                                <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate">{conv.title || 'New Chat'}</p>
                                                                {conv.updatedAt && (
                                                                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                                                                        {new Date(conv.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button onClick={e => handleDeleteConversation(conv._id, e)}
                                                            className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 text-neutral-400 transition-all flex-shrink-0 ml-2">
                                                            <TrashIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div className="shrink-0 p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/20">
                                        <button onClick={() => { handleNewChat(); setIsHistoryOpen(window.innerWidth >= 1024); }}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-xs font-black transition-all hover:opacity-90 active:scale-95 shadow-lg">
                                            <PlusIcon className="w-4 h-4" />
                                            Start New Conversation
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* CENTER COLUMN: Split Area (Left: Chat+Input, Right: Canvas) */}
                            <div className="flex-1 flex min-w-0 bg-white dark:bg-dark-card overflow-hidden relative">

                                {/* LEFT: Chat Container + Input */}
                                <div className={`flex flex-col h-full ${isCanvasOpen ? (isCanvasFullscreen ? 'hidden' : 'w-full lg:w-1/3 border-r border-neutral-100 dark:border-neutral-800 lg:flex hidden') : 'w-full'}`}>

                                    {/* Chat Scroll Area */}
                                    <div ref={chatContainerRef} className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                        {messages.length === 0 ? (
                                            /* 5. EMPTY STATE — centered, compact */
                                            <div className="flex-1 flex flex-col items-center py-6 sm:py-12 px-4 sm:px-10 my-auto w-full">
                                                {/* AI Icon with glow */}
                                                <div className="relative mb-4 shrink-0">
                                                    <div className="relative z-10 transition-transform hover:scale-105 duration-300">
                                                        <Logo className="w-16 h-16 sm:w-20 sm:h-20" iconOnly />
                                                    </div>
                                                    <div className="absolute -inset-4 rounded-full bg-brand-400/10 animate-pulse blur-2xl" />
                                                </div>

                                                {/* Greeting */}
                                                <h1 className="text-xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight mb-2 text-center shrink-0">
                                                    {getTimeGreeting()}, {user?.name?.split(' ')[0] || 'Explorer'}
                                                </h1>
                                                <p className="text-[13px] sm:text-sm text-neutral-500 dark:text-neutral-400 font-medium mb-4 sm:mb-6 text-center max-w-xs sm:max-w-sm leading-relaxed shrink-0">
                                                    {isSyncingHistorical
                                                        ? "RankPilot is currently syncing your historical data. AI features will be active shortly."
                                                        : "Ask anything about your marketing data. I have access to all your connected platforms."
                                                    }
                                                </p>

                                                {isSyncingHistorical ? (
                                                    <div className="w-full max-w-md bg-amber-500/[0.03] dark:bg-amber-500/[0.01] border border-amber-500/20 rounded-[2rem] p-6 shadow-xl relative overflow-hidden group mb-8 flex flex-col items-center">
                                                        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/5 rounded-full blur-[80px]" />
                                                        <div className="flex flex-col items-center text-center gap-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center animate-bounce-subtle">
                                                                <ArrowPathIcon className="w-6 h-6 text-amber-500 animate-spin" />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-widest mb-1.5">Historical Sync Active</h3>
                                                                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-bold leading-relaxed max-w-xs">
                                                                    We are currently importing and analyzing your historical marketing trends. AI chat and strategic insights are temporarily paused during this process to ensure complete accuracy.
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
                                                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                                                                <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Importing Data...</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    /* Suggestions — moved here from footer */
                                                    <div className="w-full max-w-2xl mx-auto">
                                                        {/* Loading skeleton */}
                                                        {suggestionsLoading && (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                                                                {[1, 2, 3, 4].map(i => (
                                                                    <div key={i} className="h-[72px] bg-neutral-100 dark:bg-neutral-800 rounded-2xl animate-pulse" />
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Suggestion cards */}
                                                        {!suggestionsLoading && suggestions.length > 0 && (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                                                                {suggestions.slice(0, 4).map((q, i) => (
                                                                    <button key={i} onClick={() => setQuery(q)}
                                                                        className="px-4 py-3.5 sm:px-5 sm:py-4 bg-neutral-50 dark:bg-neutral-800/50 hover:bg-brand-50 dark:hover:bg-brand-900/10 border border-neutral-200 dark:border-neutral-700/50 hover:border-brand-300 dark:hover:border-brand-600 rounded-2xl text-[11px] sm:text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-brand-600 dark:hover:text-brand-400 transition-all text-left leading-relaxed active:scale-[0.98] shadow-sm">
                                                                        {q}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Quick action pills */}
                                                        <div className="flex flex-wrap justify-center gap-2 mb-8">
                                                            {[
                                                                {
                                                                    label: 'Search Console',
                                                                    prompt: 'Analyze my Google Search Console performance and identify top-ranking keywords.',
                                                                    logo: <img src="https://www.gstatic.com/images/branding/product/2x/search_console_64dp.png" alt="GSC" className="w-3.5 h-3.5 object-contain" />
                                                                },
                                                                {
                                                                    label: 'GA4 Analytics',
                                                                    prompt: 'Deep dive into my GA4 data to understand user behavior and conversions.',
                                                                    logo: <img src="https://www.vectorlogo.zone/logos/google_analytics/google_analytics-icon.svg" alt="GA4" className="w-3.5 h-3.5 object-contain" />
                                                                },
                                                                {
                                                                    label: 'Google Ads',
                                                                    prompt: 'Evaluate my Google Ads campaign efficiency including CTR, CPC, and ROAS.',
                                                                    logo: <img src="https://www.vectorlogo.zone/logos/google_ads/google_ads-icon.svg" alt="Google Ads" className="w-3.5 h-3.5 object-contain" />
                                                                },
                                                                {
                                                                    label: 'Facebook Ads',
                                                                    prompt: 'Review my Meta Ads reach and engagement metrics.',
                                                                    logo: <img src="https://www.vectorlogo.zone/logos/facebook/facebook-icon.svg" alt="Meta Ads" className="w-3.5 h-3.5 object-contain" />
                                                                },
                                                            ].map((item, i) => (
                                                                <button key={i} onClick={() => setQuery(item.prompt)}
                                                                    className="flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/50 rounded-xl text-[10px] sm:text-[11px] font-bold text-neutral-500 dark:text-neutral-400 hover:border-brand-400 dark:hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-300 transition-all active:scale-95 group shadow-sm">
                                                                    {item.logo}
                                                                    {item.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                            </div>
                                        ) : (
                                            /* 6. MESSAGES AREA — hidden scrollbar */
                                            <div className="px-3 sm:px-5 md:px-8 py-5 sm:py-8">
                                                <div className={`${isCanvasOpen ? 'w-full' : 'max-w-3xl mx-auto'} w-full space-y-6 pb-4 transition-all duration-300`}>
                                                    {messages.map((msg, idx) => (
                                                        <div key={idx} id={`chat-message-${idx}`} className="transition-all duration-1000 rounded-2xl">
                                                            <ChatMessage
                                                                msg={msg}
                                                                userName={user?.name}
                                                                userAvatar={user?.avatar}
                                                                onEdit={(text) => {
                                                                    setQuery(text);
                                                                    setTimeout(() => textareaRef.current?.focus(), 50);
                                                                }}
                                                                onRetry={(text) => handleSendMessage(null, text)}
                                                            />
                                                        </div>
                                                    ))}
                                                    <div ref={messagesEndRef} className="h-4" />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 7. BOTTOM INPUT BAR — shrink-0, always at bottom of left column */}
                                    <div className="shrink-0 border-t border-neutral-100 dark:border-neutral-800 px-3 sm:px-4 py-4 bg-white dark:bg-dark-card w-full z-10">
                                        {isSyncingHistorical ? (
                                            <div className="flex items-center gap-3.5 p-4 border border-amber-500/20 bg-amber-500/[0.03] dark:bg-amber-500/[0.01] rounded-2xl w-full max-w-3xl mx-auto shadow-sm">
                                                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                                                    <ArrowPathIcon className="w-5 h-5 text-amber-500 animate-spin" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-[0.15em] mb-0.5">AI Chat Paused</h4>
                                                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-bold leading-normal">
                                                        Historical sync is currently in progress. AI chat and performance insights will automatically become available once the sync completes.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Input form */
                                            <form onSubmit={handleSendMessage} className={`${isCanvasOpen ? 'w-full' : 'max-w-3xl mx-auto'}`}>
                                                <div className="flex items-end gap-2 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl px-2.5 sm:px-3 py-2 sm:py-2.5 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/10 transition-all shadow-sm">
                                                    {/* Left action buttons */}
                                                    <div className="flex items-center gap-0.5 flex-shrink-0 pb-0.5">
                                                        <button type="button" onClick={handleNewChat} title="New Chat"
                                                            className="hidden lg:flex w-8 h-8 items-center justify-center rounded-xl text-neutral-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all">
                                                            <PlusIcon className="w-4 h-4" />
                                                        </button>
                                                        <button type="button" title="Weekly Insight"
                                                            onClick={() => { setIsInsightOpen(!isInsightOpen); if (!isInsightOpen) { setIsHistoryOpen(false); if (!weeklyInsight) loadWeeklyInsight(); } }}
                                                            className={`hidden lg:flex w-8 h-8 items-center justify-center rounded-xl transition-all ${isInsightOpen ? 'text-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'text-neutral-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20'}`}>
                                                            <InboxStackIcon className={`w-4 h-4 ${insightLoading ? 'animate-pulse' : ''}`} />
                                                        </button>
                                                        <button type="button" title="Chat History"
                                                            onClick={() => { setIsHistoryOpen(!isHistoryOpen); if (!isHistoryOpen) setIsInsightOpen(false); }}
                                                            className={`hidden lg:flex w-8 h-8 items-center justify-center rounded-xl transition-all ${isHistoryOpen ? 'text-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'text-neutral-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20'}`}>
                                                            <ChatBubbleLeftRightIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    {/* Divider */}
                                                    <div className="hidden lg:block w-px h-5 bg-neutral-200 dark:bg-neutral-700 flex-shrink-0 mb-2" />

                                                    {/* Text input */}
                                                    <textarea
                                                        ref={textareaRef}
                                                        value={query}
                                                        onChange={e => setQuery(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                                        placeholder="Message RankPilot AI..."
                                                        disabled={loading}
                                                        rows={1}
                                                        className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 py-2 min-h-[20px] min-w-0 resize-none max-h-40 leading-normal [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                                                    />

                                                    {/* Right: Send */}
                                                    <div className="flex items-end gap-1.5 flex-shrink-0 pb-0.5">
                                                        {/* Send button */}
                                                        <button type="submit" disabled={!query.trim() || loading}
                                                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-brand-600 hover:bg-brand-700 text-white disabled:bg-neutral-200 dark:disabled:bg-neutral-700 disabled:text-neutral-400 transition-all shadow-md shadow-brand-500/20 active:scale-95">
                                                            {loading
                                                                ? <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                                                : <PaperAirplaneIcon className="w-4 h-4" />
                                                            }
                                                        </button>
                                                    </div>
                                                </div>

                                                <p className="text-center text-[10px] text-neutral-400 dark:text-neutral-500 mt-2 font-medium">
                                                    RankPilot AI can make mistakes. Always verify critical metrics before making decisions.
                                                </p>
                                            </form>
                                        )}
                                    </div>
                                </div> {/* End of LEFT Column */}

                                {/* RIGHT: Canvas Container */}
                                {isCanvasOpen && (
                                    <div className={`flex-1 h-full ${isCanvasFullscreen ? 'lg:w-full' : 'lg:w-2/3'} bg-neutral-50 dark:bg-neutral-950 overflow-hidden shadow-2xl relative`}>
                                        <DashboardCanvas 
                                            data={canvasData} 
                                            onClose={() => setIsCanvasOpen(false)} 
                                            isFullscreen={isCanvasFullscreen}
                                            onToggleFullscreen={() => setIsCanvasFullscreen(!isCanvasFullscreen)}
                                        />
                                    </div>
                                )}
                            </div> {/* End of CENTER COLUMN */}

                            {/* 4. INSIGHT DRAWER */}
                            {isInsightOpen && (
                                <div className="absolute inset-0 lg:static lg:w-[28rem] lg:border-l border-neutral-100 dark:border-neutral-800 z-50 flex flex-col overflow-hidden bg-white dark:bg-dark-card animate-in slide-in-from-right duration-300 shrink-0">
                                    {/* Header */}
                                    <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                                                <InboxStackIcon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                                            </div>
                                            <div>
                                                <h2 className="text-sm font-black text-neutral-900 dark:text-white">Weekly Insight</h2>
                                                <p className="text-[10px] text-neutral-400 font-medium">AI-powered performance report</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setIsInsightOpen(false)}
                                            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 transition-all">
                                            <PlusIcon className="w-4 h-4 rotate-45" />
                                        </button>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] p-5">
                                        {insightLoading ? (
                                            <div className="flex flex-col items-center justify-center h-full gap-5">
                                                <div className="relative">
                                                    <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                                                        <SparklesIcon className="w-7 h-7 text-brand-600 dark:text-brand-400" />
                                                    </div>
                                                    <div className="absolute -inset-1 rounded-2xl border-2 border-brand-500/30 animate-ping" />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm font-black text-neutral-700 dark:text-neutral-300 mb-1">Analyzing your data...</p>
                                                    <p className="text-xs text-neutral-400 font-medium animate-pulse">Running advanced analytics across all sources</p>
                                                </div>
                                            </div>
                                        ) : weeklyInsight ? (
                                            <div className="max-w-2xl mx-auto">
                                                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Weekly Report</span>
                                                    <span className="text-neutral-300 dark:text-neutral-700">·</span>
                                                    <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400">AI Generated</span>
                                                    {weeklyInsight?.updatedAt && (
                                                        <>
                                                            <span className="text-neutral-300 dark:text-neutral-700">·</span>
                                                            <span className="text-[10px] font-bold text-neutral-400">
                                                                Generated {format(new Date(weeklyInsight.updatedAt), 'MMM d, yyyy p')}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="bg-white dark:bg-dark-card/60 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 blur-[120px] pointer-events-none group-hover:bg-brand-500/10 transition-all duration-1000" />
                                                    <div className="prose prose-md dark:prose-invert max-w-none prose-headings:tracking-tighter prose-p:text-neutral-700 dark:prose-p:text-neutral-100">
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkGfm]}
                                                            components={MarkdownComponents}
                                                        >
                                                            {typeof weeklyInsight === 'string' ? weeklyInsight : (weeklyInsight?.content || '')}
                                                        </ReactMarkdown>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-center px-6">
                                                <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                                                    <InboxStackIcon className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
                                                </div>
                                                <p className="text-sm font-black text-neutral-600 dark:text-neutral-400 mb-2">No insights yet</p>
                                                <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-6 max-w-xs leading-relaxed">Generate your first weekly performance report powered by AI analysis of all your connected platforms.</p>
                                                <button onClick={handleRefreshInsight}
                                                    className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-xs font-black rounded-xl hover:bg-brand-700 transition-all shadow-md shadow-brand-500/25 active:scale-95">
                                                    <SparklesIcon className="w-3.5 h-3.5" />
                                                    Generate Report
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div className="shrink-0 p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/20">
                                        <button onClick={handleRefreshInsight} disabled={insightLoading}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-xs font-black transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 shadow-lg">
                                            <ArrowPathIcon className={`w-4 h-4 ${insightLoading ? 'animate-spin' : ''}`} />
                                            {insightLoading ? 'Generating...' : 'Refresh Weekly Summary'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 8. DELETE MODAL — absolute overlay */}
                        {chatToDelete && (
                            <div className="absolute inset-0 z-[100] flex items-center justify-center p-4">
                                <div className="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm" onClick={() => setChatToDelete(null)} />
                                <div className="relative w-full max-w-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="w-11 h-11 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
                                        <TrashIcon className="w-5 h-5 text-red-500" />
                                    </div>
                                    <h3 className="text-base font-black text-neutral-900 dark:text-white mb-1.5">Delete this chat?</h3>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-5 leading-relaxed">
                                        This conversation will be permanently deleted and cannot be recovered.
                                    </p>
                                    <div className="flex gap-3">
                                        <button onClick={() => setChatToDelete(null)}
                                            className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-black text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all active:scale-95">
                                            Cancel
                                        </button>
                                        <button onClick={confirmDelete}
                                            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black transition-all shadow-md shadow-red-500/20 active:scale-95">
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    /* ONBOARDING STATE — ZERO CONNECTIONS */
                    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 z-10 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        <div className="max-w-2xl w-full text-center flex flex-col items-center py-2">
                            {/* Animated Glowing AI Logo */}
                            <div className="relative mb-4 shrink-0">
                                <div className="relative z-10 transition-transform hover:scale-105 duration-300">
                                    <Logo className="w-14 h-14 sm:w-16 sm:h-16" iconOnly />
                                </div>
                                <div className="absolute -inset-4 rounded-full bg-brand-500/10 dark:bg-brand-500/20 blur-2xl animate-pulse" />
                            </div>

                            {/* Onboarding Headers */}
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-neutral-900 dark:text-white tracking-tight mb-2">
                                Unlock RankPilot AI's Full Power!
                            </h1>
                            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-semibold max-w-lg leading-relaxed mb-6">
                                RankPilot AI needs access to your search console, analytics, or ads data to analyze performance, generate custom reports, and answer your queries.
                            </p>

                            {/* Platform Options Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl mb-6 text-left">
                                {[
                                    {
                                        name: 'Google Search Console',
                                        desc: 'Analyze your keywords, search impressions, clicks, and average ranks.',
                                        icon: 'https://www.gstatic.com/images/branding/product/2x/search_console_64dp.png',
                                    },
                                    {
                                        name: 'Google Analytics 4',
                                        desc: 'Track conversions, active sessions, traffic channels, and user behavior.',
                                        icon: 'https://www.vectorlogo.zone/logos/google_analytics/google_analytics-icon.svg',
                                    },
                                    {
                                        name: 'Google Ads',
                                        desc: 'Measure ROI, click-through rates (CTR), CPC, and campaign performance.',
                                        icon: 'https://www.vectorlogo.zone/logos/google_ads/google_ads-icon.svg',
                                    },
                                    {
                                        name: 'Facebook Ads',
                                        desc: 'Monitor Meta ad campaigns, reach, frequency, and conversion cost.',
                                        icon: 'https://www.vectorlogo.zone/logos/facebook/facebook-icon.svg',
                                    }
                                ].map((plat, idx) => (
                                    <div 
                                        key={idx}
                                        onClick={() => navigate('/connect-accounts')}
                                        className="group p-3.5 bg-neutral-50/50 dark:bg-neutral-900/30 hover:bg-brand-50/30 dark:hover:bg-brand-900/10 border border-neutral-200 dark:border-neutral-800 hover:border-brand-300 dark:hover:border-brand-800 rounded-2xl cursor-pointer transition-all duration-300 shadow-sm flex gap-3 hover:-translate-y-0.5 active:scale-98"
                                    >
                                        <div className="w-9 h-9 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700/60 p-2 flex items-center justify-center shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
                                            <img src={plat.icon} alt={plat.name} className="w-full h-full object-contain" />
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors leading-tight mb-0.5">
                                                {plat.name}
                                            </h3>
                                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug font-medium">
                                                {plat.desc}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* CTA button */}
                            <button
                                onClick={() => navigate('/connect-accounts')}
                                className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-black rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:opacity-95 active:scale-95 flex items-center gap-2 group"
                            >
                                <span>Connect Accounts</span>
                                <ArrowUpRightIcon className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default AIChatPage;
