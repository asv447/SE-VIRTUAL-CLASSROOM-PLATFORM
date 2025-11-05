import { create } from 'zustand';

const useWhiteboardStore = create((set) => ({
  isOpen: false,
  currentFile: null,
  setCurrentFile: (file) => set({ currentFile: file, isOpen: true }),
  closeWhiteboard: () => set({ isOpen: false, currentFile: null }),
}));

export default useWhiteboardStore;