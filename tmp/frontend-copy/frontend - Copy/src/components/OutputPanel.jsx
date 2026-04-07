import { motion } from "framer-motion";
import RiskVisualizer from "./RiskVisualizer";

const order = [
  "Contract Summary",
  "Important Functions",
  "Possible Risks",
  "Severity",
  "Why It Matters",
  "Suggested Fix",
  "Final Verdict",
  "Beginner Explanation"
];

function formatSectionContent(content) {
  if (!content) {
    return ["No content available."];
  }
  return content.split("\n").filter(Boolean);
}

function severityTone(overall) {
  if (overall === "High") return "bg-rose-500/20 text-rose-200 border-rose-400/50";
  if (overall === "Medium") return "bg-amber-500/20 text-amber-100 border-amber-400/50";
  return "bg-emerald-500/20 text-emerald-100 border-emerald-400/50";
}

export default function OutputPanel({
  sections,
  severity,
  riskScore,
  rawReport,
  sourceMeta,
  sourceValidation,
  onReset
}) {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(rawReport || "");
  };

  const handleDownload = () => {
    const blob = new Blob([rawReport || ""], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit-report.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const risks = formatSectionContent(sections?.["Possible Risks"])
    .filter((line) => line.startsWith("- "))
    .slice(0, 3);

  const verdict = formatSectionContent(sections?.["Final Verdict"])[0] || "USE WITH CAUTION";
  const oneLineSummary =
    severity?.overall === "High"
      ? "High-risk contract with serious security concerns."
      : severity?.overall === "Medium"
        ? "Owner-controlled contract with moderate risk."
        : "Low-risk profile with no critical vulnerabilities detected.";

  const quickSummary =
    severity?.overall === "High"
      ? "This contract has critical risk factors and should be considered high risk."
      : severity?.overall === "Medium"
        ? "This contract has centralized control risks and should be used with caution."
        : "This contract shows a low-risk profile based on current static analysis.";

  const visibleOrder = order.filter((section) => sections?.[section] !== undefined);

  return (
    <section className="space-y-6">
      <motion.article
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="glass-card rounded-2xl p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-white">Risk Summary</h3>
            <p className="mt-1 text-sm text-slate-300">{quickSummary}</p>
            <p className="mt-3 text-sm text-cyan-200">1-Line Summary: {oneLineSummary}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-900/60 px-4 py-3 text-center">
              <div className="text-xs text-slate-300">Risk Score</div>
              <div className="text-3xl font-semibold text-white">{riskScore}/10</div>
            </div>
            <span
              className={`rounded-full border px-3 py-2 text-sm font-semibold ${severityTone(severity?.overall)}`}
            >
              {severity?.overall || "Low"}
            </span>
          </div>
        </div>
      </motion.article>

      <motion.article
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="glass-card rounded-2xl p-6"
      >
        <h3 className="mb-3 text-lg font-semibold text-white">Risk Highlights</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {risks.length ? (
            risks.map((risk) => (
              <div key={risk} className="rounded-xl border border-slate-600/50 bg-slate-900/45 p-3 text-sm text-slate-200">
                {risk.replace(/^-\s*/, "")}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-slate-600/50 bg-slate-900/45 p-3 text-sm text-slate-200">
              No high-priority risks listed.
            </div>
          )}
        </div>
      </motion.article>

      {sourceMeta ? (
        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 }}
          className="glass-card rounded-2xl p-6"
        >
          <h3 className="mb-3 text-lg font-semibold text-white">Analyzed Source</h3>
          <div className="space-y-2 text-sm text-slate-300">
            <p>Source Type: {sourceMeta.type}</p>
            <p>Repository: {sourceMeta.owner}/{sourceMeta.repo}</p>
            <p>Branch: {sourceMeta.branch || "n/a"}</p>
            {sourceValidation?.message ? <p>Validation: {sourceValidation.message}</p> : null}
          </div>
          {Array.isArray(sourceMeta.filesAnalyzed) && sourceMeta.filesAnalyzed.length > 0 ? (
            <div className="mt-3 space-y-1 text-xs text-cyan-100">
              {sourceMeta.filesAnalyzed.slice(0, 10).map((file) => (
                <p key={file}>- {file}</p>
              ))}
            </div>
          ) : null}
        </motion.article>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        {visibleOrder.map((section, idx) => (
          <motion.article
            key={section}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: idx * 0.045 }}
            whileHover={{ y: -2 }}
            className="glass-card rounded-2xl p-5 transition-shadow duration-300 hover:shadow-neon"
          >
            <h3 className="mb-3 text-lg font-semibold text-white">{section}</h3>
            <div className="space-y-2 text-sm leading-relaxed text-slate-200">
              {formatSectionContent(sections?.[section]).map((line, lineIdx) => (
                <p key={`${section}-${lineIdx}`}>{line}</p>
              ))}
            </div>
          </motion.article>
        ))}
      </div>

      <div className="space-y-4">
        <RiskVisualizer riskScore={riskScore} severity={severity} />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="glass-card rounded-2xl p-5"
        >
          <h3 className="mb-4 text-base font-semibold text-white">Actions</h3>
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleCopy}
              className="w-full rounded-xl border border-cyan-300/45 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition-all duration-300 hover:bg-cyan-400/20"
            >
              Copy Report
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="w-full rounded-xl border border-indigo-300/45 bg-indigo-500/10 px-4 py-3 text-sm font-semibold text-indigo-100 transition-all duration-300 hover:bg-indigo-400/20"
            >
              Download Report
            </button>
            <button
              type="button"
              onClick={onReset}
              className="w-full rounded-xl border border-slate-500/60 bg-slate-900/55 px-4 py-3 text-sm font-semibold text-slate-100 transition-all duration-300 hover:bg-slate-800/70"
            >
              Analyze Another Contract
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
          className="glass-card rounded-2xl p-5"
        >
          <h3 className="mb-3 text-base font-semibold text-white">Smart Follow-up</h3>
          <ul className="space-y-2 text-sm text-slate-200">
            <li>Try analyzing a different contract.</li>
            <li>Review high-risk issues carefully.</li>
            <li>Final verdict: {verdict}</li>
          </ul>
        </motion.div>
      </div>
      </div>
    </section>
  );
}
