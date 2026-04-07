import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useStore";

function formatDate(value) {
  return new Date(value).toLocaleString();
}

function getTitle(entry) {
  return (entry.code || "").split(/\r?\n/).find((line) => line.trim()) || "Untitled analysis";
}

export default function History() {
  const navigate = useNavigate();
  const history = useAppStore((state) => state.history);
  const restoreFromHistory = useAppStore((state) => state.restoreFromHistory);
  const deleteHistoryEntry = useAppStore((state) => state.deleteHistoryEntry);
  const clearHistory = useAppStore((state) => state.clearHistory);
  const setCompareItem = useAppStore((state) => state.setCompareItem);
  const saveReport = useAppStore((state) => state.saveReport);
  const showSavedToast = useAppStore((state) => state.showSavedToast);

  const items = useMemo(() => history, [history]);

  const handleOpen = (entry) => {
    restoreFromHistory(entry);
    showSavedToast("Analysis restored");
    navigate("/analyze");
  };

  const handleCompare = (slot, entry) => {
    setCompareItem(slot, entry);
    showSavedToast(`Added to compare ${slot.toUpperCase()}`);
  };

  const handleSave = (entry) => {
    saveReport(entry);
    showSavedToast("Saved to reports");
  };

  return (
    <div className="am-stack">
      <section className="am-card am-section-card">
        <div className="am-section-header">
          <div>
            <h1 className="am-page-title" style={{ fontSize: "2.2rem" }}>
              Analysis <span>History</span>
            </h1>
            <p className="am-subtitle">
              Reload previous contract reviews, send them to compare mode, or promote strong reports into the saved report set.
            </p>
          </div>
          <button type="button" className="am-secondary-btn" onClick={() => clearHistory()}>
            Clear History
          </button>
        </div>
      </section>

      <section className="am-card am-section-card">
        {items.length === 0 ? (
          <p className="am-muted">No previous analyses yet. Run a contract review from the analyzer workspace to populate history.</p>
        ) : (
          <div className="am-stack">
            {items.map((entry) => {
              const severity = entry?.result?.severity?.overall || "Low";
              const riskScore = (entry?.result?.riskScore || 0) * 10;

              return (
                <div key={entry.id} className="am-history-row">
                  <div>
                    <div className="am-history-title">{getTitle(entry)}</div>
                    <div className="am-muted" style={{ marginTop: 6 }}>
                      {formatDate(entry.createdAt)} | {entry.selectedFeature || "ai-analysis"} | {entry.analysisMs || 0}ms
                    </div>
                  </div>
                  <div className="am-history-meta">
                    <span className={`am-severity-pill am-severity-${severity.toLowerCase()}`}>{severity}</span>
                    <span className="am-chip">{riskScore}/100</span>
                    <button type="button" className="am-secondary-btn" onClick={() => handleOpen(entry)}>
                      Open
                    </button>
                    <button type="button" className="am-secondary-btn" onClick={() => handleCompare("left", entry)}>
                      Compare A
                    </button>
                    <button type="button" className="am-secondary-btn" onClick={() => handleCompare("right", entry)}>
                      Compare B
                    </button>
                    <button type="button" className="am-secondary-btn" onClick={() => handleSave(entry)}>
                      Save
                    </button>
                    <button type="button" className="am-secondary-btn" onClick={() => deleteHistoryEntry(entry.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
