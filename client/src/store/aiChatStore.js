import { create } from 'zustand';

export const useAiChatStore = create((set) => ({
  isOpen: false,
  initialQuestion: '',
  initialDisplayLabel: '',
  setIsOpen: (isOpen) => set({ isOpen }),
  // label = friendly text shown to user in the chat bubble (e.g. "📊 Analyzing Sessions data...")
  // question = full data-rich prompt sent to the AI
  openWithQuestion: (question, label = '') => set({ isOpen: true, initialQuestion: question, initialDisplayLabel: label }),
  clearInitialQuestion: () => set({ initialQuestion: '', initialDisplayLabel: '' }),
}));
