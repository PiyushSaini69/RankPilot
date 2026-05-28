import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { subDays, format } from 'date-fns';

const getDatesForPreset = (preset) => {
    const today = new Date();
    const fmt = (d) => format(d, 'yyyy-MM-dd');
    
    switch (preset) {
        case 'today':
            return { startDate: fmt(today), endDate: fmt(today) };
        case 'yesterday':
            const yesterday = subDays(today, 1);
            return { startDate: fmt(yesterday), endDate: fmt(yesterday) };
        case '7d':
            return { startDate: fmt(subDays(today, 7)), endDate: fmt(today) };
        case '28d':
            return { startDate: fmt(subDays(today, 28)), endDate: fmt(today) };
        default:
            return null;
    }
};

const initial = getDatesForPreset('7d');

export const useDateRangeStore = create(
    persist(
        (set) => ({
            preset: '7d',
            startDate: initial?.startDate || format(subDays(new Date(), 7), 'yyyy-MM-dd'),
            endDate: initial?.endDate || format(new Date(), 'yyyy-MM-dd'),
            setPreset: (preset, startDate, endDate) => set({ preset, startDate, endDate }),
            setCustomRange: (startDate, endDate) => set({ preset: 'custom', startDate, endDate }),
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
