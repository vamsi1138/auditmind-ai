import { useEffect, useState } from "react";
import { getToolingStatus } from "../services/api";
import { useAppStore } from "../store/useStore";

function Toggle({ checked, onChange }) {
  return (
    <button type="button" className={`am-toggle${checked ? " active" : ""}`} onClick={onChange}>
      <span />
    </button>
  );
}

export default function Settings() {
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const toolingStatus = useAppStore((state) => state.toolingStatus);
  const setToolingStatus = useAppStore((state) => state.setToolingStatus);
  const showSavedToast = useAppStore((state) => state.showSavedToast);
  const [loadingTools, setLoadingTools] = useState(false);

  useEffect(() => {
    if (toolingStatus) return;

    let cancelled = false;
    setLoadingTools(true);

    getToolingStatus()
      .then((data) => {
        if (!cancelled) {
          setToolingStatus(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setToolingStatus({
            slither: { installed: false, output: "Unavailable" },
            foundry: { installed: false, output: "Unavailable" },
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingTools(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [setToolingStatus, toolingStatus]);

  return (
    <div className="am-stack">
      <section className="am-card am-section-card">
        <h1 className="am-page-title" style={{ fontSize: "2.2rem" }}>
          Workspace <span>Settings</span>
        </h1>
        <p className="am-subtitle">
          Configure confidence filtering, report persistence, preferred runtime mode, and local tool visibility.
        </p>
      </section>

      <section className="am-card am-section-card">
        <div className="am-setting-row">
          <div>
            <div className="am-section-title">Auto-save reports</div>
            <div className="am-muted">Automatically promote completed analyses into saved reports.</div>
          </div>
          <Toggle
            checked={settings.autoSaveReports}
            onChange={() => updateSettings({ autoSaveReports: !settings.autoSaveReports })}
          />
        </div>

        <div className="am-setting-row">
          <div>
            <div className="am-section-title">Hide low-confidence findings</div>
            <div className="am-muted">Use evidence-based confidence scoring to collapse weaker results by default.</div>
          </div>
          <Toggle
            checked={settings.hideLowConfidence}
            onChange={() => updateSettings({ hideLowConfidence: !settings.hideLowConfidence })}
          />
        </div>

        <div className="am-setting-row">
          <div>
            <div className="am-section-title">Collapse likely false positives</div>
            <div className="am-muted">Keeps the main risk list focused on stronger evidence-backed issues.</div>
          </div>
          <Toggle
            checked={settings.collapseFalsePositives}
            onChange={() => updateSettings({ collapseFalsePositives: !settings.collapseFalsePositives })}
          />
        </div>

        <div className="am-setting-row">
          <div>
            <div className="am-section-title">Confidence threshold</div>
            <div className="am-muted">Only show evidence items at or above this confidence score.</div>
          </div>
          <div className="am-slider-wrap">
            <input
              type="range"
              min="20"
              max="95"
              step="5"
              value={settings.confidenceThreshold}
              onChange={(event) => updateSettings({ confidenceThreshold: Number(event.target.value) })}
            />
            <span className="am-chip">{settings.confidenceThreshold}%</span>
          </div>
        </div>

        <div className="am-setting-row">
          <div>
            <div className="am-section-title">Preferred runtime mode</div>
            <div className="am-muted">Display intent for future backend routing and analysis strategy selection.</div>
          </div>
          <select
            className="am-select"
            value={settings.preferredMode}
            onChange={(event) => updateSettings({ preferredMode: event.target.value })}
          >
            <option value="hybrid">Hybrid</option>
            <option value="agent-first">Agent First</option>
            <option value="rules-first">Rules First</option>
          </select>
        </div>
      </section>

      <section className="am-card am-section-card">
        <div className="am-section-header">
          <div>
            <h2 className="am-section-title">Static tool integration</h2>
            <p className="am-muted">Visibility into locally installed Slither and Foundry tooling.</p>
          </div>
          <button
            type="button"
            className="am-secondary-btn"
            onClick={async () => {
              setLoadingTools(true);
              try {
                const data = await getToolingStatus();
                setToolingStatus(data);
                showSavedToast("Tool status refreshed");
              } catch {
                showSavedToast("Unable to refresh tool status");
              } finally {
                setLoadingTools(false);
              }
            }}
          >
            {loadingTools ? "Checking..." : "Refresh"}
          </button>
        </div>

        <div className="am-two-col">
          {["slither", "foundry"].map((tool) => {
            const toolData = toolingStatus?.[tool];
            return (
              <div key={tool} className="am-list-item">
                <strong style={{ display: "block", marginBottom: 8, textTransform: "capitalize" }}>{tool}</strong>
                <div className="am-muted">
                  {toolData ? (toolData.installed ? toolData.output : "Not installed") : "Checking availability..."}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
