export default function About() {
  return (
    <div className="am-stack">
      <section className="am-card am-section-card">
        <h1 className="am-page-title" style={{ fontSize: "2.2rem" }}>
          About <span>AuditMind</span>
        </h1>
        <p className="am-subtitle">
          AuditMind is a Solidity security workspace that merges rule-based detection with ElizaOS and Qwen-backed reasoning.
        </p>
      </section>

      <section className="am-two-col">
        <div className="am-card am-section-card">
          <h2 className="am-section-title">Architecture</h2>
          <div className="am-list-item">Frontend workspace handles input modes, comparison, exports, settings, and local auth state.</div>
          <div className="am-list-item">Backend resolves code from direct paste, multi-file uploads, public GitHub links, and verified contract addresses.</div>
          <div className="am-list-item">Rule checks detect deterministic Solidity patterns and risk flags before or alongside agent analysis.</div>
          <div className="am-list-item">ElizaOS and Qwen enrich findings with structured summaries, risks, recommendations, and beginner explanations.</div>
        </div>

        <div className="am-card am-section-card">
          <h2 className="am-section-title">Output Model</h2>
          <div className="am-list-item">Unified summary and reasoning block</div>
          <div className="am-list-item">Severity-ranked findings with evidence and confidence</div>
          <div className="am-list-item">Admin-power and contract capability dashboard</div>
          <div className="am-list-item">Recommendations, auto-fix suggestions, and export-ready report sections</div>
        </div>
      </section>
    </div>
  );
}
