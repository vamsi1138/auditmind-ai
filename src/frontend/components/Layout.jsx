import { useEffect, useMemo } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "../store/useStore";

const navItems = [
  { to: "/analyze", label: "Analyzer", icon: "</>" },
  { to: "/history", label: "History", icon: "[]" },
  { to: "/saved-reports", label: "Saved Reports", icon: "{}" },
  { to: "/compare", label: "Compare", icon: "<>" },
  { to: "/settings", label: "Settings", icon: "()" },
];

function formatRuntimeLabel(lastResult) {
  const source = lastResult?.rawBackendReport?.sourceAnalysis;
  if (!source) return "Ready for local analysis";
  if (source.elizaAgentUsed && source.qwenEndpointUsed) return "ElizaOS + Qwen Analysis Active";
  if (source.qwenEndpointUsed) return "Qwen analysis active";
  return "Rule engine ready";
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAppStore((state) => state.user);
  const lastResult = useAppStore((state) => state.lastResult);
  const toastVisible = useAppStore((state) => state.toastVisible);
  const toastMessage = useAppStore((state) => state.toastMessage);
  const toastToken = useAppStore((state) => state.toastToken);
  const hideToast = useAppStore((state) => state.hideToast);
  const signOut = useAppStore((state) => state.signOut);

  useEffect(() => {
    if (!toastVisible) return undefined;
    const timer = window.setTimeout(() => hideToast(), 1800);
    return () => window.clearTimeout(timer);
  }, [hideToast, toastToken, toastVisible]);

  const runtimeLabel = useMemo(() => formatRuntimeLabel(lastResult), [lastResult]);
  const isAuthScreen = location.pathname === "/auth";

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
              aria-label="Appearance"
              onClick={() => navigate("/settings")}
            >
              <span>O</span>
            </button>
            <button
              type="button"
              className="am-icon-btn"
              aria-label="Settings"
              onClick={() => navigate("/settings")}
            >
              <span>*</span>
            </button>
            {user ? (
              <button type="button" className="am-primary-btn" onClick={() => signOut()}>
                Sign Out
              </button>
            ) : (
              <button
                type="button"
                className="am-primary-btn"
                onClick={() => navigate(isAuthScreen ? "/" : "/auth")}
              >
                Sign In
              </button>
            )}
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
