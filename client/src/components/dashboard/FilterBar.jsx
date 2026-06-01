import React from 'react';
import { useDateRangeStore } from '../../store/dateRangeStore';
import { useFilterStore } from '../../store/filterStore';
import { useAccountsStore } from '../../store/accountsStore';
import { 
    CalendarIcon, 
    DevicePhoneMobileIcon, 
    ComputerDesktopIcon, 
    DeviceTabletIcon,
    FunnelIcon,
    XMarkIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    CloudArrowUpIcon
} from '@heroicons/react/24/outline';

const FilterBar = ({ showDevice = true, showCampaign = false, showChannel = false, onRefresh, loading }) => {
    const { preset, setPreset, startDate, endDate, tempStartDate, tempEndDate, setTempStartDate, setTempEndDate, applyCustomRange } = useDateRangeStore();
    const { device, campaign, channel, setFilters, resetFilters } = useFilterStore();
    const [showPicker, setShowPicker] = React.useState(false);





    const datePresets = [
        { label: 'Today', value: 'today', days: 0 },
        { label: 'Yesterday', value: 'yesterday', days: 1 },
        { label: '7D', value: '7d', days: 7 },
        { label: '28D', value: '28d', days: 28 },
    ];

    const handleDatePreset = (p) => {
        setPreset(p.value);
        setShowPicker(false);
    };

    const handleApplyCustomRange = () => {
        applyCustomRange();
        setShowPicker(false);
    };

    return (
        <div className="relative mb-8 flex justify-center sm:justify-start">
            <div className="glass-morphism bg-white/70 dark:bg-dark-card/70 backdrop-blur-lg border border-white/20 dark:border-neutral-700/50 rounded-full px-3 py-1.5 shadow-xl shadow-brand-500/5 flex items-center gap-1.5 w-fit transition-all hover:shadow-brand-500/10 hover:border-brand-500/20">
                
                {/* Date Presets - Slim Pill */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center bg-neutral-200/50 dark:bg-neutral-800/50 rounded-full p-1 gap-0.5">
                        <div className="w-6 h-6 rounded-full bg-white dark:bg-neutral-700 flex items-center justify-center shadow-sm text-brand-600">
                             <CalendarIcon className="w-3.5 h-3.5" />
                        </div>
                        {datePresets.map((p) => (
                            <button
                                key={p.value}
                                onClick={() => handleDatePreset(p)}
                                className={`px-2.5 py-1 text-[10px] font-black rounded-full transition-all ${
                                    preset === p.value
                                        ? 'bg-brand-600 text-white shadow-md'
                                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setShowPicker(!showPicker)}
                        className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 hover:text-brand-500 transition-colors whitespace-nowrap hidden lg:block px-2"
                    >
                        {startDate} — {endDate}
                    </button>
                </div>

                <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-700 shrink-0 hidden sm:block"/>

                {/* Device Filter */}
                {showDevice && (
                    <>
                        <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-600 shrink-0 hidden sm:block mx-1"/>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <div className="flex items-center bg-neutral-200/50 dark:bg-neutral-800/50 rounded-full p-1 gap-0.5">
                                {[
                                    { label: 'All',     value: '',        icon: FunnelIcon },
                                    { label: 'Mobile',  value: 'mobile',  icon: DevicePhoneMobileIcon },
                                    { label: 'Desktop', value: 'desktop', icon: ComputerDesktopIcon },
                                    { label: 'Tablet',  value: 'tablet',  icon: DeviceTabletIcon },
                                ].map((d) => (
                                    <button
                                        key={d.value}
                                        onClick={() => setFilters({ device: d.value })}
                                        title={d.label}
                                        className={`px-3 py-1 text-[10px] font-black rounded-full transition-all flex items-center gap-1.5 ${
                                            device === d.value
                                                ? 'bg-amber-500 text-white shadow-md'
                                                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                                        }`}
                                    >
                                        <d.icon className="w-3 h-3"/>
                                        <span className="hidden xl:inline">{d.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* Campaign/Channel Filter */}
                {(showCampaign || showChannel) && (
                    <>
                        <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-700 shrink-0 hidden sm:block"/>
                        <div className="flex-1 min-w-[160px] max-w-[260px] relative">
                            <input
                                type="text"
                                placeholder={showCampaign ? 'Filter campaign...' : 'Filter channel...'}
                                value={showCampaign ? campaign : channel}
                                onChange={(e) => setFilters(showCampaign ? { campaign: e.target.value } : { channel: e.target.value })}
                                className="w-full pl-3 pr-8 py-2 bg-neutral-100 dark:bg-neutral-800 border border-transparent rounded-xl text-[11px] font-bold text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                            />
                            {(campaign || channel) && (
                                <button
                                    onClick={resetFilters}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-red-500 transition-colors"
                                >
                                    <XMarkIcon className="w-3.5 h-3.5"/>
                                </button>
                            )}
                        </div>
                    </>
                )}

                {/* Clear Filters */}
                {(device || campaign || channel) && (
                    <button
                        onClick={resetFilters}
                        className="text-[11px] font-black text-red-500 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-all shrink-0"
                    >
                        Clear
                    </button>
                )}


            </div>

            {/* Custom Date Picker Dropdown */}
            {showPicker && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-dark-card border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-xl p-5 flex flex-col sm:flex-row items-end gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Start Date</label>
                        <input
                            type="date"
                            value={tempStartDate}
                            onChange={(e) => setTempStartDate(e.target.value)}
                            className="bg-neutral-100 dark:bg-neutral-800 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                        />
                    </div>
                    <div className="w-6 h-px bg-neutral-300 dark:bg-neutral-700 hidden sm:block mb-4"/>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">End Date</label>
                        <input
                            type="date"
                            value={tempEndDate}
                            onChange={(e) => setTempEndDate(e.target.value)}
                            className="bg-neutral-100 dark:bg-neutral-800 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                        />
                    </div>
                    <button
                        onClick={handleApplyCustomRange}
                        className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-black rounded-xl shadow-lg shadow-brand-500/20 transition-all hover:-translate-y-0.5 active:scale-95 uppercase tracking-wider whitespace-nowrap"
                    >
                        Apply Range
                    </button>
                    <button
                        onClick={() => setShowPicker(false)}
                        className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
                    >
                        <XMarkIcon className="w-4 h-4"/>
                    </button>
                </div>
            )}
        </div>
    );
};

export default FilterBar;
