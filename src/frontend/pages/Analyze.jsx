import { useEffect, useMemo, useRef, useState } from "react";
import { analyzeContract, analyzeContractAddress, analyzeGithubSource, analyzeUploadedFiles, getToolingStatus, isGithubUrl, isValidContractAddress } from "../services/api";
import { buildAdminPowers, buildAutoFixes, buildConfidenceScore, buildEvidenceMap, buildFeaturePills, buildRecommendations, countFeatures, countWarnings, filterRisksByConfidence } from "../helpers/reporting";
import { useAppStore } from "../store/useStore";

const SAMPLE = `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.20;\ncontract VulnerableBank {\n mapping(address => uint256) public balances;\n address public owner;\n constructor(){owner = msg.sender;}\n function deposit() external payable { balances[msg.sender] += msg.value; }\n function withdraw(uint256 amount) external {\n  require(balances[msg.sender] >= amount, "Insufficient");\n  (bool ok,) = msg.sender.call{value: amount}("");\n  require(ok, "Transfer failed");\n  balances[msg.sender] -= amount;\n }\n}`;
const INPUTS = [["paste", "Paste Code"], ["upload", "Upload Files"], ["github", "GitHub Link"], ["address", "Contract Address"], ["repo", "Repo Scan"]];
const TABS = [["summary", "Summary"], ["risks", "Risks"], ["recommendations", "Recommendations"], ["reasoning", "Agent Reasoning"], ["source", "Source"], ["evidence", "Evidence"], ["fixes", "Auto-Fix"], ["admin", "Admin Powers"]];

const dl = (name, content, type = "text/plain;charset=utf-8") => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

const md = (result, code, evidence, fixes) => {
  const raw = result?.rawBackendReport || {};
  return [
    "# AuditMind Report",
    "",
    `- Verdict: ${raw.verdict || "Safe"}`,
    `- Risk Score: ${(result?.riskScore || 0) * 10}/100`,
    "",
    "## Contract Summary",
    raw.contractSummary || "Not available.",
    "",
    "## Agent Reasoning",
    raw.agentReasoning || "Not available.",
    "",
    "## Evidence",
    evidence.map((item) => `- ${item.riskId}: ${item.evidence.map((e) => `line ${e.line} ${e.snippet}`).join("; ") || "No direct lines"}`).join("\n") || "- None",
    "",
    "## Auto-Fix",
    fixes.map((fix) => `- ${fix.title}: ${fix.summary}`).join("\n") || "- None",
    "",
    "## Source",
    "```solidity",
    code || "",
    "```"
  ].join("\n");
};

function openPdf(result, code, recs, evidence) {
  const raw = result?.rawBackendReport || {};
  const win = window.open("", "_blank", "width=1100,height=900");
  if (!win) return false;
  win.document.write(`<html><body style="font-family:Arial;padding:32px"><h1>AuditMind Report</h1><p>Verdict: ${raw.verdict || "Safe"} | Score: ${(result?.riskScore || 0) * 10}/100</p><h2>Summary</h2><p>${raw.contractSummary || "Not available."}</p><h2>Reasoning</h2><pre style="white-space:pre-wrap">${raw.agentReasoning || "Not available."}</pre><h2>Recommendations</h2><ul>${recs.map((r) => `<li>${r}</li>`).join("")}</ul><h2>Evidence</h2><ul>${evidence.map((item) => `<li>${item.riskId}: ${item.evidence.map((e) => `line ${e.line} ${e.snippet}`).join("; ") || "No direct lines"}</li>`).join("")}</ul><h2>Source</h2><pre style="white-space:pre-wrap">${String(code || "").replace(/[<>&]/g, "")}</pre></body></html>`);
  win.document.close();
  win.print();
  return true;
}

