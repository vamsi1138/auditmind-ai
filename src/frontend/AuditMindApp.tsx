import React, { useMemo, useState } from "react";
import { analyzeContractCode, type AuditApiReport } from "./utils";

const SAMPLE_CONTRACT = `pragma solidity ^0.8.0;

contract ReentrancyLike {
    mapping(address => uint256) public balances;

    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() public {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance");

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        balances[msg.sender] = 0;
    }
}`;

function AuditMindApp() {
  const [contractCode, setContractCode] = useState<string>(SAMPLE_CONTRACT);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [report, setReport] = useState<AuditApiReport | null>(null);

  const charCount = useMemo(() => contractCode.length, [contractCode]);

  async function handleAnalyze() {
    setLoading(true);
    setError("");

    try {
      const result = await analyzeContractCode(contractCode);
      setReport(result);
    } catch (err) {
      setReport(null);
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setContractCode("");
    setReport(null);
    setError("");
  }

  async function handleCopyReport() {
    if (!report) return;

    await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
  }

  return (
    <div className="page">
      <div className="container">
        <header className="hero">
          <h1>AuditMind AI</h1>
          <p>
            ElizaOS-powered smart contract security copilot using validation,
            rule flags, Qwen reasoning, and structured risk reporting.
          </p>
        </header>

        <section className="card">
          <div className="row between">
            <h2>Paste Solidity Contract</h2>
            <span className="muted">{charCount} chars</span>
          </div>

          <textarea
            className="editor"
            value={contractCode}
            onChange={(e) => setContractCode(e.target.value)}
            placeholder="Paste Solidity contract code here..."
          />

          <div className="row gap wrap">
            <button onClick={handleAnalyze} disabled={loading}>
              {loading ? "Analyzing..." : "Analyze Contract"}
            </button>

            <button className="secondary" onClick={() => setContractCode(SAMPLE_CONTRACT)} disabled={loading}>
              Load Sample
            </button>

            <button className="secondary" onClick={handleClear} disabled={loading}>
              Clear
            </button>

            {report ? (
              <button className="secondary" onClick={handleCopyReport} disabled={loading}>
                Copy Report JSON
              </button>
            ) : null}
          </div>

          {error ? <p className="error">{error}</p> : null}
        </section>

        {report ? (
          <>
            <section className="grid">
              <div className="card">
                <h3>Contract Summary</h3>
                <p>{report.contractSummary}</p>
              </div>

              <div className="card">
                <h3>Verdict</h3>
                <div className="row gap wrap">
                  <span className="badge">{report.verdict}</span>
                  <span className="score">Risk Score: {report.riskScore}</span>
                </div>
                <p className="muted">
                  {report.sourceAnalysis?.elizaAgentUsed
                    ? "ElizaOS + Qwen analysis active"
                    : "Fallback rule engine used"}
                </p>
              </div>
            </section>

            <section className="card">
              <h3>Beginner Explanation</h3>
              <p>{report.beginnerExplanation}</p>
            </section>

            <section className="card">
              <h3>Detected Features</h3>
              <div className="tagWrap">
                {report.detectedFeatures?.length ? (
                  report.detectedFeatures.map((feature) => (
                    <span key={feature} className="tag">
                      {feature}
                    </span>
                  ))
                ) : (
                  <span className="muted">No features detected.</span>
                )}
              </div>
            </section>

            <section className="card">
              <h3>Rule Flags</h3>
              <div className="tagWrap">
                {report.ruleFlags?.length ? (
                  report.ruleFlags.map((flag) => (
                    <span key={flag} className="tag">
                      {flag}
                    </span>
                  ))
                ) : (
                  <span className="muted">No rule flags detected.</span>
                )}
              </div>
            </section>

            <section className="card">
              <h3>Possible Risks</h3>
              <div className="riskList">
                {report.possibleRisks?.length ? (
                  report.possibleRisks.map((risk) => (
                    <div key={risk.id} className="riskItem">
                      <div className="row between wrap">
                        <strong>{risk.title}</strong>
                        <span className={`severity severity-${risk.severity.toLowerCase()}`}>
                          {risk.severity}
                        </span>
                      </div>

                      <p><strong>Category:</strong> {risk.category}</p>
                      <p><strong>Description:</strong> {risk.description}</p>
                      <p><strong>Why It Matters:</strong> {risk.whyItMatters}</p>
                      <p><strong>Suggestion:</strong> {risk.suggestion}</p>

                      <div className="tagWrap">
                        {risk.tags?.map((tag) => (
                          <span key={tag} className="tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted">No risks reported.</p>
                )}
              </div>
            </section>

            <section className="card">
              <h3>Agent Reasoning</h3>
              <p>{report.agentReasoning || "No extra reasoning provided."}</p>
            </section>

            <section className="card">
              <h3>Source Analysis</h3>
              <pre className="jsonBlock">
{JSON.stringify(report.sourceAnalysis, null, 2)}
              </pre>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default AuditMindApp;