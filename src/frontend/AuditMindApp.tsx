import React, { useState, useEffect, useRef, useCallback } from "react";
import { analyzeContractCode, type AuditApiReport, type RiskItem } from "./utils";

// ─── SAMPLE CONTRACTS ────────────────────────────────────────────────────────

const SAMPLES: Record<string, string> = {
  safe: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/access/Ownable.sol";

contract SafeToken is Ownable {
    string public name = "SafeToken";
    string public symbol = "STK";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) private balances;
    event Transfer(address indexed from, address indexed to, uint256 value);

    constructor(uint256 _initialSupply) Ownable(msg.sender) {
        totalSupply = _initialSupply * 10 ** decimals;
        balances[msg.sender] = totalSupply;
    }

    function balanceOf(address account) public view returns (uint256) {
        return balances[account];
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        require(to != address(0), "Zero address");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
}`,

  medium: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Vault {
    mapping(address => uint256) public balances;
    address public owner;
    bool public paused;

    constructor() { owner = msg.sender; }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function deposit() public payable {
        require(!paused, "Paused");
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient");
        // WARNING: state update AFTER external call
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        balances[msg.sender] -= amount;
    }

    function setPaused(bool _paused) public onlyOwner {
        paused = _paused;
    }
}`,

  high: `// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

contract UnsafeBank {
    mapping(address => uint) public balances;
    address public admin;

    constructor() public { admin = msg.sender; }

    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }

    // CRITICAL: reentrancy vulnerability
    function withdraw() public {
        uint amount = balances[msg.sender];
        msg.sender.call.value(amount)("");
        balances[msg.sender] = 0;
    }

    function adminDrain() public {
        require(msg.sender == admin);
        selfdestruct(payable(admin));
    }

    // No access control!
    function setAdmin(address newAdmin) public {
        admin = newAdmin;
    }
}`,
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const LOADING_MSGS = [
  "Validating Solidity input…",
  "Running rule-based security checks…",
  "Analyzing contract logic…",
  "Running ElizaOS agent…",
  "Generating structured audit response…",
];

const VERDICT_CONFIG = {
  Safe:        { color: "#22c55e", bg: "rgba(34,197,94,0.1)",   border: "rgba(34,197,94,0.3)",   emoji: "🛡️" },
  Caution:     { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.3)",  emoji: "⚠️" },
  "High Risk": { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.3)",   emoji: "🚨" },
} as const;

const SEV_EMOJI: Record<string, string> = {
  High: "🚨", Medium: "⚠️", Low: "ℹ️", Info: "📌",
};

// ─── HISTORY ─────────────────────────────────────────────────────────────────

interface HistoryItem {
  id: string;
  preview: string;
  verdict: AuditApiReport["verdict"];
  timestamp: string;
  report: AuditApiReport;
  code: string;
}

function loadHistory(): HistoryItem[] {
  try { return JSON.parse(localStorage.getItem("auditmind_history") || "[]"); }
  catch { return []; }
}

function saveHistory(items: HistoryItem[]) {
  try { localStorage.setItem("auditmind_history", JSON.stringify(items)); }
  catch { /* quota exceeded — ignore */ }
}

// ─── SMALL HELPERS ───────────────────────────────────────────────────────────

function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="copy-btn"
      onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}
    >
      {done ? "✓ Copied" : label}
    </button>
  );
}

// ─── RISK ITEM ────────────────────────────────────────────────────────────────

