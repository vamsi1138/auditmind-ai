import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import HistoryList from "../components/HistoryList";
import { useAppStore } from "../store/useStore";

export default function History() {
  const navigate = useNavigate();
  const history = useAppStore((s) => s.history);
  const restoreFromHistory = useAppStore((s) => s.restoreFromHistory);
  const deleteHistoryEntry = useAppStore((s) => s.deleteHistoryEntry);
  const clearHistory = useAppStore((s) => s.clearHistory);
  const showSavedToast = useAppStore((s) => s.showSavedToast);

  const handleLoad = (entry) => {
    restoreFromHistory(entry);
    showSavedToast("Analysis restored from history");
    navigate("/analyze");
  };

  const handleDelete = (id) => {
    deleteHistoryEntry(id);
    showSavedToast("History entry deleted");
  };

  const handleClearAll = () => {
    clearHistory();
    showSavedToast("History cleared");
  };

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="glass-card rounded-3xl p-8"
      >
        <h1 className="text-3xl font-semibold text-white sm:text-4xl">History</h1>
        <p className="mt-3 text-sm text-slate-300 sm:text-base">
          Reload past analyses, inspect scores, and manage saved contract review sessions.
        </p>
      </motion.section>

      <HistoryList items={history} onLoad={handleLoad} onDelete={handleDelete} onClearAll={handleClearAll} />
    </div>
  );
}