function InputBody({ mode, code, address, githubUrl, uploadedFiles, onCode, onAddress, onGithub, onFiles }) {
  const folderRef = useRef(null);
  useEffect(() => {
    if (folderRef.current) {
      folderRef.current.setAttribute("webkitdirectory", "");
      folderRef.current.setAttribute("directory", "");
    }
  }, []);
  if (mode === "address") return <><input className="am-text-input" value={address} onChange={(e) => onAddress(e.target.value)} placeholder="0x..." /><p className="am-muted">Verified source is fetched before analysis.</p></>;
  if (mode === "github" || mode === "repo") return <><input className="am-text-input" value={githubUrl} onChange={(e) => onGithub(e.target.value)} placeholder={mode === "repo" ? "https://github.com/owner/repo" : "https://github.com/owner/repo/blob/main/Contract.sol"} /><p className="am-muted">{mode === "repo" ? "Repo scan bundles Solidity files from a public GitHub repo." : "GitHub mode accepts raw file, blob, tree, or repo URLs."}</p></>;
  if (mode === "upload") return <>
    <div className="am-upload-grid">
      <label className="am-upload-box"><input hidden type="file" multiple accept=".sol,.txt" onChange={(e) => onFiles(e.target.files)} /><span>Upload Solidity files</span></label>
      <label className="am-upload-box"><input hidden ref={folderRef} type="file" multiple accept=".sol,.txt" onChange={(e) => onFiles(e.target.files)} /><span>Scan local folder</span></label>
    </div>
    <div className="am-chip-row">{uploadedFiles.map((file) => <span key={file.fileName} className="am-chip">{file.fileName}</span>)}</div>
  </>;
  return <textarea className="am-editor" value={code} onChange={(e) => onCode(e.target.value)} placeholder="Paste your Solidity contract below to start security analysis" />;
}

