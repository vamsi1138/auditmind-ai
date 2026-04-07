import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const nowIso = () => new Date().toISOString();

function normalizeEmail(value = "") {
  return String(value).trim().toLowerCase();
}

function encodePassword(value = "") {
  const normalized = String(value);

  try {
    return btoa(unescape(encodeURIComponent(normalized)));
  } catch {
    return normalized;
  }
}

function providerLabel(provider) {
  if (provider === "github") return "GitHub";
  if (provider === "google") return "Google";
  return "Local";
}

function createAuthUser(account) {
  return {
    id: account.id,
    provider: account.provider,
    name: account.name,
    email: account.email,
    createdAt: account.createdAt,
    lastSignedInAt: account.lastSignedInAt,
  };
}

function createAuthAccount({ provider = "local", name, email, password = "" }) {
  const createdAt = nowIso();

  return {
    id: `${provider}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    provider,
    name: String(name || `${providerLabel(provider)} User`).trim() || `${providerLabel(provider)} User`,
    email: normalizeEmail(email || `${provider}-user@local.auditmind`),
    passwordHash: password ? encodePassword(password) : null,
    createdAt,
    lastSignedInAt: createdAt,
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
      lastAnalysisMs: null,
      toastVisible: false,
      toastMessage: "",
      toastToken: 0,
      toolingStatus: null,
      authAccounts: [],
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

      signUpWithEmail: ({ name, email, password }) => {
        const trimmedName = String(name || "").trim();
        const normalizedEmail = normalizeEmail(email);
        const normalizedPassword = String(password || "");

        if (!trimmedName) {
          return { ok: false, error: "Enter your name to create an account." };
        }

        if (!normalizedEmail) {
          return { ok: false, error: "Enter a valid email address." };
        }

        if (normalizedPassword.length < 6) {
          return { ok: false, error: "Use a password with at least 6 characters." };
        }

        const existing = get().authAccounts.find((account) => account.email === normalizedEmail);
        if (existing) {
          return { ok: false, error: "An account with this email already exists. Please sign in instead." };
        }

        const account = createAuthAccount({
          provider: "local",
          name: trimmedName,
          email: normalizedEmail,
          password: normalizedPassword,
        });
        const user = createAuthUser(account);

        set({
          authAccounts: [account, ...get().authAccounts],
          user,
        });

        return { ok: true, user };
      },

      signInWithEmail: ({ email, password }) => {
        const normalizedEmail = normalizeEmail(email);
        const normalizedPassword = String(password || "");
        const accounts = get().authAccounts;
        const accountIndex = accounts.findIndex((account) => account.email === normalizedEmail);

        if (accountIndex === -1) {
          return { ok: false, error: "No local account was found for that email." };
        }

        const account = accounts[accountIndex];
        if (!account.passwordHash) {
          return { ok: false, error: `This account uses ${providerLabel(account.provider)} sign-in. Use that provider button instead.` };
        }

        if (account.passwordHash !== encodePassword(normalizedPassword)) {
          return { ok: false, error: "Incorrect password. Please try again." };
        }

        const updatedAccount = {
          ...account,
          lastSignedInAt: nowIso(),
        };
        const nextAccounts = [...accounts];
        nextAccounts[accountIndex] = updatedAccount;
        const user = createAuthUser(updatedAccount);

        set({
          authAccounts: nextAccounts,
          user,
        });

        return { ok: true, user };
      },

      authenticateWithProvider: (provider, mode = "signin") => {
        const email = `${provider}-user@local.auditmind`;
        const accounts = get().authAccounts;
        const accountIndex = accounts.findIndex(
          (account) => account.provider === provider || account.email === email
        );

        if (accountIndex !== -1) {
          const updatedAccount = {
            ...accounts[accountIndex],
            lastSignedInAt: nowIso(),
          };
          const nextAccounts = [...accounts];
          nextAccounts[accountIndex] = updatedAccount;
          const user = createAuthUser(updatedAccount);

          set({
            authAccounts: nextAccounts,
            user,
          });

          return { ok: true, user, created: false, mode };
        }

        const account = createAuthAccount({
          provider,
          name: `${providerLabel(provider)} User`,
          email,
        });
        const user = createAuthUser(account);

        set({
          authAccounts: [account, ...accounts],
          user,
        });

        return { ok: true, user, created: true, mode };
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
        authAccounts: state.authAccounts,
        selectedFeature: state.selectedFeature,
        inputMode: state.inputMode,
        lastAnalysisMs: state.lastAnalysisMs,
        user: state.user,
        settings: state.settings,
      }),
    }
  )
);
