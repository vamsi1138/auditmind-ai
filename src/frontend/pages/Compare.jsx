import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { buildCompareSummary } from "../helpers/reporting";
import { useAppStore } from "../store/useStore";

function slotEntry(compareItems, slot) {
  return compareItems.find((item) => item.slot === slot)?.entry || null;
}

function titleFromEntry(entry) {
  return (entry?.code || "").split(/\r?\n/).find((line) => line.trim()) || "Untitled contract";
}

export default function Compare() {
  const navigate = useNavigate();
  const compareItems = useAppStore((state) => state.compareItems);
  const history = useAppStore((state) => state.history);
  const setCompareItem = useAppStore((state) => state.setCompareItem);
  const clearCompareItems = useAppStore((state) => state.clearCompareItems);
  const showSavedToast = useAppStore((state) => state.showSavedToast);

  const left = slotEntry(compareItems, "left");
  const right = slotEntry(compareItems, "right");
  const summary = useMemo(() => buildCompareSummary(left?.result, right?.result), [left, right]);

  return (
    <div className="am-stack">
      <section className="am-card am-section-card">
        <div className="am-section-header">
          <div>
            <h1 className="am-page-title" style={{ fontSize: "2.2rem" }}>
              Compare <span>Analyses</span>
            </h1>
            <p className="am-subtitle">
              Compare rule-engine and AI outcomes across two analyses to spot regressions, added risk, or improvements after fixes.
            </p>
          </div>
          <button type="button" className="am-secondary-btn" onClick={() => clearCompareItems()}>
            Reset Compare
          </button>
        </div>
      </section>

      <section className="am-two-col">
        {["left", "right"].map((slot) => {
          const entry = slot === "left" ? left : right;

          return (
            <div key={slot} className="am-card am-section-card">
              <h2 className="am-section-title">Compare {slot === "left" ? "A" : "B"}</h2>
              {entry ? (
                <>
                  <div className="am-list-item">{titleFromEntry(entry)}</div>
                  <div className="am-list-item">
                    Verdict: {entry?.result?.rawBackendReport?.verdict || "Safe"} | {(entry?.result?.riskScore || 0) * 10}/100
                  </div>
                  <button
                    type="button"
                    className="am-secondary-btn"
                    onClick={() => {
                      useAppStore.getState().restoreFromHistory(entry);
                      navigate("/analyze");
                    }}
                  >
                    Open in Analyzer
                  </button>
                </>
              ) : (
                <p className="am-muted">Choose an entry from recent history below.</p>
              )}
            </div>
          );
        })}
      </section>

      {summary ? (
        <section className="am-card am-section-card">
          <h2 className="am-section-title">Comparison Summary</h2>
          <div className="am-three-col">
            <div className="am-list-item">Risk score delta: {summary.scoreDelta > 0 ? "+" : ""}{summary.scoreDelta * 10}</div>
            <div className="am-list-item">Verdicts: {summary.verdicts[0]} {"->"} {summary.verdicts[1]}</div>
            <div className="am-list-item">Added findings: {summary.addedRisks.length} | Removed findings: {summary.removedRisks.length}</div>
          </div>
          <div className="am-two-col" style={{ marginTop: 16 }}>
            <div>
              <div className="am-section-title">Added risks</div>
              {(summary.addedRisks.length ? summary.addedRisks : [{ title: "No new risks", severity: "Info" }]).map((risk) => (
                <div key={risk.title} className="am-risk-item">
                  <div className="am-risk-head">
                    <strong>{risk.title}</strong>
                    <span className={`am-severity-pill am-severity-${String(risk.severity).toLowerCase()}`}>{risk.severity}</span>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <div className="am-section-title">Removed risks</div>
              {(summary.removedRisks.length ? summary.removedRisks : [{ title: "No removed risks", severity: "Info" }]).map((risk) => (
                <div key={risk.title} className="am-risk-item">
                  <div className="am-risk-head">
                    <strong>{risk.title}</strong>
                    <span className={`am-severity-pill am-severity-${String(risk.severity).toLowerCase()}`}>{risk.severity}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="am-card am-section-card">
        <div className="am-section-title">Recent analyses</div>
        <div className="am-stack">
          {history.slice(0, 8).map((entry) => (
            <div key={entry.id} className="am-history-row">
              <div>
                <div className="am-history-title">{titleFromEntry(entry)}</div>
                <div className="am-muted" style={{ marginTop: 6 }}>
                  {new Date(entry.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="am-history-meta">
                <button
                  type="button"
                  className="am-secondary-btn"
                  onClick={() => {
                    setCompareItem("left", entry);
                    showSavedToast("Set as Compare A");
                  }}
                >
                  Compare A
                </button>
                <button
                  type="button"
                  className="am-secondary-btn"
                  onClick={() => {
                    setCompareItem("right", entry);
                    showSavedToast("Set as Compare B");
                  }}
                >
                  Compare B
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