export default function Analyze() {
  const s = useAppStore();
  const [tab, setTab] = useState("summary");
  const [error, setError] = useState("");
  useEffect(() => {
    if (s.toolingStatus) return;
    getToolingStatus().then(s.setToolingStatus).catch(() => s.setToolingStatus({ slither: { installed: false }, foundry: { installed: false } }));
  }, [s]);

  const raw = s.lastResult?.rawBackendReport || {};
  const risks = raw.possibleRisks || [];
  const evidence = useMemo(() => buildEvidenceMap(s.code, risks), [s.code, risks]);
  const visibleRisks = useMemo(() => s.settings.hideLowConfidence ? filterRisksByConfidence(risks, evidence, s.settings.confidenceThreshold) : risks, [evidence, risks, s.settings.confidenceThreshold, s.settings.hideLowConfidence]);
  const recs = useMemo(() => buildRecommendations(raw), [raw]);
  const fixes = useMemo(() => buildAutoFixes(raw), [raw]);
  const features = useMemo(() => buildFeaturePills(raw), [raw]);
  const admin = useMemo(() => buildAdminPowers(raw), [raw]);
  const combined = `${raw.contractSummary || "No contract summary available."}\n\n${raw.agentReasoning || "No agent reasoning available."}`.trim();
  const score = (s.lastResult?.riskScore || 0) * 10;

  const analyze = async () => {
    setError("");
    s.setLoading(true);
    try {
      let result;
      let source = s.code;
      const started = performance.now();
      if (s.inputMode === "address") {
        if (!isValidContractAddress(s.address)) throw new Error("Enter a valid contract address.");
        result = await analyzeContractAddress(s.address);
        source = s.address;
      } else if (s.inputMode === "github" || s.inputMode === "repo") {
        if (!isGithubUrl(s.githubUrl)) throw new Error("Enter a valid public GitHub URL.");
        result = await analyzeGithubSource(s.githubUrl);
        source = s.githubUrl;
      } else if (s.inputMode === "upload") {
        if (!s.uploadedFiles.length) throw new Error("Upload one or more Solidity files first.");
        result = await analyzeUploadedFiles(s.uploadedFiles);
        source = s.uploadedFiles.map((file) => `// File: ${file.fileName}\n${file.fileContent}`).join("\n\n");
      } else {
        if (!s.code.trim()) throw new Error("Paste Solidity code or choose another input mode.");
        result = await analyzeContract(s.code);
      }
      const elapsed = Math.round(performance.now() - started);
      s.setLastResult(result);
      s.setLastAnalysisMs(elapsed);
      s.addHistoryEntry({ code: source, uploadedFiles: s.uploadedFiles, result, selectedFeature: s.selectedFeature, inputMode: s.inputMode, analysisMs: elapsed, riskScore: result?.riskScore, severity: result?.severity });
      s.showSavedToast("Analysis completed");
      setTab("summary");
    } catch (e) {
      s.setLastResult(null);
      setError(e?.message || "Unable to analyze contract.");
    } finally {
      s.setLoading(false);
    }
  };

  const onFiles = async (fileList) => {
    const files = await Promise.all(Array.from(fileList || []).filter((file) => /\.(sol|txt)$/i.test(file.name)).map(async (file) => ({ fileName: file.webkitRelativePath || file.name, fileContent: await file.text() })));
    s.setUploadedFiles(files);
    s.setCode(files.map((file) => `// File: ${file.fileName}\n${file.fileContent}`).join("\n\n"));
    s.showSavedToast(`${files.length} file(s) ready for analysis`);
  };

  const sourceStatus = raw.sourceAnalysis || {};
  const severity = String(s.lastResult?.severity?.overall || "low").toLowerCase();

  return (
    <div className="am-stack">
      <section><h1 className="am-page-title">Smart Contract <span>Security Copilot</span></h1><p className="am-subtitle">AI-powered analysis | Advanced risk detection | Actionable insights</p></section>

      <section className="am-grid">
        <div className="am-card am-input-card">
          <div className="am-mode-tabs">{INPUTS.map(([id, label]) => <button key={id} type="button" className={`am-mode-tab${s.inputMode === id ? " active" : ""}`} onClick={() => { s.setInputMode(id); setError(""); }}>{label}{id === "address" ? <span className="am-badge-soon">Live</span> : null}</button>)}</div>
          <InputBody
            mode={s.inputMode}
            code={s.code}
            address={s.address}
            githubUrl={s.githubUrl}
            uploadedFiles={s.uploadedFiles}
            onCode={(v) => { s.setCode(v); s.setAddress(""); s.setGithubUrl(""); s.setUploadedFiles([]); }}
            onAddress={(v) => { s.setAddress(v); s.setGithubUrl(""); s.setUploadedFiles([]); }}
            onGithub={(v) => { s.setGithubUrl(v); s.setAddress(""); if (s.inputMode !== "repo") s.setUploadedFiles([]); }}
            onFiles={onFiles}
          />
          {error ? <div className="am-error">{error}</div> : null}
          <div className="am-input-actions" style={{ marginTop: 14 }}>
            <button type="button" className="am-secondary-btn" onClick={() => { s.setInputMode("paste"); s.setCode(SAMPLE); s.setAddress(""); s.setGithubUrl(""); s.setUploadedFiles([]); s.showSavedToast("Sample contract loaded"); }}>Load Sample</button>
            <button type="button" className="am-secondary-btn" onClick={() => { s.clearWorkspace(); setError(""); }}>Clear</button>
            <button type="button" className="am-primary-btn" style={{ marginLeft: "auto" }} onClick={analyze} disabled={s.loading}>{s.loading ? "Analyzing..." : "Analyze Contract"}</button>
          </div>
        </div>

        <aside className="am-card am-side-metric">
          <div className="am-section-title">Risk Score</div>
          <div className="am-kpi">{score}<span style={{ fontSize: "1.1rem", color: "#93a4cc" }}>/100</span></div>
          <div style={{ margin: "14px 0" }}><span className={`am-severity-pill am-severity-${severity}`}>{raw.verdict || "Ready"}</span></div>
          <div className="am-risk-meter"><div className="am-risk-meter-bar" style={{ width: `${score}%` }} /></div>
          <p className="am-muted" style={{ marginTop: 18 }}>{combined.split("\n")[0]}</p>
          <button type="button" className="am-secondary-btn" style={{ marginTop: 16, width: "100%" }} onClick={() => setTab("risks")}>View Details</button>
        </aside>
      </section>

      <section className="am-card am-status-strip">
        <div className="am-chip-row"><span className="am-chip">Analysis {s.lastResult ? "Complete" : "Ready"}</span><span className="am-chip">{s.lastAnalysisMs ? `Completed in ${s.lastAnalysisMs}ms` : "Waiting for run"}</span></div>
        <div className="am-chip-row"><span className="am-chip">{visibleRisks.length} Risks Found</span><span className="am-chip">{countWarnings(raw)} Warnings</span><span className="am-chip">{countFeatures(raw)} Features</span><span className="am-chip">Mode: {s.selectedFeature}</span></div>
      </section>

      <section className="am-card">
        <div className="am-tabbar">{TABS.map(([id, label]) => <button key={id} type="button" className={`am-tab${tab === id ? " active" : ""}`} onClick={() => setTab(id)}>{label}</button>)}</div>
        <div className="am-content-grid">
          <div className="am-stack">
            {tab === "summary" ? <>
              <section className="am-card am-section-card"><h2 className="am-section-title">Contract Summary</h2><p className="am-muted" style={{ whiteSpace: "pre-wrap" }}>{combined}</p></section>
              <section className="am-card am-section-card"><div className="am-section-header"><h2 className="am-section-title">Explanation Mode</h2><button type="button" className="am-secondary-btn" onClick={() => s.setBeginnerMode(!s.beginnerMode)}>{s.beginnerMode ? "Simple Mode" : "Technical Mode"}</button></div><p className="am-muted">{s.beginnerMode ? raw.beginnerExplanation || "Beginner explanation appears here after analysis." : raw.agentReasoning || "Technical reasoning appears here after analysis."}</p></section>
            </> : null}
            {tab === "risks" ? <section className="am-card am-section-card"><div className="am-section-header"><h2 className="am-section-title">Detected Risks</h2><div className="am-chip-row"><span className="am-chip">Threshold {s.settings.confidenceThreshold}%</span><span className="am-chip">{s.settings.hideLowConfidence ? "Evidence filter on" : "Showing all findings"}</span></div></div>{visibleRisks.length ? visibleRisks.map((risk) => { const item = evidence.find((e) => e.riskId === risk.id); const confidence = item?.confidence ?? buildConfidenceScore(risk, 0); return <div key={risk.id} className="am-risk-item"><div className="am-risk-head"><div><strong>{risk.title}</strong><div className="am-muted" style={{ marginTop: 6 }}>{risk.category}</div></div><div className="am-chip-row"><span className="am-chip">Confidence {confidence}%</span><span className={`am-severity-pill am-severity-${String(risk.severity).toLowerCase()}`}>{risk.severity}</span></div></div><p className="am-muted" style={{ marginTop: 12 }}>{risk.description || risk.whyItMatters}</p>{risk.suggestion ? <p className="am-muted" style={{ marginTop: 8 }}>Suggested action: {risk.suggestion}</p> : null}</div>; }) : <p className="am-muted">No findings match the current confidence filter.</p>}</section> : null}
            {tab === "recommendations" ? <section className="am-card am-section-card"><h2 className="am-section-title">Top Recommendations</h2>{recs.length ? recs.map((item, i) => <div key={item} className="am-list-item"><strong style={{ marginRight: 8 }}>{i + 1}.</strong>{item}</div>) : <p className="am-muted">Run an analysis to generate recommendations.</p>}</section> : null}
            {tab === "reasoning" ? <section className="am-card am-section-card"><h2 className="am-section-title">Agent Reasoning</h2><pre className="am-code-diff">{raw.agentReasoning || "No agent reasoning yet."}</pre></section> : null}
            {tab === "source" ? <section className="am-card am-section-card"><h2 className="am-section-title">Source Analysis Status</h2><div className="am-two-col"><div className="am-list-item">{sourceStatus.validationPassed ? "Validation Passed" : "Validation Pending"}</div><div className="am-list-item">{sourceStatus.ruleEngineUsed ? "Rule Engine Used" : "Rule Engine Not Used"}</div><div className="am-list-item">{sourceStatus.elizaAgentUsed ? "Eliza Agent Used" : "Eliza Agent Not Used"}</div><div className="am-list-item">{sourceStatus.qwenEndpointUsed ? "Qwen Endpoint Used" : "Qwen Endpoint Not Used"}</div></div><div className="am-list-item" style={{ marginTop: 12 }}>Analysis mode: {sourceStatus.analysisMode || "Not started"}</div></section> : null}
            {tab === "evidence" ? <section className="am-card am-section-card"><h2 className="am-section-title">Line-level Evidence Mapping</h2>{evidence.length ? evidence.map((item) => <div key={item.riskId} className="am-evidence-item"><div className="am-risk-head"><strong>{item.riskId}</strong><span className="am-chip">Confidence {item.confidence}%</span></div>{item.evidence.length ? item.evidence.map((e) => <div key={`${item.riskId}-${e.line}`} className="am-inline-code">line {e.line}: {e.snippet}</div>) : <p className="am-muted">No exact lines mapped automatically for this finding.</p>}</div>) : <p className="am-muted">Evidence mapping becomes available after a result is generated.</p>}</section> : null}
            {tab === "fixes" ? <section className="am-card am-section-card"><h2 className="am-section-title">Auto-fix Suggestions</h2>{fixes.length ? fixes.map((fix) => <div key={fix.title} className="am-evidence-item"><strong>{fix.title}</strong><p className="am-muted" style={{ margin: "10px 0" }}>{fix.summary}</p><pre className="am-code-diff">{fix.patch}</pre></div>) : <p className="am-muted">Auto-fix suggestions appear when matching risks are detected.</p>}</section> : null}
            {tab === "admin" ? <section className="am-card am-section-card"><h2 className="am-section-title">Wallet / Admin-power Dashboard</h2>{admin.length ? admin.map((item) => <div key={item} className="am-list-item">{item}</div>) : <p className="am-muted">No admin powers detected from the current report.</p>}</section> : null}
          </div>

          <div className="am-stack">
            <section className="am-card am-section-card"><h2 className="am-section-title">Detected Features</h2><div className="am-chip-row">{features.length ? features.map((item) => <span key={item} className="am-chip">{item}</span>) : <span className="am-chip">Waiting for analysis</span>}</div></section>
            <section className="am-card am-section-card"><h2 className="am-section-title">Top Recommendations</h2>{recs.slice(0, 4).map((item) => <div key={item} className="am-list-item">{item}</div>)}{!recs.length ? <p className="am-muted">Recommendations show here after analysis.</p> : null}</section>
            <section className="am-card am-section-card"><h2 className="am-section-title">Team Exports</h2><div className="am-export-actions"><button type="button" className="am-secondary-btn" onClick={() => { copyText(md(s.lastResult, s.code, evidence, fixes)); s.showSavedToast("Markdown report copied"); }}>Copy Report</button><button type="button" className="am-secondary-btn" onClick={() => { dl("auditmind-report.md", md(s.lastResult, s.code, evidence, fixes), "text/markdown;charset=utf-8"); s.showSavedToast("Markdown downloaded"); }}>Download MD</button><button type="button" className="am-secondary-btn" onClick={() => { dl("auditmind-report.json", JSON.stringify(raw, null, 2), "application/json;charset=utf-8"); s.showSavedToast("JSON downloaded"); }}>Download JSON</button><button type="button" className="am-secondary-btn" onClick={() => s.showSavedToast(openPdf(s.lastResult, s.code, recs, evidence) ? "Print dialog opened for PDF export" : "Popup blocked for PDF export")}>Download PDF</button><button type="button" className="am-primary-btn" onClick={() => { if (!s.lastResult) return; s.saveReport({ id: `${Date.now()}-saved`, createdAt: new Date().toISOString(), code: s.code || titleFromCode(s.code), result: s.lastResult, inputMode: s.inputMode, analysisMs: s.lastAnalysisMs }); s.showSavedToast("Report saved"); }}>Save Report</button></div></section>
            <section className="am-card am-section-card"><h2 className="am-section-title">Runtime & Tooling</h2><div className="am-list-item">Selected analysis profile: {s.selectedFeature}</div><div className="am-list-item">Slither: {s.toolingStatus?.slither?.installed ? "Installed" : "Not found"}</div><div className="am-list-item">Foundry: {s.toolingStatus?.foundry?.installed ? "Installed" : "Not found"}</div><div className="am-input-actions" style={{ marginTop: 12 }}><button type="button" className={`am-secondary-btn${s.selectedFeature === "ai-analysis" ? " is-active" : ""}`} onClick={() => s.setSelectedFeature("ai-analysis")}>AI Analysis</button><button type="button" className={`am-secondary-btn${s.selectedFeature === "risk-detection" ? " is-active" : ""}`} onClick={() => s.setSelectedFeature("risk-detection")}>Risk Detection</button><button type="button" className={`am-secondary-btn${s.selectedFeature === "structured-reports" ? " is-active" : ""}`} onClick={() => s.setSelectedFeature("structured-reports")}>Structured Reports</button><button type="button" className={`am-secondary-btn${s.selectedFeature === "fast-performance" ? " is-active" : ""}`} onClick={() => s.setSelectedFeature("fast-performance")}>Fast Performance</button></div></section>
          </div>
        </div>
      </section>
    </div>
  );
}
