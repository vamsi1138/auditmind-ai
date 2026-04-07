import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAppStore } from "../store/useStore";

const featureCards = [
  {
    title: "Hybrid AI + Rule Engine",
    text: "Routes Solidity reviews through ElizaOS and Qwen while preserving deterministic rule checks and source validation."
  },
  {
    title: "Built for Real Projects",
    text: "Analyze pasted contracts, multi-file uploads, GitHub repos, and verified on-chain addresses in one workspace."
  },
  {
    title: "Actionable Review Output",
    text: "Get evidence lines, confidence scoring, auto-fix guidance, admin-power dashboards, compare views, and exportable reports."
  }
];

const roadmapFeatures = [
  "Multi-file contract analysis with inheritance and import context",
  "Contract address analysis via verified source fetch",
  "Line-level evidence mapping tied to findings",
  "Auto-fix suggestions with patched code blocks",
  "Slither and Foundry tooling status integration",
  "Repo and GitHub scan workflows",
  "Confidence filtering and false-positive controls",
  "Comparison mode for before/after or source-to-source review",
  "Team report export for Markdown, JSON, and print-to-PDF",
  "Wallet and admin-power dashboard for privileged actions"
];

export default function Home() {
  const user = useAppStore((state) => state.user);

  return (
    <div className="am-stack">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32 }}
        className="am-card am-hero-card"
      >
        <div className="am-hero-grid">
          <div>
            <div className="am-chip" style={{ marginBottom: 16 }}>
              Audit agent for smart contract teams
            </div>
            <h1 className="am-page-title">
              Smart Contract <span>Security Copilot</span>
            </h1>
            <p className="am-subtitle">
              AuditMind AI combines ElizaOS orchestration, Qwen reasoning, deterministic security rules,
              repo-aware ingestion, and local report history into one professional Solidity review workspace.
            </p>
            <div className="am-input-actions" style={{ marginTop: 22 }}>
              <Link className="am-primary-btn am-link-btn" to="/analyze">
                Open Analyzer
              </Link>
              {user ? (
                <Link className="am-secondary-btn am-link-btn" to="/settings">
                  Open Workspace Settings
                </Link>
              ) : (
                <>
                  <Link className="am-secondary-btn am-link-btn" to="/auth?mode=signin">
                    Sign In
                  </Link>
                  <Link className="am-secondary-btn am-link-btn" to="/auth?mode=signup">
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="am-card am-landing-card">
            <div className="am-section-title">How the agent works</div>
            <div className="am-list-item">
              Input flows through code, upload, repo, or address ingestion.
            </div>
            <div className="am-list-item">
              AuditMind validates the source, runs rule checks, and forwards context to ElizaOS + Qwen when available.
            </div>
            <div className="am-list-item">
              Results are merged into one review with verdicts, evidence, fixes, recommendations, and status telemetry.
            </div>
            <div className="am-list-item">
              Your session, auth profile, history, and saved reports stay local for now.
            </div>
          </div>
        </div>
      </motion.section>

      <section className="am-three-col">
        {featureCards.map((item, index) => (
          <motion.article
            key={item.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.05 }}
            className="am-card am-section-card"
          >
            <h2 className="am-section-title">{item.title}</h2>
            <p className="am-muted">{item.text}</p>
          </motion.article>
        ))}
      </section>

      <section className="am-card am-section-card">
        <div className="am-section-header">
          <div>
            <h2 className="am-section-title">Workspace capabilities</h2>
            <p className="am-muted">
              The analyzer screen exposes every workflow we discussed, with local auth and local persistence ready now.
            </p>
          </div>
          <Link className="am-secondary-btn am-link-btn" to="/about">
            View architecture
          </Link>
        </div>
        <div className="am-two-col">
          <div>
            {roadmapFeatures.slice(0, 5).map((feature) => (
              <div key={feature} className="am-list-item">
                {feature}
              </div>
            ))}
          </div>
          <div>
            {roadmapFeatures.slice(5).map((feature) => (
              <div key={feature} className="am-list-item">
                {feature}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
