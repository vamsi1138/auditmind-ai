import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useStore";

function downloadText(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function toMarkdown(entry) {
  const raw = entry?.result?.rawBackendReport || {};
  const risks = raw.possibleRisks || [];

  return [
    "# AuditMind Report",
    "",
    `- Created: ${new Date(entry.createdAt).toLocaleString()}`,
    `- Verdict: ${raw.verdict || "Safe"}`,
    `- Risk Score: ${(entry?.result?.riskScore || 0) * 10}/100`,
    "",
    "## Contract Summary",
    raw.contractSummary || "Not available.",
    "",
    "## Agent Reasoning",
    raw.agentReasoning || "Not available.",
    "",
    "## Risks",
    risks.length
      ? risks.map((risk) => `- **${risk.title}** (${risk.severity}): ${risk.description || risk.whyItMatters}`).join("\n")
      : "- No major risks surfaced.",
  ].join("\n");
}

export default function SavedReports() {
  const navigate = useNavigate();
  const savedReports = useAppStore((state) => state.savedReports);
  const removeSavedReport = useAppStore((state) => state.removeSavedReport);
  const restoreFromHistory = useAppStore((state) => state.restoreFromHistory);
  const showSavedToast = useAppStore((state) => state.showSavedToast);

  const items = useMemo(() => savedReports, [savedReports]);

  return (
    <div className="am-stack">
      <section className="am-card am-section-card">
        <h1 className="am-page-title" style={{ fontSize: "2.2rem" }}>
          Saved <span>Reports</span>
        </h1>
        <p className="am-subtitle">
          Maintain a reusable team library of important findings. Export Markdown, copy JSON, or reopen any report in the analyzer.
        </p>
      </section>

      <section className="am-card am-section-card">
        {items.length === 0 ? (
          <p className="am-muted">No saved reports yet. History entries can be promoted here from the analyzer or history page.</p>
        ) : (
          <div className="am-stack">
            {items.map((entry) => (
              <div key={entry.id} className="am-history-row">
                <div>
                  <div className="am-history-title">
                    {(entry.code || "").split(/\r?\n/).find((line) => line.trim()) || "Saved report"}
                  </div>
                  <div className="am-muted" style={{ marginTop: 6 }}>
                    {new Date(entry.createdAt).toLocaleString()} | {(entry?.result?.riskScore || 0) * 10}/100
                  </div>
                </div>
                <div className="am-history-meta">
                  <button
                    type="button"
                    className="am-secondary-btn"
                    onClick={() => {
                      restoreFromHistory(entry);
                      navigate("/analyze");
                    }}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className="am-secondary-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(entry.result?.rawBackendReport || {}, null, 2));
                      showSavedToast("Report JSON copied");
                    }}
                  >
                    Copy JSON
                  </button>
                  <button
                    type="button"
                    className="am-secondary-btn"
                    onClick={() => {
                      downloadText(`auditmind-report-${entry.id}.md`, toMarkdown(entry), "text/markdown;charset=utf-8");
                      showSavedToast("Markdown exported");
                    }}
                  >
                    Export Markdown
                  </button>
                  <button
                    type="button"
                    className="am-secondary-btn"
                    onClick={() => removeSavedReport(entry.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
