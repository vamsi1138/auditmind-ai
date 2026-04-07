import { motion } from "framer-motion";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useStore";

const sectionOrder = [
  "Contract Summary",
  "Important Functions",
  "Possible Risks",
  "Severity",
  "Why It Matters",
  "Suggested Fix",
  "Final Verdict",
  "Beginner Explanation"
];

function parseStructuredReport(reportText) {
  if (!reportText || typeof reportText !== "string") {
    return {};
  }

  const headingPattern = sectionOrder.map((title) => `${title}:`).join("|");
  const regex = new RegExp(`(${headingPattern})([\\s\\S]*?)(?=${headingPattern}|$)`, "g");
  const sections = {};
  let match;

  while ((match = regex.exec(reportText)) !== null) {
    const heading = match[1].replace(":", "").trim();
    const content = match[2].trim();
    sections[heading] = content;
  }

  return sections;
}

export default function FeatureStructuredReports() {
  const navigate = useNavigate();
  const setSelectedFeature = useAppStore((s) => s.setSelectedFeature);
  const latestResult = useAppStore((s) => s.lastResult);
  const history = useAppStore((s) => s.history);
  const restoreFromHistory = useAppStore((s) => s.restoreFromHistory);
  const showSavedToast = useAppStore((s) => s.showSavedToast);

  const latestSections = parseStructuredReport(latestResult?.report);
  const hasLatestReport = Boolean(latestResult?.report);

  const latestSummary = latestSections["Contract Summary"] || "No summary available yet.";
  const latestVerdict = latestSections["Final Verdict"] || "No verdict yet.";

  useEffect(() => {
    setSelectedFeature("structured-reports");
  }, [setSelectedFeature]);

  const handleOpenFromHistory = (entry) => {
    restoreFromHistory(entry);
    showSavedToast("Loaded report from history");
    navigate("/analyze?mode=structured-reports");
  };

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="glass-card rounded-3xl p-8"
      >
        <h1 className="text-3xl font-semibold text-white sm:text-4xl">Structured Reports</h1>
        <p className="mt-3 text-sm text-slate-300 sm:text-base">
          Outputs standardized sections for clarity: summary, risks, severity, impact, fixes, and verdict.
        </p>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
        className="glass-card rounded-2xl p-6"
      >
        <h2 className="text-xl font-semibold text-white">Export and share</h2>
        <p className="mt-2 text-sm text-slate-300">
          This mode preserves full section order and readability for audits, investor reviews, and security handoffs.
        </p>
        <Link
          to="/analyze?mode=structured-reports"
          className="mt-4 inline-flex rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-600 px-4 py-2 text-sm font-semibold text-slate-950"
        >
          Use Structured Report Mode
        </Link>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.12 }}
        className="glass-card rounded-2xl p-6"
      >
        <h2 className="text-xl font-semibold text-white">Latest Analyzed Report</h2>
        {hasLatestReport ? (
          <div className="mt-3 space-y-3 text-sm text-slate-300">
            <p><span className="text-cyan-200">Summary:</span> {latestSummary}</p>
            <p><span className="text-cyan-200">Verdict:</span> {latestVerdict}</p>
            <p><span className="text-cyan-200">Severity:</span> {latestResult?.severity?.overall || "Unknown"}</p>
            <button
              type="button"
              onClick={() => navigate("/analyze?mode=structured-reports")}
              className="inline-flex rounded-lg border border-cyan-300/40 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition-colors hover:bg-cyan-400/20"
            >
              Open Full Report
            </button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-300">No report analyzed yet. Run one from Analyze page and it will appear here automatically.</p>
        )}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.16 }}
        className="glass-card rounded-2xl p-6"
      >
        <h2 className="text-xl font-semibold text-white">Recent Structured Reports</h2>
        {history.length ? (
          <div className="mt-3 space-y-2">
            {history.slice(0, 5).map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => handleOpenFromHistory(entry)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-600/50 bg-slate-900/45 px-3 py-2 text-left text-sm text-slate-200 transition-colors hover:border-cyan-300/40 hover:bg-slate-800/70"
              >
                <span>{entry?.severity?.overall || "Unknown"} · {entry?.riskScore ?? 0}/10</span>
                <span className="text-xs text-slate-400">{new Date(entry.createdAt).toLocaleString()}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-300">No saved reports in history yet.</p>
        )}
      </motion.section>
    </div>
  );
}
