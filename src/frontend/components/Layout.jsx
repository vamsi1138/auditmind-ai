import { useEffect, useMemo } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "../store/useStore";

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10.2 2.6h3.6l.7 2.4c.4.1.8.3 1.2.5l2.3-1.1 2.5 2.5-1.1 2.3c.2.4.4.8.5 1.2l2.4.7v3.6l-2.4.7c-.1.4-.3.8-.5 1.2l1.1 2.3-2.5 2.5-2.3-1.1c-.4.2-.8.4-1.2.5l-.7 2.4h-3.6l-.7-2.4c-.4-.1-.8-.3-1.2-.5l-2.3 1.1-2.5-2.5 1.1-2.3c-.2-.4-.4-.8-.5-1.2l-2.4-.7v-3.6l2.4-.7c.1-.4.3-.8.5-1.2L4.9 7l2.5-2.5 2.3 1.1c.4-.2.8-.4 1.2-.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.6" fill="none" />
    </svg>
  );
}

const navItems = [
  { to: "/analyze", label: "Analyzer", icon: "</>" },
  { to: "/history", label: "History", icon: "[]" },
  { to: "/saved-reports", label: "Saved Reports", icon: "{}" },
  { to: "/compare", label: "Compare", icon: "<>" },
  { to: "/settings", label: "Settings", icon: <SettingsIcon /> },
];

function formatRuntimeLabel(lastResult) {
  const source = lastResult?.rawBackendReport?.sourceAnalysis;
  if (!source) return "Ready for local analysis";
  if (source.elizaAgentUsed && source.qwenEndpointUsed) return "ElizaOS + Qwen Analysis Active";
  if (source.qwenEndpointUsed) return "Qwen analysis active";
  return "Rule engine ready";
}

export default function Layout() {
  const navigate = useNavigate();
  const user = useAppStore((state) => state.user);
  const lastResult = useAppStore((state) => state.lastResult);
  const toastVisible = useAppStore((state) => state.toastVisible);
  const toastMessage = useAppStore((state) => state.toastMessage);
  const toastToken = useAppStore((state) => state.toastToken);
  const hideToast = useAppStore((state) => state.hideToast);

  useEffect(() => {
    if (!toastVisible) return undefined;
    const timer = window.setTimeout(() => hideToast(), 1800);
    return () => window.clearTimeout(timer);
  }, [hideToast, toastToken, toastVisible]);

  const runtimeLabel = useMemo(() => formatRuntimeLabel(lastResult), [lastResult]);
  return (
    <div className="am-shell">
      <aside className="am-sidebar">
        <NavLink className="am-brand" to="/">
          <span className="am-brand-badge">A</span>
          <span>
            AuditMind <span style={{ color: "#78a5ff" }}>AI</span>
          </span>
        </NavLink>

        <nav className="am-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `am-nav-link${isActive ? " active" : ""}`}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="am-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="am-card am-sidebar-card">
          <div className="am-section-title">AuditMind AI</div>
          <div className="am-muted" style={{ fontSize: "0.92rem", lineHeight: 1.6 }}>
            v1.0.0
            <br />
            Powered by ElizaOS, Qwen LLM, rule-based analysis, evidence mapping, and local workspace
            persistence.
          </div>
          <div className="am-chip" style={{ marginTop: 14 }}>
            <span className="am-status-dot" />
            All systems operational
          </div>
        </div>
      </aside>

      <main className="am-main">
        <header className="am-topbar">
          <div className="am-status-pill">
            <span className="am-status-dot" />
            <span>{runtimeLabel}</span>
          </div>

          <div className="am-top-actions">
            <button
              type="button"
              className="am-icon-btn"
              aria-label="Settings"
              onClick={() => navigate("/settings")}
            >
              <SettingsIcon />
            </button>
            {user ? <div className="am-user-pill">
              <span className="am-user-pill-name">{user.name}</span>
              <span className="am-user-pill-meta">{user.provider === "local" ? "Local" : user.provider === "github" ? "GitHub" : "Google"}</span>
            </div> : null}
          </div>
        </header>

        <Outlet />

        <AnimatePresence>
          {toastVisible ? (
            <motion.div
              key={toastToken}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="am-toast"
            >
              {toastMessage || "Saved"}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>
    </div>
  );
}
