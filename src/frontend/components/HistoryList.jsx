import { motion } from "framer-motion";

function fmtDate(value) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function HistoryList({ items, onLoad, onDelete, onClearAll }) {
  if (!items.length) {
    return (
      <div className="glass-card rounded-2xl p-6 text-sm text-slate-300">
        No previous analysis found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Analysis History</h2>
        <button
          type="button"
          onClick={onClearAll}
          className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 transition-colors hover:bg-rose-500/20"
        >
          Clear All History
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item, idx) => (
          <motion.article
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03, duration: 0.25 }}
            className="glass-card rounded-2xl p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-200">{fmtDate(item.createdAt)}</p>
                <p className="mt-1 text-xs text-slate-300">
                  Risk Score: {item.riskScore ?? 0}/10 · Severity: {item.severity?.overall || "Low"}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onLoad(item)}
                  className="rounded-lg border border-cyan-300/40 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition-colors hover:bg-cyan-500/20"
                >
                  Reload
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="rounded-lg border border-slate-500/60 bg-slate-800/60 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700/70"
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
