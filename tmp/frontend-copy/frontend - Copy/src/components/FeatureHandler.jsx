import { motion } from "framer-motion";

const featureConfig = {
  "ai-analysis": {
    title: "AI-powered analysis mode",
    detail: "Full report view with emphasis on summary and explanation.",
    sections: [
      "Contract Summary",
      "Why It Matters",
      "Beginner Explanation",
      "Important Functions",
      "Possible Risks",
      "Severity",
      "Suggested Fix",
      "Final Verdict"
    ]
  },
  "risk-detection": {
    title: "Risk detection mode",
    detail: "Focused risk-centric output with severity and risk highlights.",
    sections: ["Possible Risks", "Severity", "Final Verdict"]
  },
  "structured-reports": {
    title: "Structured reports mode",
    detail: "Expanded organized report layout for readability.",
    sections: [
      "Contract Summary",
      "Important Functions",
      "Possible Risks",
      "Severity",
      "Why It Matters",
      "Suggested Fix",
      "Final Verdict",
      "Beginner Explanation"
    ]
  },
  "fast-performance": {
    title: "Fast performance mode",
    detail: "Highlights response speed and streamlined result flow.",
    sections: [
      "Contract Summary",
      "Possible Risks",
      "Severity",
      "Final Verdict",
      "Suggested Fix"
    ]
  }
};

export default function FeatureHandler({
  selectedFeature,
  thinking,
  analysisMs,
  sections,
  children
}) {
  const config = featureConfig[selectedFeature] || featureConfig["ai-analysis"];

  const filteredSections = Object.fromEntries(
    Object.entries(sections || {}).filter(([key]) => config.sections.includes(key))
  );

  return (
    <div className="space-y-4">
      <motion.article
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="glass-card rounded-2xl p-5"
      >
        <h3 className="text-base font-semibold text-white">{config.title}</h3>
        <p className="mt-1 text-sm text-slate-300">{config.detail}</p>
        {selectedFeature === "fast-performance" ? (
          <p className="mt-3 text-sm text-cyan-200">Analysis completed in {analysisMs ?? 0} ms</p>
        ) : null}
      </motion.article>

      {thinking ? (
        <motion.article
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="glass-card rounded-2xl p-5 text-sm text-cyan-100"
        >
          Agent is adapting output for the selected feature...
        </motion.article>
      ) : (
        children(filteredSections, config.sections)
      )}
    </div>
  );
}
