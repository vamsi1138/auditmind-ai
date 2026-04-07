import { motion } from "framer-motion";

function getSeverityColor(overall) {
  if (overall === "High") return "#ff4f6d";
  if (overall === "Medium") return "#f5c542";
  return "#39ffb6";
}

export default function RiskVisualizer({ riskScore = 0, severity = { overall: "Low" } }) {
  const score = Math.max(0, Math.min(10, Number(riskScore) || 0));
  const progress = (score / 10) * 100;
  const color = getSeverityColor(severity?.overall);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">Risk Score</h3>
        <span className="text-sm text-slate-300">0 - 10 scale</span>
      </div>

      <div className="relative mx-auto mb-4 flex h-40 w-40 items-center justify-center">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" stroke="rgba(148,163,184,0.22)" strokeWidth="10" fill="none" />
          <motion.circle
            cx="60"
            cy="60"
            r="52"
            stroke={color}
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: progress / 100 }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{
              pathLength: progress / 100,
              strokeDasharray: 327,
              strokeDashoffset: 0,
              filter: `drop-shadow(0 0 8px ${color})`
            }}
          />
        </svg>

        <div className="absolute text-center">
          <p className="text-4xl font-semibold text-white">{score}</p>
          <p className="text-xs uppercase tracking-widest text-slate-300">{severity?.overall || "Low"}</p>
        </div>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700/45">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </motion.div>
  );
}
