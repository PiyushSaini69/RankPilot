import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { subDays, format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';

const getDatesForPreset = (preset) => {
    const today = new Date();
    const yesterday = subDays(today, 1);
    const fmt = (d) => format(d, 'yyyy-MM-dd');
    
    switch (preset) {
        case 'today':
            return { startDate: fmt(today), endDate: fmt(today) };
        case 'yesterday':
            return { startDate: fmt(yesterday), endDate: fmt(yesterday) };
        case '7d':
            return { startDate: fmt(subDays(yesterday, 6)), endDate: fmt(yesterday) };
        case '28d':
            return { startDate: fmt(subDays(yesterday, 27)), endDate: fmt(yesterday) };
        case 'this_week':
            const mondayThisWeek = startOfWeek(today, { weekStartsOn: 1 });
            const endThisWeek = today.getDay() === 1 ? today : yesterday;
            return { startDate: fmt(mondayThisWeek), endDate: fmt(endThisWeek) };
        case 'last_week':
            const mondayLastWeek = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
            const sundayLastWeek = endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
            return { startDate: fmt(mondayLastWeek), endDate: fmt(sundayLastWeek) };
        default:
            return null;
    }
};

const initial = getDatesForPreset('7d');

export const useDateRangeStore = create(
    persist(
        (set, get) => ({
            preset: '7d',
            startDate: initial?.startDate || format(subDays(subDays(new Date(), 1), 6), 'yyyy-MM-dd'),
            endDate: initial?.endDate || format(subDays(new Date(), 1), 'yyyy-MM-dd'),
            tempStartDate: initial?.startDate || format(subDays(subDays(new Date(), 1), 6), 'yyyy-MM-dd'),
            tempEndDate: initial?.endDate || format(subDays(new Date(), 1), 'yyyy-MM-dd'),
            setPreset: (preset, startDate, endDate) => {
                if (startDate && endDate) {
                    set({ preset, startDate, endDate, tempStartDate: startDate, tempEndDate: endDate });
                } else {
                    const dates = getDatesForPreset(preset);
                    if (dates) {
                        set({ 
                            preset, 
                            startDate: dates.startDate, 
                            endDate: dates.endDate, 
                            tempStartDate: dates.startDate, 
                            tempEndDate: dates.endDate 
                        });
                    } else {
                        set({ preset });
                    }
                }
            },
            setTempStartDate: (tempStartDate) => set({ tempStartDate }),
            setTempEndDate: (tempEndDate) => set({ tempEndDate }),
            applyCustomRange: () => {
                const { tempStartDate, tempEndDate } = get();
                set({ preset: 'custom', startDate: tempStartDate, endDate: tempEndDate });
            },
            setCustomRange: (startDate, endDate) => set({ 
                preset: 'custom', 
                startDate, 
                endDate, 
                tempStartDate: startDate, 
                tempEndDate: endDate 
            }),
        }),
        {
            name: 'date-range-storage',
            // Refresh dates if a preset is active when rehydrating from localStorage
            onRehydrateStorage: () => (state) => {
                if (state && state.preset !== 'custom') {
                    const freshDates = getDatesForPreset(state.preset);
                    if (freshDates) {
                        state.setPreset(state.preset, freshDates.startDate, freshDates.endDate);
                    }
                }
            },
        }
    )
);