function RiskCard({ risk }: { risk: RiskItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`risk-item ${risk.severity}`}>
      <button className="risk-header" onClick={() => setOpen(p => !p)}>
        <span className="risk-emoji">{SEV_EMOJI[risk.severity]}</span>
        <div className="risk-title-wrap">
          <div className="risk-title">{risk.title}</div>
          <div className="risk-category">{risk.category}</div>
        </div>
        <span className={`severity-badge ${risk.severity}`}>{risk.severity.toUpperCase()}</span>
        <span className="risk-arrow">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="risk-body">
          <div className="risk-body-section">
            <div className="risk-body-label">DESCRIPTION</div>
            <p className="risk-body-text">{risk.description}</p>
          </div>
          <div className="risk-body-section">
            <div className="risk-body-label">WHY IT MATTERS</div>
            <p className="risk-body-text">{risk.whyItMatters}</p>
          </div>
          <div className="risk-body-section">
            <div className="risk-body-label">SUGGESTION</div>
            <p className="risk-body-suggestion">{risk.suggestion}</p>
          </div>
          <div className="risk-tags">
            {risk.tags.map(tag => (
              <span key={tag} className="risk-tag">#{tag}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function AuditMindApp() {
  const [code, setCode]           = useState("");
  const [loading, setLoading]     = useState(false);
  const [loadMsg, setLoadMsg]     = useState(LOADING_MSGS[0]);
  const [progress, setProgress]   = useState(0);
  const [error, setError]         = useState("");
  const [report, setReport]       = useState<AuditApiReport | null>(null);
  const [filter, setFilter]       = useState("All");
  const [explainMode, setExplainMode] = useState<"beginner" | "technical">("beginner");
  const [showSamples, setShowSamples] = useState(false);
  const [history, setHistory]     = useState<HistoryItem[]>(loadHistory);
  const resultsRef                = useRef<HTMLDivElement>(null);
  const dropdownRef               = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSamples(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Loading message rotator
  useEffect(() => {
    if (!loading) return;
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % LOADING_MSGS.length;
      setLoadMsg(LOADING_MSGS[i]);
      setProgress(p => Math.min(p + 18, 90));
    }, 550);
    return () => clearInterval(t);
  }, [loading]);

  const handleAnalyze = useCallback(async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    setReport(null);
    setProgress(0);
    setLoadMsg(LOADING_MSGS[0]);

    try {
      const result = await analyzeContractCode(code);
      setReport(result);
      setProgress(100);

      // Save to history
      const item: HistoryItem = {
        id: Date.now().toString(),
        preview: code.split("\n").find(l => l.trim()) || "Contract",
        verdict: result.verdict,
        timestamp: new Date().toLocaleString(),
        report: result,
        code,
      };
      setHistory(prev => {
        const next = [item, ...prev].slice(0, 5);
        saveHistory(next);
        return next;
      });

      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }, [code]);

  const lineCount = Math.max(12, code.split("\n").length + 2);

  // Derived values
  const vc = report ? VERDICT_CONFIG[report.verdict] : null;
  const scoreColor = report
    ? report.riskScore <= 20 ? "#22c55e" : report.riskScore <= 59 ? "#f59e0b" : "#ef4444"
    : "#22c55e";
  const scoreGrad = report
    ? report.riskScore <= 20
      ? "linear-gradient(90deg,#16a34a,#22c55e)"
      : report.riskScore <= 59
      ? "linear-gradient(90deg,#d97706,#f59e0b)"
      : "linear-gradient(90deg,#dc2626,#ef4444)"
    : "";

  const sortedRisks = report
    ? [...report.possibleRisks]
        .filter(r => filter === "All" || r.severity === filter)
        .sort((a, b) => {
          const o: Record<string, number> = { High: 0, Medium: 1, Low: 2, Info: 3 };
          return o[a.severity] - o[b.severity];
        })
    : [];

  const recommendations = report
    ? [...report.possibleRisks]
        .sort((a, b) => {
          const o: Record<string, number> = { High: 0, Medium: 1, Low: 2, Info: 3 };
          return o[a.severity] - o[b.severity];
        })
        .map(r => r.suggestion)
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 5)
    : [];

  const copyHumanReport = () => {
    if (!report) return;
    const txt = `AuditMind AI — Security Report
${"=".repeat(36)}
Verdict: ${report.verdict}
Risk Score: ${report.riskScore}/100

Contract Summary:
${report.contractSummary}

Risks (${report.possibleRisks.length}):
${report.possibleRisks.map(r => `• [${r.severity}] ${r.title}\n  ${r.description}`).join("\n\n")}

Top Recommendations:
${recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}

Beginner Explanation:
${report.beginnerExplanation}`;
    navigator.clipboard.writeText(txt);
  };

  const downloadJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify({ ...report, contractCode: code }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "auditmind-report.json";
    a.click();
  };

  const downloadSummary = () => {
    if (!report) return;
    const txt = `AuditMind AI — Summary\nVerdict: ${report.verdict}\nRisk Score: ${report.riskScore}/100\n\n${report.contractSummary}\n\nTop Recommendations:\n${recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}`;
    const blob = new Blob([txt], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "auditmind-summary.txt";
    a.click();
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setCode(item.code);
    setReport(item.report);
    setError("");
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  // Parse agent reasoning into labelled sections
  const agentSections = report?.agentReasoning
    ? report.agentReasoning.split("\n\n").map(block => {
        if (block.startsWith("**") && block.includes(":")) {
          const colonIdx = block.indexOf(":");
          return {
            title: block.slice(2, colonIdx).replace(/\*\*/g, "").trim(),
            body: block.slice(colonIdx + 1).trim(),
          };
        }
        return { title: null, body: block.trim() };
      }).filter(s => s.body)
    : [];

  return (
    <div className="page">

      {/* ── HEADER ── */}
      <header className="header">
        <div className="header-inner">
          <div className="header-logo">
            <div className="logo-icon">🛡️</div>
            <span className="logo-name">AuditMind <span>AI</span></span>
            <span className="logo-badge">RULE ENGINE + AI</span>
          </div>
          <div className="header-right">
            <span className="header-version">v1.0.0</span>
            <div className="status-dot" />
            <span className="status-label">ElizaOS Active</span>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <div className="hero">
        <div className="hero-inner">
          <div className="hero-badge">
            <div className="hero-badge-dot" />
            LIVE · ElizaOS Powered · Nosana Deployed
          </div>
          <h1>Smart Contract <span>Security</span> Copilot</h1>
          <p>
            ElizaOS-powered smart contract security copilot for fast, structured
            Solidity risk analysis. Detect vulnerabilities, understand risks, get
            actionable fixes.
          </p>
        </div>
      </div>

      <div className="container">

        {/* ── MODE TABS ── */}
        <div className="mode-tabs">
          {[
            { id: "paste",   label: "📄 Paste Code",         active: true  },
            { id: "upload",  label: "📤 Upload File",        active: false },
            { id: "github",  label: "🐙 GitHub Link",        active: false },
            { id: "address", label: "🔍 Contract Address",   active: false },
          ].map(tab => (
            <button
              key={tab.id}
              className={`mode-tab ${tab.id === "paste" ? "active" : "disabled"}`}
              disabled={!tab.active}
            >
              {tab.label}
              {!tab.active && <span className="soon-badge">SOON</span>}
            </button>
          ))}
        </div>

        {/* ── INPUT CARD ── */}
        <div className="card">
          <div className="input-card-top">
            <div>
              <h2>Analyze Solidity Contract</h2>
              <p>Supports Solidity pasted directly from .sol files, repos, or local drafts.</p>
            </div>
            <span className="char-count">{code.length.toLocaleString()} chars</span>
          </div>

          {/* Editor with line numbers */}
          <div className="editor-wrap">
            <div className="line-nums">
              {Array.from({ length: lineCount }, (_, i) => (
                <span key={i} className="line-num">{i + 1}</span>
              ))}
            </div>
            <textarea
              className="editor"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder={"// Paste Solidity contract code here…\n// Example:\n// pragma solidity ^0.8.20;\n// contract MyContract { ... }"}
              spellCheck={false}
            />
          </div>

          {/* Buttons */}
          <div className="btn-row">
            <button
              className="btn btn-primary"
              onClick={handleAnalyze}
              disabled={loading || !code.trim()}
            >
              {loading ? "⏳ Analyzing…" : "⚡ Analyze Contract"}
            </button>

            {/* Sample dropdown */}
            <div className="dropdown-wrap" ref={dropdownRef}>
              <button
                className="btn btn-ghost"
                onClick={() => setShowSamples(p => !p)}
                disabled={loading}
              >
                📄 Load Sample ▾
              </button>
              {showSamples && (
                <div className="dropdown-menu">
                  {[
                    { key: "safe",   label: "✅ Safe Sample" },
                    { key: "medium", label: "⚠️ Medium Risk Sample" },
                    { key: "high",   label: "🔴 High Risk Sample" },
                  ].map(s => (
                    <button
                      key={s.key}
                      className="dropdown-item"
                      onClick={() => { setCode(SAMPLES[s.key]); setShowSamples(false); }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className="btn btn-ghost" onClick={() => { setCode(""); setReport(null); setError(""); }} disabled={loading}>
              ✕ Clear
            </button>

            {code && <CopyBtn text={code} label="📋 Copy Code" />}
          </div>
        </div>

        {/* ── LOADING ── */}
        {loading && (
          <div className="card loading-card">
            <div className="spinner-wrap">
              <div className="spinner-ring" />
              <div className="spinner-icon">🛡️</div>
            </div>
            <div className="loading-msg">{loadMsg}</div>
            <div className="loading-sub">ElizaOS agent processing…</div>
            <div className="progress-track">
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* ── ERROR ── */}
        {error && !loading && (
          <div className="error-card">
            <div className="error-icon">⚠️</div>
            <div className="error-title">Analysis Failed</div>
            <div className="error-msg">{error}</div>
            <button className="btn-retry" onClick={handleAnalyze}>🔄 Retry Analysis</button>
          </div>
        )}

        {/* ── RESULTS ── */}
        {report && !loading && (
          <div ref={resultsRef} className="fade-up">

            {/* Divider */}
            <div className="section-divider">
              <div className="divider-line" />
              <span className="divider-label">ANALYSIS COMPLETE</span>
              <div className="divider-line" />
            </div>

            {/* ── OVERVIEW ROW ── */}
            <div className="overview-row">

              {/* Verdict */}
              <div className="card verdict-card" style={{ background: vc!.bg, borderColor: vc!.border }}>
                <div
                  className="verdict-icon-box"
                  style={{ background: vc!.bg, border: `1px solid ${vc!.border}` }}
                >
                  {vc!.emoji}
                </div>
                <div>
                  <div className="verdict-label">VERDICT</div>
                  <div className="verdict-value" style={{ color: vc!.color }}>{report.verdict}</div>
                </div>
              </div>

              {/* Risk Score */}
              <div className="card score-card">
                <div className="verdict-label">RISK SCORE</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 6 }}>
                  <span className="score-number" style={{ color: scoreColor }}>{report.riskScore}</span>
                  <span className="score-denom">/100</span>
                </div>
                <div className="score-track">
                  <div className="score-fill" style={{ width: `${report.riskScore}%`, background: scoreGrad, boxShadow: `0 0 8px ${scoreColor}40` }} />
                </div>
              </div>

              {/* Pipeline */}
              <div className="card pipeline-card">
                <div className="verdict-label" style={{ marginBottom: 8 }}>ANALYSIS PIPELINE</div>
                {[
                  { label: "Validation",    ok: report.sourceAnalysis.validationPassed },
                  { label: "Rule Engine",   ok: report.sourceAnalysis.ruleEngineUsed },
                  { label: "Eliza Agent",   ok: report.sourceAnalysis.elizaAgentUsed },
                  { label: "Qwen Endpoint", ok: report.sourceAnalysis.qwenEndpointUsed },
                ].map(item => (
                  <div key={item.label} className="pipeline-row">
                    <div className={`pipeline-check ${item.ok ? "ok" : "fail"}`}>
                      {item.ok ? "✓" : "✗"}
                    </div>
                    <span className="pipeline-name">{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Mode Toggle */}
              <div className="card mode-toggle-card">
                <div className="verdict-label">EXPLANATION MODE</div>
                <div className="toggle-buttons">
                  {(["beginner", "technical"] as const).map(m => (
                    <button
                      key={m}
                      className={`toggle-btn ${explainMode === m ? "active" : ""}`}
                      onClick={() => setExplainMode(m)}
                    >
                      {m === "beginner" ? "👁 Beginner" : "🧠 Technical"}
                    </button>
                  ))}
                </div>
                <div className="toggle-desc">
                  {explainMode === "beginner"
                    ? "Plain English explanations emphasized"
                    : "Technical analysis & flags emphasized"}
                </div>
              </div>
            </div>

            {/* ── ACTION BAR ── */}
            <div className="card action-bar">
              <span className="action-label">EXPORT:</span>
              <button className="btn btn-ghost" onClick={copyHumanReport}>📄 Copy Human Report</button>
              <CopyBtn text={JSON.stringify(report, null, 2)} label="📋 Copy JSON" />
              <button className="btn btn-ghost" onClick={downloadJSON}>⬇ Download JSON</button>
              <button className="btn btn-ghost" onClick={downloadSummary}>⬇ Download Summary</button>
              <div style={{ marginLeft: "auto" }}>
                <button className="btn btn-ghost" disabled style={{ opacity: 0.4, cursor: "not-allowed" }}>
                  📊 Compare Mode <span style={{ fontSize: 9, color: "#3b82f6", background: "rgba(59,130,246,0.1)", padding: "1px 4px", borderRadius: 3, fontFamily: "var(--font-mono)", marginLeft: 4 }}>SOON</span>
                </button>
              </div>
            </div>

            {/* ── RESULTS GRID ── */}
            <div className="results-grid">

              {/* ── LEFT COLUMN ── */}
              <div className="results-col">

                {/* Contract Summary */}
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">
                      <div className="card-icon">📄</div>
                      Contract Summary
                    </div>
                    <CopyBtn text={report.contractSummary} />
                  </div>
                  <p className="card-body-text">{report.contractSummary}</p>
                </div>

                {/* Possible Risks */}
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">
                      <div className="card-icon">⚠️</div>
                      Possible Risks
                    </div>
                  </div>

                  {/* Severity filters */}
                  <div className="severity-filters">
                    {["All", "High", "Medium", "Low", "Info"].map(s => {
                      const count = s === "All"
                        ? report.possibleRisks.length
                        : report.possibleRisks.filter(r => r.severity === s).length;
                      return (
                        <button
                          key={s}
                          className={`sev-filter ${filter === s ? `active-${s}` : ""}`}
                          onClick={() => setFilter(s)}
                        >
                          {s} ({count})
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {sortedRisks.length === 0
                      ? <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>No risks in this category.</p>
                      : sortedRisks.map(r => <RiskCard key={r.id} risk={r} />)
                    }
                  </div>
                </div>

                {/* Top Recommendations */}
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">
                      <div className="card-icon">⚡</div>
                      Top Recommendations
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {recommendations.map((rec, i) => (
                      <div key={i} className="rec-item">
                        <div className="rec-num">{i + 1}</div>
                        <p className="rec-text">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Agent Reasoning */}
                <div className={`card ${explainMode === "technical" ? "highlighted" : ""}`}>
                  <div className="card-header">
                    <div className="card-title">
                      <div className="card-icon">🧠</div>
                      Agent Reasoning
                    </div>
                  </div>
                  <div className="agent-block">
                    {agentSections.length > 0
                      ? agentSections.map((s, i) => (
                          <div key={i}>
                            {s.title && <div className="agent-section-title">{s.title}</div>}
                            <p className="risk-body-text">{s.body}</p>
                          </div>
                        ))
                      : <p className="risk-body-text">{report.agentReasoning || "No additional reasoning provided."}</p>
                    }
                  </div>
                </div>
              </div>

              {/* ── RIGHT COLUMN ── */}
              <div className="results-col">

                {/* Beginner Explanation */}
                <div className={`card ${explainMode === "beginner" ? "highlighted" : ""}`}>
                  <div className="card-header">
                    <div className="card-title">
                      <div className="card-icon">👁</div>
                      Beginner Explanation
                    </div>
                  </div>
                  <span className="beginner-label">Explain Like I'm New to Smart Contracts</span>
                  <p className="card-body-text">{report.beginnerExplanation}</p>
                </div>

                {/* Detected Features */}
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">
                      <div className="card-icon">🏷</div>
                      Detected Features
                    </div>
                  </div>
                  <div className="chip-wrap">
                    {report.detectedFeatures.length > 0
                      ? report.detectedFeatures.map(f => (
                          <span key={f} className="chip-feature">{f}</span>
                        ))
                      : <span style={{ fontSize: 12, color: "var(--text-muted)" }}>No features detected.</span>
                    }
                  </div>
                </div>

                {/* Rule Flags */}
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">
                      <div className="card-icon">🚩</div>
                      Rule Flags
                    </div>
                  </div>
                  <div className="machine-label">MACHINE-DETECTED · DETERMINISTIC ANALYSIS</div>
                  <div className="chip-wrap">
                    {report.ruleFlags.length > 0
                      ? report.ruleFlags.map(f => (
                          <span key={f} className="chip-flag">{f}</span>
                        ))
                      : <span style={{ fontSize: 12, color: "var(--text-muted)" }}>No rule flags detected.</span>
                    }
                  </div>
                </div>

                {/* Source Analysis */}
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">
                      <div className="card-icon">✅</div>
                      Source Analysis Status
                    </div>
                  </div>
                  <div className="source-grid">
                    {[
                      { label: "Validation Passed", ok: report.sourceAnalysis.validationPassed },
                      { label: "Rule Engine Used",  ok: report.sourceAnalysis.ruleEngineUsed },
                      { label: "Eliza Agent Used",  ok: report.sourceAnalysis.elizaAgentUsed },
                      { label: "Qwen Endpoint Used",ok: report.sourceAnalysis.qwenEndpointUsed },
                    ].map(item => (
                      <div key={item.label} className={`source-item ${item.ok ? "ok" : "fail"}`}>
                        <span>{item.ok ? "✅" : "❌"}</span>
                        <span className="source-item-text">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Analyses */}
                {history.length > 0 && (
                  <div className="card">
                    <div className="card-header">
                      <div className="card-title">
                        <div className="card-icon">🕐</div>
                        Recent Analyses
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {history.map(item => {
                        const hvc = VERDICT_CONFIG[item.verdict];
                        return (
                          <button
                            key={item.id}
                            className="history-item"
                            onClick={() => loadHistoryItem(item)}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="history-preview">{item.preview}</div>
                              <div className="history-time">{item.timestamp}</div>
                            </div>
                            <span
                              className="severity-badge"
                              style={{
                                background: hvc.bg,
                                borderColor: hvc.border,
                                color: hvc.color,
                                flexShrink: 0,
                              }}
                            >
                              {item.verdict.toUpperCase()}
                            </span>
                            <span className="history-arrow">›</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── EMPTY STATE HISTORY ── */}
        {!report && !loading && !error && history.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div className="machine-label" style={{ marginBottom: 10 }}>RECENT ANALYSES</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {history.map(item => {
                const hvc = VERDICT_CONFIG[item.verdict];
                return (
                  <button
                    key={item.id}
                    className="history-item"
                    style={{ width: "auto" }}
                    onClick={() => loadHistoryItem(item)}
                  >
                    <span style={{ fontSize: 11 }}>🕐</span>
                    <span className="history-preview" style={{ maxWidth: 200 }}>
                      {item.preview}
                    </span>
                    <span
                      className="severity-badge"
                      style={{ background: hvc.bg, borderColor: hvc.border, color: hvc.color, flexShrink: 0 }}
                    >
                      {item.verdict.toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}