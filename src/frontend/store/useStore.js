import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const nowIso = () => new Date().toISOString();

function createAuthUser(provider, name = "AuditMind User") {
  return {
    id: `${provider}-${Date.now()}`,
    provider,
    name,
    email: `${provider}-user@local.auditmind`,
    createdAt: nowIso(),
  };
}

export const useAppStore = create(
  persist(
    (set, get) => ({
      code: "",
      address: "",
      githubUrl: "",
      uploadedFiles: [],
      lastResult: null,
      history: [],
      savedReports: [],
      compareItems: [],
      selectedFeature: "ai-analysis",
      loading: false,
      fetching: false,
      inputMode: "paste",
      beginnerMode: true,
      lastAnalysisMs: null,
      toastVisible: false,
      toastMessage: "",
      toastToken: 0,
      toolingStatus: null,
      user: null,
      settings: {
        theme: "dark",
        autoSaveReports: true,
        confidenceThreshold: 35,
        hideLowConfidence: false,
        collapseFalsePositives: true,
        preferredMode: "hybrid",
      },

      setCode: (code) =>
        set({
          code,
          inputMode: code.trim() ? "paste" : get().inputMode,
        }),
      setAddress: (address) => set({ address }),
      setGithubUrl: (githubUrl) => set({ githubUrl }),
      setUploadedFiles: (uploadedFiles) => set({ uploadedFiles }),
      setLoading: (loading) => set({ loading }),
      setFetching: (fetching) => set({ fetching }),
      setInputMode: (inputMode) => set({ inputMode }),
      setBeginnerMode: (beginnerMode) => set({ beginnerMode }),
      setSelectedFeature: (selectedFeature) => set({ selectedFeature }),
      setLastResult: (lastResult) => set({ lastResult }),
      setLastAnalysisMs: (lastAnalysisMs) => set({ lastAnalysisMs }),
      setToolingStatus: (toolingStatus) => set({ toolingStatus }),

      addHistoryEntry: (entry) => {
        const nextEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: nowIso(),
          ...entry,
        };
        const next = [nextEntry, ...get().history].slice(0, 50);
        set({ history: next });

        if (get().settings.autoSaveReports) {
          const saved = [nextEntry, ...get().savedReports].slice(0, 50);
          set({ savedReports: saved });
        }
      },

      deleteHistoryEntry: (id) => {
        set({
          history: get().history.filter((item) => item.id !== id),
        });
      },

      clearHistory: () => set({ history: [] }),

      saveReport: (entry) => {
        const reportEntry = {
          id: entry.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: entry.createdAt || nowIso(),
          ...entry,
        };

        const next = [
          reportEntry,
          ...get().savedReports.filter((item) => item.id !== reportEntry.id),
        ].slice(0, 50);

        set({ savedReports: next });
      },

      removeSavedReport: (id) => {
        set({
          savedReports: get().savedReports.filter((item) => item.id !== id),
        });
      },

      setCompareItem: (slot, entry) => {
        const existing = get().compareItems.filter((item) => item.slot !== slot);
        set({
          compareItems: [...existing, { slot, entry }],
        });
      },

      clearCompareItems: () => set({ compareItems: [] }),

      restoreFromHistory: (entry) => {
        set({
          code: entry.code || "",
          uploadedFiles: entry.uploadedFiles || [],
          lastResult: entry.result || null,
          selectedFeature: entry.selectedFeature || "ai-analysis",
          inputMode: entry.inputMode || "history",
          lastAnalysisMs: entry.analysisMs || null,
        });
      },

      clearWorkspace: () => {
        set({
          code: "",
          address: "",
          githubUrl: "",
          uploadedFiles: [],
          lastResult: null,
          loading: false,
          fetching: false,
          inputMode: "paste",
          lastAnalysisMs: null,
        });
      },

      signInWithProvider: (provider) => {
        const providerName = provider === "github" ? "GitHub" : provider === "google" ? "Google" : "Local";
        set({ user: createAuthUser(provider, `${providerName} User`) });
      },

      signOut: () => set({ user: null }),

      updateSettings: (partial) => {
        set({
          settings: {
            ...get().settings,
            ...partial,
          },
        });
      },

      showSavedToast: (message = "Saved") => {
        set({
          toastVisible: true,
          toastMessage: message,
          toastToken: get().toastToken + 1,
        });
      },

      hideToast: () => set({ toastVisible: false }),
    }),
    {
      name: "auditmind-workspace-state",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        code: state.code,
        address: state.address,
        githubUrl: state.githubUrl,
        uploadedFiles: state.uploadedFiles,
        lastResult: state.lastResult,
        history: state.history,
        savedReports: state.savedReports,
        compareItems: state.compareItems,
        selectedFeature: state.selectedFeature,
        inputMode: state.inputMode,
        beginnerMode: state.beginnerMode,
        lastAnalysisMs: state.lastAnalysisMs,
        user: state.user,
        settings: state.settings,
      }),
    }
  )
);
