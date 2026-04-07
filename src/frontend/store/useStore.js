import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const nowIso = () => new Date().toISOString();

export const useAppStore = create(
  persist(
    (set, get) => ({
      code: "",
      address: "",
      githubUrl: "",
      lastResult: null,
      history: [],
      selectedFeature: "ai-analysis",
      loading: false,
      fetching: false,
      inputMode: "paste",
      beginnerMode: true,
      lastAnalysisMs: null,
      toastVisible: false,
      toastMessage: "",
      toastToken: 0,

      setCode: (code) =>
        set({
          code,
          inputMode: code.trim() ? "paste" : get().inputMode
        }),
      setAddress: (address) => set({ address }),
      setGithubUrl: (githubUrl) => set({ githubUrl }),
      setLoading: (loading) => set({ loading }),
      setFetching: (fetching) => set({ fetching }),
      setInputMode: (inputMode) => set({ inputMode }),
      setBeginnerMode: (beginnerMode) => set({ beginnerMode }),
      setSelectedFeature: (selectedFeature) => set({ selectedFeature }),
      setLastResult: (lastResult) => set({ lastResult }),
      setLastAnalysisMs: (lastAnalysisMs) => set({ lastAnalysisMs }),

      addHistoryEntry: (entry) => {
        const existing = get().history;
        const nextEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: nowIso(),
          ...entry
        };
        const next = [nextEntry, ...existing].slice(0, 50);
        set({ history: next });
      },

      deleteHistoryEntry: (id) => {
        const next = get().history.filter((item) => item.id !== id);
        set({ history: next });
      },

      clearHistory: () => set({ history: [] }),

      restoreFromHistory: (entry) => {
        set({
          code: entry.code || "",
          lastResult: entry.result || null,
          selectedFeature: entry.selectedFeature || "ai-analysis",
          inputMode: "history",
          lastAnalysisMs: entry.analysisMs || null
        });
      },

      clearWorkspace: () => {
        set({
          code: "",
          address: "",
          githubUrl: "",
          lastResult: null,
          loading: false,
          fetching: false,
          inputMode: "paste",
          lastAnalysisMs: null
        });
      },

      showSavedToast: (message = "Saved") => {
        set({
          toastVisible: true,
          toastMessage: message,
          toastToken: get().toastToken + 1
        });
      },

      hideToast: () => set({ toastVisible: false })
    }),
    {
      name: "audit-ai-agent-state",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        code: state.code,
        address: state.address,
        githubUrl: state.githubUrl,
        lastResult: state.lastResult,
        history: state.history,
        selectedFeature: state.selectedFeature,
        inputMode: state.inputMode,
        beginnerMode: state.beginnerMode,
        lastAnalysisMs: state.lastAnalysisMs
      })
    }
  )
);
